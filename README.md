# 基于 Agnes Harness 的通用型 MD 数据分析智能体

一个面向分子模拟**汇总证据**的可扩展智能体原型，支持证据盘点、PMF质量检查、MD独立复本对照、SAPT分组审计，以及定制化接入与过程追溯。

**公开版全部数据为团队构造的合成测试输入。** 本仓库不包含未公开科研数据、原始轨迹、私有账号、API key或原项目Git历史。工程演示结果不能用于科学机制或材料优势的证明。

## 直接运行源码（无需模型账号）

安装 Node.js >=24.10；不需要 npm install、Python、GPU或分子模拟软件。

```bash
git clone https://github.com/fengfangwen061026/agh-md-audit-agent.git
cd agh-md-audit-agent
node scripts/verify_manifest.mjs
node scripts/demo.mjs
node tests/run_local_cases.mjs
```

打开 `outputs/index.html` 查看正常、跨零边界、缺文件失败和恢复的工具结果。此入口实际执行插件工具，不调用模型。GitHub Actions同样只运行离线验证，不使用模型凭据。

## 下载完整运行包

[GitHub Releases](https://github.com/fengfangwen061026/agh-md-audit-agent/releases/latest) 提供：

- `AGH_MD_Audit_Public.zip`：公开源码、合成示例、Skill、定制指南、运行证据、锁定版本AGH运行时和许可证。
- `AGH_Execution_Evidence_Public.zip`：可离线展开的脱敏运行证据。
- `SHA256SUMS.txt`：ZIP校验值；每个包另有逐文件SHA256清单。

完整包解压后，可双击macOS的“离线运行.command”，或执行上述node命令。真实AGH模式需要本机Agnes账号凭据和网络：

```bash
# 在本机通过环境变量提供 AGNES_API_KEY，勿保存进仓库
node scripts/run_agh_real.mjs
node scripts/run_agh_real.mjs --failure
node scripts/run_agh_real.mjs --recovery
```

默认模型：`agnes-ai / agnes-3.0-flash`。临时profile在结束时删除，运行输出存入被Git忽略的 `outputs/`。源码仓库不存放大型运行时；真实模式请使用完整Release包。AGH运行时验收平台为macOS arm64；原生Windows真实Host模式不承诺兼容。

无需真实模型的Host结构测试：`node tests/run_agh_smoke.mjs`，失败分支加 `--failure`。这类记录明确标为local deterministic fixture，不冒充真实模型记录。

## 提供四类定制化路径

[定制化改造指南](docs/customization.md) 和 [项目需求模板](customization/project_profile.template.json) 明确新课题需要哪些输入、修改哪些部分以及如何验收：

| 路径 | 适用需求 | 改造内容 |
| --- | --- | --- |
| A 配置替换 | 相同分析语义，条件名或字段名变化 | 数据路径、条件/指标、字段映射及对应调用参数 |
| B 数据适配 | 文件结构、单位或分组组织不同 | 字段映射、单位换算、本地预处理 |
| C 方向工具包 | 新指标、判据或结论边界 | 专用工具、配置、Skill和测试 |
| D 新计算方法 | 新反应坐标、量化或自由能方法 | 先独立开发并验证方法模块，再接入AGH |

按“研究问题→输入与统计定义→质量门槛→工具与Skill→正常/边界/失败测试→AGH记录”组织定制。当前已验证配置字段映射；C/D为进一步开发指引，不能理解为已经自动支持任意科研方向或计算方法。

## 可核查的运行证据

[证据说明](evidence/README.md) 区分历史真实Agnes执行、本地Host fixture和离线工具检查；保留工具参数、结构化输出、错误、事件顺序和已观察到的模型表述偏差。下载后双击 `evidence/index.html` 可离线展开各次工具调用。

公开记录已替换工作区、用户和会话标识，没有公开原始截图。记录中的历史快照hash属于发布前运行，不能校验经过脱敏修改的公开包；当前文件以manifest.json为准。脱敏导出不用于原始账本签名验证。

## 当前范围与环境

当前处理约定格式的JSON/CSV汇总证据。它不解析任意原始轨迹，不重跑分子模拟，不包含本地模型权重。PMF未应用标准态修正时保留限制；MD区间跨零时输出方向未分辨；SAPT限定为分组插值诊断。工具原文与模型报告同时保存，便于人工复核。

插件 `0.2.0`，配置 `1.0`；AGH commit `57d0c34b33527294042b7ab8a60d7c7c934e932e`；本地测试Node `v24.18.0`。数字采用JavaScript Number（IEEE-754 binary64）；PMF/SAPT单位kcal/mol，MD合成指标单位count。见 [环境说明](docs/reproduce.md) 与 [作品介绍](docs/project-description.md)。

## 来源与许可

项目源码MIT，见 [LICENSE](LICENSE)。[AgnesHarness](https://github.com/AgnesAI-Labs/agnes-harness) 和随包SDK/运行时遵循Apache-2.0及其独立第三方声明，见licenses/和完整运行包的runtime声明。公开版仅调整项目标识及材料名相关解释文本，数值审计逻辑保持不变。
