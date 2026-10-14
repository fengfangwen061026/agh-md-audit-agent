以下全部数值来自团队构造的合成测试数据，仅用于程序执行、不确定性与边界测试；不能据此得出任何科研测量结论。

## 1. 证据盘点（evidence_inventory）

- 文件计数：15/15 全部存在，missing_files 为空，invalid_files 为空
- 状态：`evidence_ready_for_configured_audits`
- 格式/范围限制：不含原始轨迹（raw_trajectories_included: false）
- 声明支持范围：合成输入校验、配置化工具执行、不确定性与错误处理
- 明确禁止范围：基于合成测试值做科学推断、宏观相分离、因果机制或可迁移设计规则

## 2. PMF 审计（audit_pmf_condition）

| 条件 | 状态 | well depth (kcal/mol) | 95% CI | bootstrap | 窗口重叠 |
|---|---|---|---|---|---|
| DEMO_A_c1 | quality_gate_passed_with_scope_limits | 1.2 | [1.0, 1.4] | 请求 20 / 有效 20（合成测试块，seed 20261013） | 最小 0.10 ≥ 0.03，无低于阈值窗口 |
| DEMO_B_c1 | quality_gate_passed_with_scope_limits | 1.4 | [1.2, 1.6] | 请求 20 / 有效 20（同上） | 最小 0.10 ≥ 0.03，无低于阈值窗口 |

- 标准态修正：两个条件均为**未应用**（standard_state_correction_applied: false）
- 证据路径：`PMF/DEMO_A_c1/summary.json`、`PMF/DEMO_B_c1/summary.json`
- 范围限制：仅有局部 PMF QC；不可外推为结合能定量结论

## 3. MD 复本对比（compare_md_replicas，DEMO_A-minus-DEMO_B）

| 指标 | 每组合独立复本数 | delta_mean | 95% CI | 判定 |
|---|---|---|---|---|
| demo_contact_count | 3 | −0.2 | [−1.0, 0.6] | ci_crosses_zero_not_resolved |
| demo_bridge_count | 3 | 0.0 | [−0.5, 0.5] | ci_crosses_zero_not_resolved |

- 单位：count；证据路径：`MD/contrasts.csv`
- 范围限制：两个 CI 均跨零，只能说明**方向未分辨**，不能表述为"两组相同"，更不能支持方向性机制判断

## 4. SAPT 模型审计（audit_sapt_model）

- 状态：`interpolation_diagnostic_only`（仅限插值诊断）
- 目标：synthetic fixture target（kcal/mol）
- 样本数：8 个独立样本；骨架数：4；家族数：2
- 分组诊断（均为 8 样本）：
  - LOSO / synthetic_baseline：MAE 0.3 kcal/mol，CI95 [0.2, 0.4]
  - LOFO / synthetic_baseline：MAE 0.5 kcal/mol，CI95 [0.4, 0.6]
- selected_alpha：1
- 证据路径：`AI/metrics.csv`、`AI/audit.json`
- 范围限制：不得作为可迁移设计规则或 a specific material 因果证据；禁止跨尺度因果连接

## 5. 工具状态汇总

- 四个工具（evidence_inventory、audit_pmf_condition ×2、compare_md_replicas ×2、audit_sapt_model）全部调用成功，无结构化错误；本流程未出现缺文件或格式错误，无需执行缺失项的降级排除
- 全部结论限定于合成测试数据的执行验证范围：不能证明宏观相分离、材料优势、机制因果或可迁移设计规则