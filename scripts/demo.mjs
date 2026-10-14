/* Offline execution of the packaged, unchanged scientific tools.
 * Usage: node scripts/demo.mjs [--output DIR]
 * Inputs: team-authored synthetic evidence. Outputs: per-case JSON and HTML.
 * No model request is made; this is tool verification, not an AGH model run. */
import assert from 'node:assert/strict'
import { mkdtemp, cp, rm, mkdir, writeFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scientificEvidenceAudit } from '../agh_scientific_audit/index.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const option = process.argv.indexOf('--output')
const output = option >= 0 ? resolve(process.argv[option + 1]) : join(root, 'outputs')
const data = join(root, 'agh_scientific_audit/data')
const tools = new Map()
scientificEvidenceAudit.apply({ extension() { return { registerTool(tool) { tools.set(tool.name, tool) } } } })
const logs = []
async function call(caseId, name, args = {}) {
    const start = new Date().toISOString()
    let response
    try { response = { ok: true, ...(await tools.get(name).execute(args)).structured } }
    catch (error) { response = { ok: false, error: String(error.message || error) } }
    logs.push({ case: caseId, start, end: new Date().toISOString(), tool: name, args, result: response })
    return response
}
const scratch = await mkdtemp(join(tmpdir(), 'agh-submission-demo-'))
const previous = process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT
const checks = {}
try {
    process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT = data
    const inventory = await call('normal', 'evidence_inventory')
    assert.equal(inventory.files_present, 15)
    assert.equal(inventory.files_expected, 15)
    assert.equal(inventory.status, 'evidence_ready_for_configured_audits')
    const a = await call('normal', 'audit_pmf_condition', { condition: 'DEMO_A_c1' })
    const b = await call('normal', 'audit_pmf_condition', { condition: 'DEMO_B_c1' })
    assert.equal(a.well_depth_kcal_mol, 1.2)
    assert.equal(b.well_depth_kcal_mol, 1.4)
    const mdArgs = metric => ({ comparison: 'DEMO_A-minus-DEMO_B', metric })
    const contacts = await call('normal', 'compare_md_replicas', mdArgs('demo_contact_count'))
    const bridges = await call('normal', 'compare_md_replicas', mdArgs('demo_bridge_count'))
    const sapt = await call('normal', 'audit_sapt_model')
    assert.equal(sapt.n_unique_samples, 8)
    assert.equal(sapt.n_scaffolds, 4)
    assert.equal(sapt.n_families, 2)
    checks.normal = true
    assert.equal(contacts.verdict, 'ci_crosses_zero_not_resolved')
    assert.equal(bridges.verdict, 'ci_crosses_zero_not_resolved')
    assert.equal(a.standard_state_correction_applied, false)
    assert.equal(b.standard_state_correction_applied, false)
    checks.boundary = true

    const broken = join(scratch, 'data')
    await cp(data, broken, { recursive: true })
    await rm(join(broken, 'AI/audit.json'))
    process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT = broken
    const missing = await call('failure', 'evidence_inventory')
    const error = await call('failure', 'audit_sapt_model')
    assert.equal(missing.files_present, 14)
    assert.deepEqual(missing.missing_files, ['AI/audit.json'])
    assert.equal(error.ok, false)
    assert.match(error.error, /^EVIDENCE_FILE_MISSING:/u)
    checks.failure = true

    await cp(join(data, 'AI/audit.json'), join(broken, 'AI/audit.json'))
    const restored = await call('recovery', 'evidence_inventory')
    const restoredSapt = await call('recovery', 'audit_sapt_model')
    assert.equal(restored.files_present, 15)
    assert.equal(restoredSapt.status, 'interpolation_diagnostic_only')
    checks.recovery = true
    await mkdir(output, { recursive: true })
    const inputs = {}
    for (const file of ['audit_config.json', 'MD/contrasts.csv', 'AI/metrics.csv', 'AI/audit.json']) {
        inputs[file] = createHash('sha256').update(await readFile(join(data, file))).digest('hex')
    }
    const result = { schema_version: '1.0', provider: 'none; offline tool execution', data_origin: 'team-authored synthetic test data', scientific_inference_supported: false, node: process.version, platform: process.platform, arch: process.arch, inputs_sha256: inputs, checks, all_checks_passed: true, logs }
    await writeFile(join(output, 'offline-validation.json'), `${JSON.stringify(result, null, 2)}\n`)
    const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
    const rows = logs.map(x => `<details><summary>${esc(x.case)} · ${esc(x.tool)} · ${x.result.ok ? '返回成功' : '预期错误'}</summary><pre>${esc(JSON.stringify(x, null, 2))}</pre></details>`).join('\n')
    await writeFile(join(output, 'index.html'), `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>离线运行与验证</title><style>body{max-width:1000px;margin:48px auto;padding:0 24px;font:16px/1.7 system-ui;background:#f5f7fa;color:#14213d}h1{font-size:30px}details{background:white;padding:16px;margin:12px 0;border:1px solid #dce3ec;border-radius:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}summary{cursor:pointer;font-weight:600}.ok{color:#146c43}</style><h1>离线工具验证：全部通过</h1><p class="ok">正常 / 边界 / 缺文件失败 / 恢复</p><p>输入全部为团队构造的合成测试数据；本次没有调用模型。真实 Agnes 执行记录请查阅独立的运行与验证证据包。</p><p>${esc(process.version)} · ${esc(process.platform)} / ${esc(process.arch)} · ${esc(new Date().toISOString())}</p><p><a href="offline-validation.json">完整 JSON 记录</a></p>${rows}</html>`)
    console.log(JSON.stringify({ all_checks_passed: true, checks, output }, null, 2))
} finally {
    if (previous === undefined) delete process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT
    else process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT = previous
    await rm(scratch, { recursive: true, force: true })
}
