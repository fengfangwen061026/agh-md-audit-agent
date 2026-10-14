import './prepare_runtime.mjs'
/*
 * Real Agnes API integration run.
 *
 * The credential is read only from AGNES_API_KEY (or the legacy AGNES_KEY)
 * and is never written to the package or result files. The temporary AGH
 * home is deleted after the run.
 */
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const aghRepo = packageRoot
const aghEntry = process.env.AGH_ENTRY || join(packageRoot, 'runtime/agnes.mjs')
const apiKey = process.env.AGNES_API_KEY || process.env.AGNES_KEY || ''
if (!apiKey) throw new Error('AGNES_API_KEY is required')
const mode = process.argv.includes('--failure') ? 'failure' : process.argv.includes('--recovery') ? 'recovery' : 'normal'
const outputDir = process.env.AGH_OUTPUT_DIR || join(packageRoot, 'outputs'); await mkdir(outputDir, { recursive: true });
const outputPrefix = join(outputDir, `agh-real-${mode}`)
const { createClient, memoryJournal } = await import(pathToFileURL(join(aghRepo, 'runtime/sdk.mjs')).href)

function redact(value) {
  return String(value).split(apiKey).join('[redacted]')
}
function safeError(error) {
  return redact(error instanceof Error ? error.message : String(error))
}
function runCli(args, cwd, env) {
  return new Promise((resolveRun, reject) => {
    execFile(process.execPath, [aghEntry, ...args], { cwd, env, timeout: 300000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(redact(`CLI ${args[0]} failed: ${stderr.trim()}`)))
      else resolveRun({ stdout, stderr })
    })
  })
}
async function waitOperation(client, receipt) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const operation = await client.packages.operation.get({ profile: 'local-dev', operationId: receipt.operationId })
    if (['completed', 'rolled-back'].includes(operation.state)) return operation
    if (['failed', 'cancelled'].includes(operation.state)) throw new Error(JSON.stringify(operation))
    await new Promise((done) => setTimeout(done, 100))
  }
  throw new Error('operation timeout')
}
async function waitRunning(client, id) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const row = (await client.packages.list({ profile: 'local-dev' })).packages.find((item) => item.id === id)
    if (row?.actual === 'running' && row.trusted) return row
    await new Promise((done) => setTimeout(done, 100))
  }
  throw new Error('package did not become running')
}
function summarizeResult(event) {
  const data = event.data || {}
  const summary = { is_error: data.isError === true }
  if (Array.isArray(data.content)) {
    const text = data.content.find((block) => block?.type === 'text')?.text
    if (typeof text === 'string') {
      try {
        const parsed = JSON.parse(text)
        if (parsed && typeof parsed === 'object') {
          for (const key of ['name', 'status', 'step', 'condition', 'comparison', 'metric', 'verdict', 'error', 'error_code', 'missing_files', 'invalid_files', 'standard_state_correction_applied', 'n_unique_samples', 'n_scaffolds', 'n_families']) {
            if (parsed[key] !== undefined) summary[key] = parsed[key]
          }
        } else summary.result_type = typeof parsed
      } catch {
        summary.text_prefix = text.slice(0, 160)
      }
    }
  }
  return summary
}

const root = await mkdtemp('/tmp/agh-real-agnes-')
const home = join(root, 'home')
const cwd = join(root, 'workspace')
const answerPath = `${outputPrefix}-answer.txt`
let daemonStarted = false
let client
try {
  await mkdir(join(home, 'profiles/local-dev'), { recursive: true })
  await mkdir(cwd, { recursive: true })
  await cp(join(packageRoot, 'agh_scientific_audit'), join(cwd, 'agh_scientific_audit'), { recursive: true })
  const skillSource = join(packageRoot, '.agh')
  try { await access(skillSource) } catch { await cp(resolve(packageRoot, '../.agh'), skillSource, { recursive: true }) }
  await cp(skillSource, join(cwd, '.agh'), { recursive: true })
  if (mode === 'failure' || mode === 'recovery') await rm(join(cwd, 'agh_scientific_audit/data/AI/audit.json'))
  if (mode === 'recovery') await cp(join(packageRoot, 'agh_scientific_audit/data/AI/audit.json'), join(cwd, 'agh_scientific_audit/data/AI/audit.json'))
  await writeFile(join(home, 'profiles/local-dev/profile.yaml'), [
    'name: local-dev',
    'computerUse:',
    '  enabled: false',
    'policy:',
    '  capabilityCeiling: [tools, hooks, slots, events, resources, ui, services, network, network.publicRead, tools.invoke, artifacts, subagent]',
    '',
  ].join('\n'))
  const env = { PATH: process.env.PATH, HOME: home, AGH_HOME: home, AGNES_PROFILE: 'local-dev' }
  await runCli(['sessions', '--json'], cwd, env)
  daemonStarted = true
  const owner = JSON.parse(await readFile(join(home, 'data/daemon/owner.json'), 'utf8'))
  client = createClient({ transport: { kind: 'unix', path: owner.socketPath }, auth: { kind: 'local' }, journal: memoryJournal() })
  await client.initialize()
  const tested = await client.config.test({ providerId: 'agnes-ai', baseUrl: 'https://api.agnes-ai.cn/v1', apiKey })
  assert.equal(tested.verified, true)
  assert.ok(tested.models.length > 0)
  const model = process.env.AGNES_MODEL || 'agnes-3.0-flash';
  assert.ok(tested.models.some(entry => entry.id === model), 'Requested Agnes model is absent from provider catalogue')
  await client.config.save({ providerId: 'agnes-ai', baseUrl: 'https://api.agnes-ai.cn/v1', apiKey, model, expectedRevision: 0 })
  await runCli(['daemon', 'stop'], cwd, env)
  daemonStarted = false
  await runCli(['sessions', '--json'], cwd, env)
  daemonStarted = true
  const restartedOwner = JSON.parse(await readFile(join(home, 'data/daemon/owner.json'), 'utf8'))
  client = createClient({ transport: { kind: 'unix', path: restartedOwner.socketPath }, auth: { kind: 'local' }, journal: memoryJournal() })
  await client.initialize()
  const clientId = await client.clientId()
  const source = { type: 'file', ref: 'file:./agh_scientific_audit' }
  const inspected = await waitOperation(client, await client.packages.inspect({ profile: 'local-dev', clientId, commandId: 'scientific-real-inspect', source }))
  assert.deepEqual(inspected.preview.blockers, [])
  const preview = inspected.preview
  await waitOperation(client, await client.packages.install({ profile: 'local-dev', clientId, commandId: 'scientific-real-install', source, expectedIntegrity: preview.integrity }))
  await waitOperation(client, await client.packages.trust({ profile: 'local-dev', clientId, commandId: 'scientific-real-trust', id: preview.id, expectedIntegrity: preview.integrity, capabilityHash: preview.capabilityHash ?? '' }))
  await waitOperation(client, await client.packages.enable({ profile: 'local-dev', clientId, commandId: 'scientific-real-enable', id: preview.id }))
  const packageState = await waitRunning(client, preview.id)
  const session = await client.session.new({ cwd })
  await session.attach()
  const events = [];
  const started = new Date().toISOString();
  let skillPreloaded = false
  // A report may precede a final todo update and a short acknowledgement.
  // Keep every non-empty assistant message so the acknowledgement cannot
  // overwrite the substantive report in the exported answer file.
  const assistantMessages = []
  const readEvents = (async () => {
    for await (const event of session.events()) {
      if (event.type === 'tool/call') {
        const name = event.data?.name
        if (typeof name === 'string') events.push({ type: 'tool/call', seq: event.seq, ts: event.ts, data: event.data, name })
      } else if (event.type === 'tool/result') {
        events.push({ type: 'tool/result', seq: event.seq, ts: event.ts, data: event.data, ...summarizeResult(event) })
      } else if (event.type === 'user/message') {
        const value = (event.data?.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
        if (value.startsWith('[skill loaded]')) skillPreloaded = true;
        events.push({ type: event.type, seq: event.seq, ts: event.ts, data: event.data });
      } else if (event.type === 'assistant/message') {
        events.push({ type: event.type, seq: event.seq, ts: event.ts, data: event.data });
        const blocks = event.data?.content
        if (Array.isArray(blocks)) {
          const text = blocks.filter((block) => block?.type === 'text').map((block) => block.text || '').join('')
          if (text.trim()) {
            assistantMessages.push(text)
            await writeFile(answerPath, redact(assistantMessages.join('\n\n')))
          }
        }
      } else if (event.type === 'turn/end') break
    }
  })()
  const prompt = '使用 scientific-evidence-audit Skill。先盘点证据，再按顺序审计 PMF、MD 复本和 SAPT。完成工具调用后，请在最终回答中逐项列出证据状态、关键数值、工具状态和范围限制；不要只返回计划完成摘要。第一段注明团队构造的合成测试数据。原样保留 tool_version、config_version、loso、lofo 及全部工具状态。置信区间跨零只能说方向未分辨。缺文件时确认错误，排除缺失结果，说明恢复源文件后重新装载并新建会话。'
  const turn = await session.prompt(prompt, { signal: AbortSignal.timeout(300000), titleLocale: 'zh-CN' })
  await readEvents
  if (turn.stopReason !== 'end_turn') throw new Error(`turn did not complete: ${turn.stopReason}/${turn.reason}`)
  const answer = await readFile(answerPath, 'utf8').catch(() => '')
  const calls = events.filter(e => e.type === 'tool/call').map(e => e.name);
  const results = events.filter(e => e.type === 'tool/result').map(e => e.data?.structured).filter(Boolean);
  const inventory = results.find(r => r.files_expected !== undefined);
  const md = results.filter(r => r.step === 'md_replica_contrast');
  const checks = { turn_complete: turn.stopReason === 'end_turn', inventory: inventory?.files_present === (mode === 'failure' ? 14 : 15), skill_loaded: skillPreloaded || calls.includes('skill_read'), md_boundary: md.length === 2 && md.every(r => r.verdict === 'ci_crosses_zero_not_resolved'), sapt: mode === 'failure' ? events.some(e => e.is_error && JSON.stringify(e.data).includes('EVIDENCE_FILE_MISSING')) : results.some(r => r.status === 'interpolation_diagnostic_only' && r.n_unique_samples === 8), substantive_answer: answer.length > 500 };
  const final = { started, finished: new Date().toISOString(), checks, all_checks_passed: Object.values(checks).every(Boolean), data_origin: 'team-authored synthetic test data', agh_commit: '57d0c34b33527294042b7ab8a60d7c7c934e932e', node: process.version, platform: process.platform, arch: process.arch,
    mode, provider: 'agnes-ai', base_url: 'https://api.agnes-ai.cn/v1', model,
    model_catalog_count: tested.models.length,
    package: { id: preview.id, integrity: preview.integrity, capabilityHash: preview.capabilityHash, blockers: preview.blockers, actual: packageState.actual, trusted: packageState.trusted },
    session_key: session.id,
    turn: { stopReason: turn.stopReason, reason: turn.reason, lastSeq: turn.lastSeq },
    events, final_answer_sha256: createHash('sha256').update(answer).digest('hex'),
    answer_source: 'all non-empty assistant messages in the turn',
    assistant_message_count: assistantMessages.length,
    terminal_message_chars: assistantMessages.at(-1)?.length || 0,
    final_answer_chars: answer.length,
    final_answer_preview: answer.replace(/\s+/gu, ' ').slice(0, 800),
  }
  await writeFile(`${outputPrefix}-result.json`, redact(`${JSON.stringify(final, null, 2)}\n`));
  await writeFile(`${outputPrefix}-events.jsonl`, events.map(e => redact(JSON.stringify(e))).join('\n') + '\n');
  if (!final.all_checks_passed) process.exitCode = 1
  console.log(JSON.stringify({ mode, model, checks, all_checks_passed: final.all_checks_passed, output: outputPrefix }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ mode, error: safeError(error) }))
  process.exitCode = 1
} finally {
  if (daemonStarted) {
    try {
      const env = { PATH: process.env.PATH, HOME: home, AGH_HOME: home, AGNES_PROFILE: 'local-dev' }
      await runCli(['daemon', 'stop'], cwd, env)
    } catch {}
  }
  await rm(root, { recursive: true, force: true })
}
