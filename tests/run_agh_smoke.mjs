import '../scripts/prepare_runtime.mjs'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const aghRepo = packageRoot
const aghEntry = process.env.AGH_ENTRY || join(packageRoot, 'runtime/agnes.mjs')
const { createClient, memoryJournal } = await import(pathToFileURL(join(aghRepo, 'runtime/sdk.mjs')).href)
const { startProviderFixture } = await import(pathToFileURL(join(aghRepo, 'runtime/sdk.mjs')).href)
const failureMode = process.argv.includes('--failure')
const root = await mkdtemp('/tmp/agh-scientific-smoke-')
const home = join(root, 'home')
const cwd = join(root, 'workspace')
await mkdir(join(home, 'profiles/local-dev'), { recursive: true })
await mkdir(cwd, { recursive: true })
await cp(join(packageRoot, 'agh_scientific_audit'), join(cwd, 'agh_scientific_audit'), { recursive: true })
const skillSource = join(packageRoot, '.agh')
try {
  await access(skillSource)
} catch {
  await cp(resolve(packageRoot, '../.agh'), skillSource, { recursive: true })
}
await cp(skillSource, join(cwd, '.agh'), { recursive: true })
if (failureMode) await rm(join(cwd, 'agh_scientific_audit/data/AI/audit.json'))
await writeFile(join(home, 'profiles/local-dev/profile.yaml'), [
  'name: local-dev',
  'computerUse:',
  '  enabled: false',
  'policy:',
  '  capabilityCeiling: [tools, hooks, slots, events, resources, ui, services, network, network.publicRead, tools.invoke, artifacts, subagent]',
  '',
].join('\n'))
const env = { PATH: process.env.PATH, HOME: home, AGH_HOME: home, AGNES_PROFILE: 'local-dev' }
const run = (args) => new Promise((done, reject) => {
  execFile(process.execPath, [aghEntry, ...args], { cwd, env, timeout: 300000, maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) reject(Object.assign(new Error(`CLI ${args[0]} failed: ${stderr.trim()}`), { cause: error }))
    else done({ stdout, stderr })
  })
})
async function waitOperation(client, receipt) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const operation = await client.packages.operation.get({ profile: receipt.profile, operationId: receipt.operationId })
    if (['completed', 'rolled-back'].includes(operation.state)) return operation
    if (['failed', 'cancelled'].includes(operation.state)) throw new Error(JSON.stringify(operation))
    await new Promise((done) => setTimeout(done, 100))
  }
  throw new Error(`operation timeout: ${receipt.operationId}`)
}
async function waitRunning(client, id) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    const row = (await client.packages.list({ profile: 'local-dev' })).packages.find((item) => item.id === id)
    if (row?.actual === 'running' && row.trusted) return row
    await new Promise((done) => setTimeout(done, 100))
  }
  throw new Error(`package did not become running: ${id}`)
}
let daemonStarted = false
let provider
try {
  await run(['sessions', '--json'])
  daemonStarted = true
  const owner = JSON.parse(await readFile(join(home, 'data/daemon/owner.json'), 'utf8'))
  const client = createClient({ transport: { kind: 'unix', path: owner.socketPath }, auth: { kind: 'local' }, journal: memoryJournal() })
  await client.initialize()
  const catalogue = await client.config.test({ providerId: 'deepseek' })
  const model = catalogue.models[0]?.id
  assert.ok(model)
  provider = await startProviderFixture('Scientific audit smoke complete.', { name: 'skill_read', args: { name: 'scientific-evidence-audit' } }, model)
  await client.config.save({ providerId: 'deepseek', baseUrl: provider.baseUrl, apiKey: provider.apiKey, model, expectedRevision: 0 })
  await run(['daemon', 'stop'])
  await run(['sessions', '--json'])
  const restartedOwner = JSON.parse(await readFile(join(home, 'data/daemon/owner.json'), 'utf8'))
  const activeClient = createClient({ transport: { kind: 'unix', path: restartedOwner.socketPath }, auth: { kind: 'local' }, journal: memoryJournal() })
  await activeClient.initialize()
  const clientId = await activeClient.clientId()
  const source = { type: 'file', ref: 'file:./agh_scientific_audit' }
  const inspected = await waitOperation(activeClient, await activeClient.packages.inspect({ profile: 'local-dev', clientId, commandId: 'scientific-inspect', source }))
  assert.deepEqual(inspected.preview.blockers, [])
  const preview = inspected.preview
  await waitOperation(activeClient, await activeClient.packages.install({ profile: 'local-dev', clientId, commandId: 'scientific-install', source, expectedIntegrity: preview.integrity }))
  await waitOperation(activeClient, await activeClient.packages.trust({ profile: 'local-dev', clientId, commandId: 'scientific-trust', id: preview.id, expectedIntegrity: preview.integrity, capabilityHash: preview.capabilityHash ?? '' }))
  await waitOperation(activeClient, await activeClient.packages.enable({ profile: 'local-dev', clientId, commandId: 'scientific-enable', id: preview.id }))
  await waitRunning(activeClient, preview.id)
  provider.queueTool({ name: 'evidence_inventory', args: {} })
  if (!failureMode) {
    provider.queueTool({ name: 'audit_pmf_condition', args: { condition: 'DEMO_A_c1' } })
    provider.queueTool({ name: 'audit_pmf_condition', args: { condition: 'DEMO_B_c1' } })
    provider.queueTool({ name: 'compare_md_replicas', args: { comparison: 'DEMO_A-minus-DEMO_B', metric: 'demo_contact_count' } })
    provider.queueTool({ name: 'compare_md_replicas', args: { comparison: 'DEMO_A-minus-DEMO_B', metric: 'demo_bridge_count' } })
    provider.queueTool({ name: 'audit_sapt_model', args: {} })
  } else {
    provider.queueTool({ name: 'audit_sapt_model', args: {} })
  }
  const session = await activeClient.session.new({ cwd })
  await session.attach()
  const turn = await session.prompt('使用 scientific-evidence-audit Skill。先盘点证据，再按顺序审计 PMF、MD 复本和 SAPT，并给出带限制的结论。', { signal: AbortSignal.timeout(30000), titleLocale: 'zh-CN' })
  const toolNames = provider.requests.map((request) => [...request.messages].reverse().find((message) => message.tool_calls)?.tool_calls?.map((call) => call.function?.name ?? []) ?? []).flat()
  const expectedTools = failureMode
    ? ['skill_read', 'evidence_inventory', 'audit_sapt_model']
    : ['skill_read', 'evidence_inventory', 'audit_pmf_condition', 'audit_pmf_condition', 'compare_md_replicas', 'compare_md_replicas', 'audit_sapt_model']
  assert.deepEqual(toolNames.slice(0, expectedTools.length), expectedTools)
  console.log(JSON.stringify({
    package: { id: preview.id, integrity: preview.integrity, capabilityHash: preview.capabilityHash, blockers: preview.blockers },
    tools: toolNames,
    mode: failureMode ? 'failure' : 'normal',
    session_key: session.id,
    turn: { stopReason: turn.stopReason, reason: turn.reason, lastSeq: turn.lastSeq },
    provider: 'local deterministic fixture (not Agnes model)',
  }, null, 2))
} finally {
  if (provider) await provider.close()
  if (daemonStarted) {
    try { await run(['daemon', 'stop']) } catch {}
  }
  await rm(root, { recursive: true, force: true })
}
