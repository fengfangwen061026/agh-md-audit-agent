import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_DATA_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  'data',
)
const CONFIG_PATH = 'audit_config.json'
const Kind = Symbol.for('TypeBox.Kind')
const noParameters = {
  [Kind]: 'Object',
  type: 'object',
  properties: {},
  additionalProperties: false,
}
const conditionParameters = {
  [Kind]: 'Object',
  type: 'object',
  properties: {
    condition: { [Kind]: 'String', type: 'string', minLength: 1 },
  },
  required: ['condition'],
  additionalProperties: false,
}
const comparisonParameters = {
  [Kind]: 'Object',
  type: 'object',
  properties: {
    comparison: { [Kind]: 'String', type: 'string', minLength: 1 },
    metric: { [Kind]: 'String', type: 'string', minLength: 1 },
  },
  required: ['comparison', 'metric'],
  additionalProperties: false,
}
const meta = {
  isReadOnly: true,
  isDestructive: false,
  isConcurrencySafe: true,
  isOpenWorld: false,
  replay: 'safe',
  costHint: undefined,
  deferLoading: false,
  requiresApproval: 'never',
}

function dataRoot() {
  return path.resolve(process.env.AGH_SCIENTIFIC_AUDIT_DATA_ROOT || DEFAULT_DATA_ROOT)
}

function dataPath(relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath) || relativePath.split(/[\\/]/u).includes('..')) {
    throw new Error(`EVIDENCE_CONFIG_INVALID: unsafe data path ${relativePath}`)
  }
  const root = dataRoot()
  const absolutePath = path.resolve(root, relativePath)
  if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new Error(`EVIDENCE_CONFIG_INVALID: unsafe data path ${relativePath}`)
  return absolutePath
}

async function readConfig() {
  const config = await readJson(CONFIG_PATH)
  if (config.schema_version !== '1.0' || !config.dataset?.id || !config.files?.manifest?.path || !config.files?.pmf_summary?.path_template) {
    throw new Error('EVIDENCE_CONFIG_INVALID: audit_config.json schema')
  }
  return config
}

function requiredContractField(value, field, relativePath) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`EVIDENCE_FILE_INVALID: ${relativePath} missing required ${field}`)
  }
}

function resolveTemplate(template, values) {
  const resolved = template.replace(/\{(\w+)\}/gu, (_, key) => {
    if (!(key in values)) throw new Error(`EVIDENCE_CONFIG_INVALID: missing template value ${key}`)
    return values[key]
  })
  if (/[{}]/u.test(resolved)) throw new Error('EVIDENCE_CONFIG_INVALID: unresolved path template')
  return resolved
}

function configuredPmfConditions(config) {
  const conditions = config.pmf?.conditions
  if (!Array.isArray(conditions) || conditions.length === 0 || conditions.some((item) => typeof item !== 'string') || new Set(conditions).size !== conditions.length) {
    throw new Error('EVIDENCE_CONFIG_INVALID: pmf.conditions')
  }
  return conditions
}

function configuredMdComparisons(config) {
  const comparisons = config.md?.comparisons
  if (!Array.isArray(comparisons) || comparisons.length === 0 || comparisons.some((item) => typeof item !== 'string') || new Set(comparisons).size !== comparisons.length) {
    throw new Error('EVIDENCE_CONFIG_INVALID: md.comparisons')
  }
  return comparisons
}

function configuredMdMetrics(config) {
  const metrics = config.md?.metrics
  if (!Array.isArray(metrics) || metrics.length === 0 || metrics.some((metric) => !metric?.id) || new Set(metrics.map((metric) => metric.id)).size !== metrics.length) {
    throw new Error('EVIDENCE_CONFIG_INVALID: md.metrics')
  }
  return metrics
}

async function readJson(relativePath) {
  const absolutePath = dataPath(relativePath)
  try {
    return JSON.parse(await fs.readFile(absolutePath, 'utf8'))
  } catch (error) {
    const suffix = error?.code === 'ENOENT' ? 'EVIDENCE_FILE_MISSING' : 'EVIDENCE_FILE_INVALID'
    throw new Error(`${suffix}: ${relativePath}`)
  }
}

async function readText(relativePath) {
  const absolutePath = dataPath(relativePath)
  try {
    return await fs.readFile(absolutePath, 'utf8')
  } catch (error) {
    const suffix = error?.code === 'ENOENT' ? 'EVIDENCE_FILE_MISSING' : 'EVIDENCE_FILE_UNREADABLE'
    throw new Error(`${suffix}: ${relativePath}`)
  }
}

function parseCsvLine(line) {
  const values = []
  let value = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (quoted) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          value += '"'
          index += 1
        } else {
          quoted = false
        }
      } else {
        value += character
      }
    } else if (character === '"' && value.length === 0) {
      quoted = true
    } else if (character === ',') {
      values.push(value)
      value = ''
    } else {
      value += character
    }
  }
  if (quoted) throw new Error('EVIDENCE_FILE_INVALID: unterminated CSV quote')
  values.push(value)
  return values
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/u)
  if (lines.length < 2) throw new Error('EVIDENCE_FILE_INVALID: empty CSV')
  const header = parseCsvLine(lines[0])
  if (header.some((name) => name.length === 0) || new Set(header).size !== header.length) {
    throw new Error('EVIDENCE_FILE_INVALID: invalid CSV header')
  }
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line)
    if (values.length !== header.length) {
      throw new Error(`EVIDENCE_FILE_INVALID: CSV row ${index + 2} has ${values.length} fields; expected ${header.length}`)
    }
    return Object.fromEntries(header.map((name, valueIndex) => [name, values[valueIndex]]))
  })
}

function number(value, field) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`EVIDENCE_VALUE_INVALID: ${field}`)
  return parsed
}

function result(structured) {
  return { content: [{ type: 'text', text: JSON.stringify(structured) }], structured }
}

async function inventory() {
  const config = await readConfig()
  const pmfConditions = configuredPmfConditions(config)
  const definitions = Object.values(config.files).filter((definition) => definition.path)
  const pmfDefinition = config.files.pmf_summary
  const entries = [
    ...definitions.map((definition) => ({ path: definition.path, definition })),
    ...pmfConditions.map((condition) => ({
      path: resolveTemplate(pmfDefinition.path_template, { condition }),
      definition: pmfDefinition,
    })),
  ]
  const uniqueEntries = [...new Map(entries.map((entry) => [entry.path, entry])).values()]
  const present = []
  const invalid = []
  let manifest = {}
  for (const { path: file, definition } of uniqueEntries) {
    try {
      const text = await readText(file)
      present.push(file)
      let content
      if (definition.format === 'csv') {
        content = parseCsv(text)
        const columns = content[0] ? Object.keys(content[0]) : []
        for (const column of definition.required_columns || []) {
          requiredContractField(columns.includes(column) ? column : undefined, `column:${column}`, file)
        }
      } else if (definition.format === 'json') {
        try {
          content = JSON.parse(text)
        } catch {
          throw new Error(`EVIDENCE_FILE_INVALID: malformed JSON: ${file}`)
        }
        if (!content || typeof content !== 'object' || Array.isArray(content)) {
          throw new Error(`EVIDENCE_FILE_INVALID: expected JSON object: ${file}`)
        }
        for (const field of definition.required_fields || []) {
          requiredContractField(content[field], `field:${field}`, file)
        }
      } else {
        throw new Error(`EVIDENCE_CONFIG_INVALID: unsupported format for ${file}`)
      }
      if (definition.id === 'run_manifest') manifest = content
    } catch (error) {
      if (!String(error.message || error).startsWith('EVIDENCE_FILE_MISSING:')) {
        invalid.push({ file, error: String(error.message || error) })
      }
    }
  }
  const missing = uniqueEntries.map((entry) => entry.path).filter((file) => !present.includes(file))
  return {
    tool_version: '0.2.0',
    config_version: config.schema_version,
    status: missing.length || invalid.length ? 'evidence_needs_attention' : 'evidence_ready_for_configured_audits',
    dataset: config.dataset?.name || manifest.package,
    dataset_id: config.dataset?.id,
    raw_trajectories_included: Boolean(manifest.raw_trajectories_included),
    pmf_conditions: pmfConditions,
    pmf_conditions_declared: pmfConditions.length,
    md_comparisons: configuredMdComparisons(config),
    md_metrics: configuredMdMetrics(config),
    files_expected: uniqueEntries.length,
    files_present: present.length,
    missing_files: missing,
    invalid_files: invalid,
    claims_supported: config.claims_supported || [],
    claims_blocked: config.claims_blocked || [],
    configuration_file: CONFIG_PATH,
    provenance_file: config.files.provenance?.path,
  }
}

async function auditPmf({ condition }) {
  const config = await readConfig()
  const conditions = configuredPmfConditions(config)
  if (!conditions.includes(condition)) throw new Error(`EVIDENCE_CONDITION_UNSUPPORTED: ${condition}`)
  const relativePath = resolveTemplate(config.files.pmf_summary.path_template, { condition })
  const summary = await readJson(relativePath)
  const fields = config.pmf.fields
  const ci = summary[fields.confidence_interval]
  if (!Array.isArray(ci) || ci.length !== 2) {
    throw new Error(`EVIDENCE_VALUE_INVALID: ${relativePath}.${fields.confidence_interval}`)
  }
  const threshold = number(config.pmf.minimum_neighbor_overlap, 'pmf.minimum_neighbor_overlap')
  const minOverlap = number(summary[fields.minimum_overlap], fields.minimum_overlap)
  const wellDepth = number(summary[fields.well_depth], fields.well_depth)
  const ciLow = number(ci[0], `${fields.confidence_interval}[0]`)
  const ciHigh = number(ci[1], `${fields.confidence_interval}[1]`)
  const bootstrapRequested = number(summary[fields.bootstrap_requested], fields.bootstrap_requested)
  const bootstrapValid = number(summary[fields.bootstrap_valid], fields.bootstrap_valid)
  const invalidOverlaps = summary[fields.invalid_overlaps] ?? []
  const standardStateCorrection = summary[fields.standard_state_correction]
  if (!Array.isArray(invalidOverlaps) || typeof standardStateCorrection !== 'boolean' || ciLow > ciHigh || minOverlap < 0 || bootstrapRequested < 1 || bootstrapValid < 0 || bootstrapValid > bootstrapRequested) {
    throw new Error(`EVIDENCE_VALUE_INVALID: ${relativePath}.qc_fields`)
  }
  const overlapFailed = minOverlap < threshold || invalidOverlaps.length > 0
  return result({
    step: 'pmf_qc',
    condition,
    status: overlapFailed || bootstrapValid < bootstrapRequested
      ? 'quality_gate_failed'
      : 'quality_gate_passed_with_scope_limits',
    well_depth_kcal_mol: wellDepth,
    well_depth_ci95_kcal_mol: [ciLow, ciHigh],
    bootstrap: {
      requested: bootstrapRequested,
      valid: bootstrapValid,
      unit: summary[fields.bootstrap_unit],
      seed: summary[fields.seed],
    },
    window_overlap: {
      minimum: minOverlap,
      minimum_required: threshold,
      below_threshold: invalidOverlaps,
    },
    standard_state_correction_applied: standardStateCorrection,
    interpretation: standardStateCorrection
      ? 'local PMF comparison is available; check the declared standard-state convention'
      : 'local PMF QC is available; standard-state correction is not applied',
    evidence_file: relativePath,
  })
}

async function compareMd({ comparison, metric }) {
  const config = await readConfig()
  const comparisons = configuredMdComparisons(config)
  const metrics = configuredMdMetrics(config)
  const metricDefinition = metrics.find((item) => item.id === metric)
  if (!comparisons.includes(comparison)) throw new Error(`EVIDENCE_COMPARISON_UNSUPPORTED: ${comparison}`)
  if (!metricDefinition) throw new Error(`EVIDENCE_METRIC_UNSUPPORTED: ${metric}`)
  const columns = config.md.columns
  const relativePath = config.files.md_contrasts.path
  const rows = parseCsv(await readText(relativePath))
  const row = rows.find((candidate) => candidate[columns.comparison] === comparison && candidate[columns.metric] === metric)
  if (!row) throw new Error(`EVIDENCE_ROW_MISSING: ${comparison}/${metric}`)
  const nPerGroup = number(row[columns.replicas_per_group], columns.replicas_per_group)
  const delta = number(row[columns.difference], columns.difference)
  const low = number(row[columns.ci_low], columns.ci_low)
  const high = number(row[columns.ci_high], columns.ci_high)
  if (nPerGroup < config.md.minimum_independent_replicas || low > high) throw new Error(`EVIDENCE_VALUE_INVALID: ${comparison}/${metric}.replica_qc`)
  const resolved = low > 0 || high < 0
  return result({
    step: 'md_replica_contrast',
    comparison,
    metric,
    n_independent_replicas_per_group: nPerGroup,
    delta_mean: delta,
    ci95: [low, high],
    verdict: resolved
      ? (low > 0 ? 'positive_difference_resolved' : 'negative_difference_resolved')
      : 'ci_crosses_zero_not_resolved',
    unit: metricDefinition.unit,
    evidence_file: relativePath,
    guardrail: 'A confidence interval crossing zero cannot support a directional mechanistic claim.',
  })
}

async function auditAi() {
  const config = await readConfig()
  const columns = config.sapt.columns
  const auditFields = config.sapt.audit_fields
  const metricsPath = config.files.sapt_metrics.path
  const auditPath = config.files.sapt_audit.path
  const metrics = parseCsv(await readText(metricsPath))
  const audit = await readJson(auditPath)
  const groupedSchemes = new Set(config.sapt.grouped_schemes)
  const grouped = metrics
    .filter((row) => groupedSchemes.has(row[columns.scheme]))
    .map((row) => ({
      scheme: row[columns.scheme],
      model: row[columns.model],
      n_samples: number(row[columns.sample_count], columns.sample_count),
      mae_kcal_mol: number(row[columns.mae], columns.mae),
      mae_ci95: [number(row[columns.ci_low], columns.ci_low), number(row[columns.ci_high], columns.ci_high)],
    }))
  if (grouped.length === 0 || grouped.some((row) => row.n_samples < 2 || row.mae_kcal_mol < 0 || row.mae_ci95[0] > row.mae_ci95[1])) {
    throw new Error('EVIDENCE_VALUE_INVALID: configured grouped metrics')
  }
  return result({
    status: 'interpolation_diagnostic_only',
    target: audit[auditFields.target],
    n_unique_samples: number(audit[auditFields.sample_count], auditFields.sample_count),
    n_scaffolds: number(audit[auditFields.scaffold_count], auditFields.scaffold_count),
    n_families: number(audit[auditFields.family_count], auditFields.family_count),
    grouped_metrics: grouped,
    selected_alpha: audit[auditFields.selected_alpha],
    scope: audit[auditFields.scope],
    cross_scale_join: audit[auditFields.cross_scale_join],
    guardrail: 'Do not report this audit as a transferable design rule or causal evidence for a specific material.',
    evidence_files: [metricsPath, auditPath],
  })
}

export const scientificEvidenceAudit = {
  inject: ['extension'],
  apply(ctx) {
    const agnes = ctx.extension()
    agnes.registerTool({
      name: 'evidence_inventory',
      description: 'Check the curated scientific evidence package and its claim boundaries.',
      parameters: noParameters,
      meta,
      async execute() { return result(await inventory()) },
    })
    agnes.registerTool({
      name: 'audit_pmf_condition',
      description: 'Validate one precomputed PMF condition and return QC plus scope limits.',
      parameters: conditionParameters,
      meta,
      async execute(input) { return auditPmf(input) },
    })
    agnes.registerTool({
      name: 'compare_md_replicas',
      description: 'Read one independent-replica contrast and apply the confidence-interval guardrail.',
      parameters: comparisonParameters,
      meta,
      async execute(input) { return compareMd(input) },
    })
    agnes.registerTool({
      name: 'audit_sapt_model',
      description: 'Audit grouped SAPT predictions and return the interpolation-only conclusion.',
      parameters: noParameters,
      meta,
      async execute() { return auditAi() },
    })
  },
}
