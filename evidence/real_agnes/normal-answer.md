以下为团队构造的合成测试数据（非科研测量或模拟结果），全部数值均来自本轮已注册工具输出。

## 1. 证据状态（evidence_inventory）

- **文件计数**：预期 15，实有 15，`missing_files=[]`，`invalid_files=[]`，无缺失、无格式错误。
- **清单内容**：
  - PMF 条件（9 个）：`DEMO_A_c0/c1/c2`、`DEMO_B_c0/c1/c2`、`DEMO_C_c0/c1/c2`
  - MD 对比：`DEMO_A-minus-DEMO_B`；指标：`demo_contact_count`（count）、`demo_bridge_count`（count）
  - 证据路径：`PMF/DEMO_A_c1/summary.json`、`PMF/DEMO_B_c1/summary.json`、`MD/contrasts.csv`、`AI/metrics.csv`、`AI/audit.json`
  - 配置/溯源：`audit_config.json`、`provenance.json`
- **状态**：`evidence_ready_for_configured_audits`。支持声明限于：合成输入校验、配置化工具执行、不确定度与错误处理。阻止声明：从合成数值做科学推断、宏观相分离、因果机制或可迁移设计规则。
- 因 `AI/audit.json` 存在，未触发“缺文件”路径；仍按技能规则把 SAPT 限定为诊断状态（见第 4 节）。

## 2. PMF 审计（audit_pmf_condition）

| 条件 | 状态 | 势阱深度 (kcal/mol) | 95% CI | 引导 | 窗口重叠 | 标准态修正 |
|---|---|---|---|---|---|---|
| DEMO_A_c1 | quality_gate_passed_with_scope_limits | 1.2 | [1.0, 1.4] | 20/20（合成测试块，seed=20261013） | 最小 0.1 ≥ 要求 0.03，无低于阈值 | **未应用** |
| DEMO_B_c1 | quality_gate_passed_with_scope_limits | 1.4 | [1.2, 1.6] | 20/20（同上） | 最小 0.1 ≥ 0.03，无低于阈值 | **未应用** |

- 解读：局部 PMF 质控可用；**标准态修正未应用，数值仅可在局部比较语义下讨论，不可做绝对亲和力或标准自由能声明**。
- 证据文件：`PMF/DEMO_A_c1/summary.json`、`PMF/DEMO_B_c1/summary.json`。

## 3. MD 复本对比（compare_md_replicas）

每组独立复本数 n = 3。

| 指标 | Δ均值 | 95% CI | 判定 | 护栏 |
|---|---|---|---|---|
| demo_contact_count | −0.2 | [−1.0, 0.6] | **CI 跨零，方向未分辨** | CI 跨零不能支持方向性机制声明 |
| demo_bridge_count | 0.0 | [−0.5, 0.5] | **CI 跨零，方向未分辨** | 同上 |

- 两个指标均只能表述为“方向未分辨”，**不代表已证明两组相同**。
- 证据文件：`MD/contrasts.csv`。

## 4. SAPT 模型审计（audit_sapt_model）

- **状态**：`interpolation_diagnostic_only`（分组 LOO/LOFO 诊断，仅用于执行测试，不得作为可迁移设计规则或 a specific material 因果证据）。
- **关键数值**：
  - 样本数 n_unique_samples = 8；骨架数 = 4；家族数 = 2；selected_alpha = 1。
  - LOO（synthetic_baseline）：MAE = 0.3 kcal/mol，95% CI [0.2, 0.4]
  - LOFO（synthetic_baseline）：MAE = 0.5 kcal/mol，95% CI [0.4, 0.6]
- **分组**：`loso` 与 `lofo`，各 n_samples = 8。
- **诊断范围**：合成分组插值诊断；`cross_scale_join` 明确“不得从合成数据做科学结论或跨尺度因果拼接”。
- **证据文件**：`AI/metrics.csv`、`AI/audit.json`（两者均存在，无结构化缺失错误；若缺失才需恢复文件→重新盘点→重新审计）。

## 5. 工具状态与范围限制汇总

| 工具 | 状态 |
|---|---|
| evidence_inventory | ✅ 就绪，15/15 文件，无缺失/无效 |
| audit_pmf_condition ×2 | ✅ 两条件均通过质控门，带范围限制 |
| compare_md_replicas ×2 | ✅ 两指标均 CI 跨零、未分辨 |
| audit_sapt_model | ✅ 成功；状态限定为 interpolation_diagnostic_only |

**范围限制（必须遵守的声明边界）**：
1. 全部为团队构造合成测试数据，不是科研结果。
2. 本组测试不能证明宏观相分离、材料优势、机制因果或可迁移设计规则。
3. PMF 两条件标准态修正未应用 → 数值不可做绝对自由能声明。
4. MD 两指标 CI 跨零 → 只能说方向未分辨，不能声称两组相同或存在方向差异。
5. SAPT 仅限 LOO/LOFO 插值诊断（interpolation_diagnostic_only），不产生科学结论或跨尺度因果拼接。