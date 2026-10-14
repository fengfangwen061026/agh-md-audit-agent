# 公开版运行与验证证据

全部输入为团队构造的合成测试数据；这是工程执行验证，不是科研模拟重算。执行日期2026-10-13，公开脱敏日期2026-10-14。

- `real_agnes/revised-verified.json`：真实Agnes正常任务的完整核验。
- `boundary-case.json`：从同一真实正常任务提取的PMF范围限制与MD跨零结果。
- `real_agnes/failure-result.json`：14/15文件，缺AI/audit.json，SAPT返回EVIDENCE_FILE_MISSING；其他有效检查继续。
- `real_agnes/recovery-result.json`：恢复源文件、重新装载、新建会话后15/15与SAPT正常；不代表安装快照自动热更新。
- `release_real/`：发布前发行入口再次执行的真实Agnes正常与失败记录。
- `real_agnes/display-session-export.jsonl`：带seq/ts的脱敏完整会话；可用toolUseId配对参数和返回值。
- `offline_validation/`：不调用外部模型的工具测试与确定性Host fixture，和真实模型证据分开。
- `synthetic_inputs/`、`synthetic_skill/`：实际使用的合成输入与工作流规则。

双击index.html可离线核查。`node verify_manifest.mjs`核对本公开证据包中的逐文件SHA256。

真实模型是agnes-ai / agnes-3.0-flash。AGH commit 57d0c34b33527294042b7ab8a60d7c7c934e932e，Node v24.18.0，macOS arm64。时间戳Z为UTC，北京时间UTC+8。

## 脱敏与证据边界

公开版替换私有工作区、个人及会话标识、项目品牌和材料名；没有公开截图、原始Git历史、原科研数据、凭据或账号配置。数值、工具状态、错误码、事件顺序和执行时间保持不变。

这些文件是历史实测记录的脱敏副本。公开版插件因通用标识和解释文本调整而具有新hash；recorded_snapshot_integrity是当时运行快照的元数据，不声称与修改后的公开插件相同。public_answer_sha256校验脱敏后的配套答案；其他历史哈希不作为当前公开文件的校验值。完整导出经脱敏后不用于原始账本签名验证，当前文件以manifest.json为准。

## 实际观察到的限制

保留初始回答把loso写为LOO、混淆tool_version和config_version等现象。旧检查要求显式skill_read，因此出现false；Host实际可预加载Skill，修订核验接受[skill loaded]。revised-result保留旧提取状态，revised-verified依据完整会话另行核验。

模型可能把完整报告写入中间消息，末句仅“报告已完成”。同一会话补充展示请求后报告可见。发行脚本保存所有非空assistant消息，防止短末句覆盖报告；这不改变AGH界面折叠行为。

再次实测的正常答案有英文合成数据标识，但未按指令在中文首段声明，并把MD verdict写成status；数值和跨零结论正确。工程检查通过不等于自然语言格式完全正确，工具原文是数值核查依据。各场景运行次数很少，不能据此推断模型长期稳定率。
