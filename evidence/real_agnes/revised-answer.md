# 团队构造的合成测试数据 — 科学证据审计报告

> 本工作区全部为团队构造的程序测试数据（`dataset: TEAM SYNTHETIC TEST DATA - NOT RESEARCH RESULTS`，`dataset_id: team-synthetic-agh-video-test-v1`），不是科研测量或模拟结果。

---

## 一、证据盘点（evidence_inventory）

| 字段 | 值 |
|---|---|
| `tool_version` | 0.2.0 |
| `config_version` | 1.0 |
| `status` | `evidence_ready_for_configured_audits` |
| `dataset` | TEAM SYNTHETIC TEST DATA - NOT RESEARCH RESULTS |
| `dataset_id` | team-synthetic-agh-video-test-v1 |
| `raw_trajectories_included` | false |
| `pmf_conditions_declared` | 9 |
| `pmf_conditions` | DEMO_A_c0, DEMO_A_c1, DEMO_A_c2, DEMO_B_c0, DEMO_B_c1, DEMO_B_c2, DEMO_C_c0, DEMO_C_c1, DEMO_C_c2 |
| `md_comparisons` | DEMO_A-minus-DEMO_B |
| `md_metrics` | demo_contact_count (count), demo_bridge_count (count) |
| `files_expected` | 15 |
| `files_present` | 15 |
| `missing_files` | [] |
| `invalid_files` | [] |
| `configuration_file` | audit_config.json |
| `provenance_file` | provenance.json |
| `claims_supported` | Synthetic input validation; Configured tool execution; Uncertainty and error handling |
| `claims_blocked` | Any scientific inference from synthetic test values; Macroscopic phase separation; Causal mechanisms or transferable design rules |

**结论**：无缺失文件、无格式错误；不依赖缺失项，可继续全部配置化审计。

---

## 二、PMF 条件审计（audit_pmf_condition）

### DEMO_A_c1

| 字段 | 值 |
|---|---|
| `step` | pmf_qc |
| `condition` | DEMO_A_c1 |
| `status` | `quality_gate_passed_with_scope_limits` |
| `well_depth_kcal_mol` | 1.2 |
| `well_depth_ci95_kcal_mol` | [1.0, 1.4] |
| `bootstrap.requested` | 20 |
| `bootstrap.valid` | 20 |
| `bootstrap.unit` | synthetic test blocks |
| `bootstrap.seed` | 20261013 |
| `window_overlap.minimum` | 0.1 |
| `window_overlap.minimum_required` | 0.03 |
| `window_overlap.below_threshold` | [] |
| `standard_state_correction_applied` | **false** |
| `interpretation` | local PMF QC is available; standard-state correction is not applied |
| `evidence_file` | PMF/DEMO_A_c1/summary.json |

### DEMO_B_c1

| 字段 | 值 |
|---|---|
| `step` | pmf_qc |
| `condition` | DEMO_B_c1 |
| `status` | `quality_gate_passed_with_scope_limits` |
| `well_depth_kcal_mol` | 1.4 |
| `well_depth_ci95_kcal_mol` | [1.2, 1.6] |
| `bootstrap.requested` | 20 |
| `bootstrap.valid` | 20 |
| `bootstrap.unit` | synthetic test blocks |
| `bootstrap.seed` | 20261013 |
| `window_overlap.minimum` | 0.1 |
| `window_overlap.minimum_required` | 0.03 |
| `window_overlap.below_threshold` | [] |
| `standard_state_correction_applied` | **false** |
| `interpretation` | local PMF QC is available; standard-state correction is not applied |
| `evidence_file` | PMF/DEMO_B_c1/summary.json |

**注意**：两组条件的 `standard_state_correction_applied` 均为 `false`，即**标准态修正未应用**，井深数值仅为局部 PMF QC，不能直接横向换算为热力学标准态结合自由能。

---

## 三、MD 复本对比（compare_md_replicas）

### demo_contact_count（DEMO_A-minus-DEMO_B）

| 字段 | 值 |
|---|---|
| `step` | md_replica_contrast |
| `comparison` | DEMO_A-minus-DEMO_B |
| `metric` | demo_contact_count |
| `n_independent_replicas_per_group` | 3 |
| `delta_mean` | −0.2 |
| `ci95` | [−1.0, 0.6] |
| `verdict` | `ci_crosses_zero_not_resolved` |
| `unit` | count |
| `evidence_file` | MD/contrasts.csv |
| `guardrail` | A confidence interval crossing zero cannot support a directional mechanistic claim. |

### demo_bridge_count（DEMO_A-minus-DEMO_B）

| 字段 | 值 |
|---|---|
| `step` | md_replica_contrast |
| `comparison` | DEMO_A-minus-DEMO_B |
| `metric` | demo_bridge_count |
| `n_independent_replicas_per_group` | 3 |
| `delta_mean` | 0 |
| `ci95` | [−0.5, 0.5] |
| `verdict` | `ci_crosses_zero_not_resolved` |
| `unit` | count |
| `evidence_file` | MD/contrasts.csv |
| `guardrail` | A confidence interval crossing zero cannot support a directional mechanistic claim. |

**注意**：两个指标置信区间均跨零（`ci_crosses_zero_not_resolved`），只能说**方向未分辨**，不代表已证明两组相同，不能支持方向性机制声明。

---

## 四、SAPT 模型审计（audit_sapt_model）

| 字段 | 值 |
|---|---|
| `status` | `interpolation_diagnostic_only` |
| `target` | synthetic fixture target (kcal/mol) |
| `n_unique_samples` | 8 |
| `n_scaffolds` | 4 |
| `n_families` | 2 |
| `selected_alpha` | 1 |
| `evidence_files` | AI/metrics.csv, AI/audit.json |
| `scope` | Synthetic grouped interpolation diagnostic for execution testing only. |
| `cross_scale_join` | No scientific conclusions or cross-scale causal join from synthetic data. |
| `guardrail` | Do not report this audit as a transferable design rule or causal evidence for a specific material. |

### 分组诊断（`grouped_metrics`）

| `scheme`（原始值） | 中文说明 | `model` | `n_samples` | `mae_kcal_mol` | `mae_ci95` |
|---|---|---|---|---|---|
| `loso` | 留一骨架 | synthetic_baseline | 8 | 0.3 | [0.2, 0.4] |
| `lofo` | 留一家族 | synthetic_baseline | 8 | 0.5 | [0.4, 0.6] |

**状态限定**：SAPT 结果仅为 `interpolation_diagnostic_only`（内插诊断），不能作为可迁移设计规则或 a specific material 因果证据。

---

## 五、工具状态汇总

| 工具 | 状态 |
|---|---|
| evidence_inventory | 完成，`evidence_ready_for_configured_audits` |
| audit_pmf_condition ×2 | 完成，`quality_gate_passed_with_scope_limits`（两组） |
| compare_md_replicas ×2 | 完成，`ci_crosses_zero_not_resolved`（两指标） |
| audit_sapt_model | 完成，`interpolation_diagnostic_only` |

AI/audit.json 存在于 evidence_files 中且未报告缺失，无需触发缺文件恢复流程。

---

## 六、范围限制与声明边界

1. **合成数据**：全部为团队构造的程序测试数据，非科研测量或模拟结果；`raw_trajectories_included: false`。
2. **可支持声明**：合成输入验证、配置化工具执行、不确定性与错误处理。
3. **被阻断声明**：从合成测试值做任何科学推断；宏观相分离；因果机制或可迁移设计规则。
4. **标准态修正未应用**（`standard_state_correction_applied: false`），PMF 井深不可直接作为标准态结合自由能使用。
5. **MD 对比方向未分辨**：CI 跨零 ≠ 已证明两组相同，不能支持方向性机制声明。
6. **SAPT 仅内插诊断**：不可外推为可迁移设计规则或 a specific material 因果证据；不做跨尺度因果拼接。
7. 验证分组保留原始 `scheme` 值 `loso`（留一骨架）与 `lofo`（留一家族），未改写为其他验证方法。



报告已完成。