import assert from 'node:assert/strict'
import { mkdtemp, rm, cp, mkdir, writeFile, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { scientificEvidenceAudit } from '../agh_scientific_audit/index.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dataRoot = path.join(root, 'agh_scientific_audit', 'data')
const evidenceRoot = path.join(root, 'execution_evidence')
const tools = new Map()

scientificEvidenceAudit.apply({
  extension() {
    return {
      registerTool(definition) {
        tools.set(definition.name, definition)
      },
    }
  },
})

assert.deepEqual(
  [...tools.keys()],
  ['evidence_inventory', 'audit_pmf_condition', 'compare_md_replicas', 'audit_sapt_model'],
)

async function call(name, input = {}) {
  try {
    const response = await tools.get(name).execute(input)
    return { ok: true, name, ...response.structured }
  } catch (error) {
    return { ok: false, name, error: String(error.message || error) }
  }
}

const normal = [
  await call('evidence_inventory'),
  await call('audit_pmf_condition', { condition: 'DEMO_A_c1' }),
  await call('audit_pmf_condition', { condition: 'DEMO_B_c1' }),
  await call('compare_md_replicas', {
    comparison: 'DEMO_A-minus-DEMO_B',
    metric: 'demo_contact_count',
  }),
  await call('audit_sapt_model'),
]
assert.equal(normal[0].ok, true)
assert.equal(normal[0].files_expected, 15)
assert.equal(normal[0].files_present, 15)
assert.equal(normal[0].status, 'evidence_ready_for_configured_audits')
assert.equal(normal[1].status, 'quality_gate_passed_with_scope_limits')
assert.equal(normal[3].verdict, 'ci_crosses_zero_not_resolved')
assert.equal(normal[4].status, 'interpolation_diagnostic_only')

const unsupportedCondition = await call('audit_pmf_condition', { condition: 'UNKNOWN_0M' })
assert.equal(unsupportedCondition.ok, false)
assert.match(unsupportedCondition.error, /^EVIDENCE_CONDITION_UNSUPPORTED:/u)

const unsupportedMetric = await call('compare_md_replicas', {
  comparison: 'DEMO_A-minus-DEMO_B',
  metric: 'unconfigured_metric',
})
assert.equal(unsupportedMetric.ok, false)
assert.match(unsupportedMetric.error, /^EVIDENCE_METRIC_UNSUPPORTED:/u)

const boundary = await call('compare_md_replicas', {
  comparison: 'DEMO_A-minus-DEMO_B',
  metric: 'demo_bridge_count',
})
assert.equal(boundary.ok, true)
assert.equal(boundary.verdict, 'ci_crosses_zero_not_resolved')

const failureRoot = await mkdtemp(path.join(os.tmpdir(), 'agh-audit-'))
await cp(dataRoot, failureRoot, { recursive: true })
await rm(path.join(failureRoot, 'AI', 'audit.json'))
process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT = failureRoot
const inventoryMissing = await call('evidence_inventory')
assert.equal(inventoryMissing.status, 'evidence_needs_attention')
assert.equal(inventoryMissing.files_expected, 15)
assert.equal(inventoryMissing.files_present, 14)
assert.deepEqual(inventoryMissing.missing_files, ['AI/audit.json'])
const failure = await call('audit_sapt_model')
assert.equal(failure.ok, false)
assert.match(failure.error, /^EVIDENCE_FILE_MISSING:/u)
await cp(dataRoot, failureRoot, { recursive: true, force: true })
await writeFile(path.join(failureRoot, 'AI', 'metrics.csv'), 'scheme,model\nloso,"unterminated\n')
const inventoryInvalidCsv = await call('evidence_inventory')
assert.equal(inventoryInvalidCsv.status, 'evidence_needs_attention')
assert.equal(inventoryInvalidCsv.missing_files.length, 0)
assert(inventoryInvalidCsv.invalid_files.some((item) => item.file === 'AI/metrics.csv'))
const invalidCsv = await call('audit_sapt_model')
assert.equal(invalidCsv.ok, false)
assert.match(invalidCsv.error, /^EVIDENCE_FILE_INVALID:/u)
await cp(dataRoot, failureRoot, { recursive: true, force: true })
const customConfig = JSON.parse(await readFile(path.join(failureRoot, 'audit_config.json'), 'utf8'))
customConfig.md.comparisons = ['custom-control']
customConfig.md.metrics = [{ id: 'custom-contact', unit: 'count' }]
customConfig.md.columns = {
  comparison: 'contrast',
  metric: 'feature',
  replicas_per_group: 'replicas',
  difference: 'estimate',
  ci_low: 'lower',
  ci_high: 'upper',
}
customConfig.files.md_contrasts.required_columns = ['contrast', 'feature', 'replicas', 'estimate', 'lower', 'upper']
await writeFile(path.join(failureRoot, 'audit_config.json'), `${JSON.stringify(customConfig, null, 2)}\n`)
await writeFile(path.join(failureRoot, 'MD', 'contrasts.csv'), 'contrast,feature,replicas,estimate,lower,upper\ncustom-control,custom-contact,3,1.5,0.5,2.5\n')
const configuredCustomMd = await call('compare_md_replicas', { comparison: 'custom-control', metric: 'custom-contact' })
assert.equal(configuredCustomMd.ok, true)
assert.equal(configuredCustomMd.verdict, 'positive_difference_resolved')
assert.equal(configuredCustomMd.unit, 'count')

await cp(dataRoot, failureRoot, { recursive: true, force: true })
await writeFile(path.join(failureRoot, 'AI', 'audit.json'), '{invalid json')
const invalidJson = await call('audit_sapt_model')
assert.equal(invalidJson.ok, false)
assert.match(invalidJson.error, /^EVIDENCE_FILE_INVALID:/u)
await cp(dataRoot, failureRoot, { recursive: true, force: true })
await writeFile(path.join(failureRoot, 'MD', 'contrasts.csv'), 'comparison,metric,n_per_group,delta_mean,ci95_low,ci95_high\nDEMO_A-minus-DEMO_B,demo_contact_count,1,0,1,2\n')
const invalidValue = await call('compare_md_replicas', {
  comparison: 'DEMO_A-minus-DEMO_B',
  metric: 'demo_contact_count',
})
assert.equal(invalidValue.ok, false)
assert.match(invalidValue.error, /^EVIDENCE_VALUE_INVALID:/u)
await cp(dataRoot, failureRoot, { recursive: true, force: true })
await writeFile(path.join(failureRoot, 'MD', 'contrasts.csv'), 'comparison,metric,n_per_group,delta_mean,ci95_low,ci95_high\nDEMO_A-minus-DEMO_B,demo_contact_count,3,0,2,1\n')
const invalidCi = await call('compare_md_replicas', {
  comparison: 'DEMO_A-minus-DEMO_B',
  metric: 'demo_contact_count',
})
assert.equal(invalidCi.ok, false)
assert.match(invalidCi.error, /^EVIDENCE_VALUE_INVALID:/u)
delete process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT
await rm(failureRoot, { recursive: true, force: true })

await mkdir(evidenceRoot, { recursive: true })
await writeFile(
  path.join(evidenceRoot, 'local-cases.json'),
  `${JSON.stringify({ schema_version: '1.3', normal, boundary, failure, invalidCsv, invalidJson, invalidValue, invalidCi, unsupportedCondition, unsupportedMetric, inventoryMissing, inventoryInvalidCsv, configuredCustomMd }, null, 2)}\n`,
)
console.log(JSON.stringify({ tools: [...tools.keys()], normal, boundary, failure, invalidCsv, invalidJson, invalidValue, invalidCi, unsupportedCondition, unsupportedMetric, inventoryMissing, inventoryInvalidCsv, configuredCustomMd }, null, 2))
