团队构造的合成测试数据，不是科研测量或模拟结果；最终结论仅限本工作区清单化数据与已注册工具。

## 证据状态
- `evidence_inventory` 状态：`evidence_needs_attention`
- 配置：`audit_config.json`，版本 `0.2.0`
- 数据标识：`team-synthetic-agh-video-test-v1`
- 预期文件：15 个
- 实际存在文件：14 个
- 缺失文件：`AI/audit.json`
- 无效文件：0 个
- PMF 条件：共 9 个，包括 `DEMO_A_c0` 到 `DEMO_A_c2`、`DEMO_B_c0` 到 `DEMO_B_c2`、`DEMO_C_c0` 到 `DEMO_C_c2`
- MD 对比：`DEMO_A-minus-DEMO_B`
- MD 指标：`demo_contact_count`、`demo_bridge_count`
- 支持类型：合成输入验证、配置化工具执行、不确定性与错误处理
- 阻止类型：不能从合成测试数值做任何科学推断；不能证明宏观相分离、因果机制或可迁移设计规则

## 工具状态与关键数值
- `audit_pmf_condition: DEMO_A_c1`
  - 状态：`quality_gate_passed_with_scope_limits`
  - 井深：1.2 kcal/mol
  - 95% CI：1.0 至 1.4 kcal/mol
  - bootstrap：请求 20，有效 20，种子 20261013
  - 窗口重叠最低值：0.1；要求最低 0.03；未达标列表为空
  - 标准态修正：未应用
  - 证据路径：`PMF/DEMO_A_c1/summary.json`

- `audit_pmf_condition: DEMO_B_c1`
  - 状态：`quality_gate_passed_with_scope_limits`
  - 井深：1.4 kcal/mol
  - 95% CI：1.2 至 1.6 kcal/mol
  - bootstrap：请求 20，有效 20，种子 20261013
  - 窗口重叠最低值：0.1；要求最低 0.03；未达标列表为空
  - 标准态修正：未应用
  - 证据路径：`PMF/DEMO_B_c1/summary.json`

- `compare_md_replicas: DEMO_A-minus-DEMO_B, demo_contact_count`
  - 每组独立复本数：3
  - 差异均值：-0.2 count
  - 95% CI：-1.0 至 0.6 count
  - 判定：`ci_crosses_zero_not_resolved`
  - 解释：置信区间跨零，只能说明方向未分辨，不代表两组相同。
  - 证据路径：`MD/contrasts.csv`

- `compare_md_replicas: DEMO_A-minus-DEMO_B, demo_bridge_count`
  - 每组独立复本数：3
  - 差异均值：0 count
  - 95% CI：-0.5 至 0.5 count
  - 判定：`ci_crosses_zero_not_resolved`
  - 解释：置信区间跨零，只能说明方向未分辨，不代表两组相同。
  - 证据路径：`MD/contrasts.csv`

- `audit_sapt_model`
  - 状态：结构化错误 `EVIDENCE_FILE_MISSING: AI/audit.json`
  - 样本数：未报告，因文件缺失
  - 骨架数：未报告，因文件缺失
  - 家族数：未报告，因文件缺失
  - 分组：按 Skill 限定为 `LOSO/LOFO`
  - 诊断范围：`interpolation_diagnostic_only`
  - 证据路径：`AI/audit.json`

## 范围限制
- 本工作区全部是团队构造的程序测试数据。
- 只能使用本工作区 Skill 与四种注册科学工具；未读取工作区外文件，未运行 shell 或额外网络工具。
- 所有数值均来自已注册工具输出。
- 由于 `AI/audit.json` 缺失，SAPT 数值被排除；应恢复该文件后重新盘点证据并重新调用 `audit_sapt_model`。
- PMF 两项均未应用标准态修正；不能将数值解释为绝对结合自由能。
- MD 两项置信区间均跨零，不能支持方向性机制判断。
- 这些测试不能证明宏观相分离、材料优势、机制因果或可迁移设计规则。