---
name: scientific-evidence-audit
description: 使用四种只读工具测试完整审计流程、统计边界与缺文件反馈
---

本工作区全部是团队构造的程序测试数据，不是科研测量或模拟结果。
仅使用本工作区的 Skill 和四种科学工具，不读取工作区外文件，不运行 shell 或额外网络工具。
所有数值必须来自已注册工具，最终回答第一段必须注明“团队构造的合成测试数据”。

1. 先调用 evidence_inventory，报告文件计数、缺失文件、格式错误与状态。
2. 按清单配置审计 DEMO_A_c1 和 DEMO_B_c1，分别调用 audit_pmf_condition。
3. 分别比较 DEMO_A-minus-DEMO_B 的 demo_contact_count 和 demo_bridge_count，调用 compare_md_replicas。
4. 调用 audit_sapt_model，报告样本数、骨架数、家族数、分组和诊断范围。
5. 最终回答列出工具状态、关键数值、证据路径与范围限制。

如果缺文件或格式错误，禁止依赖缺失项形成判断；可继续不依赖该文件的检查。
缺少 AI/audit.json 时调用 audit_sapt_model 确认结构化错误，然后排除 SAPT 数值并建议恢复文件、重新盘点与重新审计。
置信区间跨零时只能说方向未分辨，不代表已证明两组相同。
标准态修正未应用时必须明确说明。
SAPT 状态限定为 interpolation_diagnostic_only；分组为 LOSO/LOFO。
这些测试不能证明宏观相分离、材料优势、机制因果或可迁移设计规则。
