# 复现与环境说明

## 本地运行条件

Node >=24.10；验收 Node v24.18.0、macOS arm64。插件工具层无需 Python、Conda、OpenMM、AmberTools、Psi4、GPU 或原始 MD 轨迹。真实 AGH 脚本使用本地 Unix socket，已在 macOS arm64 验收；Linux 和 WSL2 尚未实测，Windows 原生真实模式不承诺兼容。离线工具层使用跨平台 Node API。

AGH commit：57d0c34b33527294042b7ab8a60d7c7c934e932e；其 version 字段为源码构建的 0.0.0。插件 0.2.0，数据配置 1.0。随包 runtime 是本地分发构建，含平台相关的 macOS helper，真实入口关闭 computerUse。模型不随包；已保存的真实记录使用 agnes-ai / agnes-3.0-flash。

脚本运行的是汇总文件审计，不生成分子模拟。合成 seed=20261013；固定程序输入，无随机训练。数值为 JavaScript Number（IEEE-754 binary64），PMF/SAPT 单位 kcal/mol，MD 演示指标单位 count；力场不适用于合成样例。

## 真实运行过程

脚本创建隔离临时工作区和 AGH_HOME，复制合成证据与 Skill，通过 Agnes config.test 验证账号，固定 Agnes 路由，依次 inspect/install/trust/enable 插件并确认 running/trusted，创建会话并发送审计任务。记录会话 ID、工具名、参数、返回值、错误、提示词和全部非空 assistant 消息，防止短末句覆盖前文报告。无独立 skill_read 时接受 Host 的 [skill loaded] 预加载证据。

failure 模式只在临时副本移除 AI/audit.json；预期 inventory=14/15，SAPT 返回 EVIDENCE_FILE_MISSING。Skill 允许检查其他有效文件，禁止依赖缺失项形成判断。recovery 模式恢复源文件后重新安装插件并运行新会话，不表示已安装快照自动热更新。

请自行在本机注入 AGNES_API_KEY。脚本不读其他项目目录，不自动复用未指定账号。网络请求只为 Agnes 配置验证和本包合成数据的模型任务。可用 AGNES_MODEL 显式指定该账号目录中的其他 Agnes 模型，但复现报告会记录实际模型，行为不保证逐字一致。

## AGH 源码重新构建（可选）

随包运行时无需 npm install。需重新构建时，使用 Git、Corepack 和 pnpm 10.34.5：

```bash
git clone https://github.com/AgnesAI-Labs/agnes-harness.git
cd agnes-harness
git checkout 57d0c34b33527294042b7ab8a60d7c7c934e932e
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @agnes/cli build:local --output-dir /absolute/path/to/new-runtime
# 回到作品目录；AGH_ENTRY 可覆盖随包 Host 入口
AGH_ENTRY=/absolute/path/to/new-runtime/agnes.mjs node scripts/run_agh_real.mjs
```

源码入口：https://github.com/AgnesAI-Labs/agnes-harness/tree/57d0c34b33527294042b7ab8a60d7c7c934e932e 。SDK 打包自相同 commit 的公开 API，未修改上游 SDK 逻辑。

## 常见异常与核查

- node 未找到/版本过旧：安装合适 Node；先运行 node --version。
- AGNES_API_KEY is required：在本机配置凭据，或先验证离线模式。
- Provider 验证失败/模型不可用：检查账号、网络及实际模型目录；不切换成其他厂商冒充 Agnes。
- 缺文件：检查 manifest；恢复源文件后重新装载，新建会话再审计。
- 报告末句过短：查看 *-answer.txt 全部消息。AGH 页面可能折叠中间报告；证据包保留了同一会话请求完整展示的真实记录。

手工展开“evidence/index.html”，以工具原文核对字段、版本、单位、loso/lofo 分组及主张边界。ZIP 与文件级 SHA256 均在提交目录提供。

ZIP 解压若丢失 macOS 辅助程序执行权限，真实入口与 Host fixture 会自动为随包的两个 native helper 恢复执行位。双击脚本受系统打开策略影响时，可直接运行上述 node 命令。
