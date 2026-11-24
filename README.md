# Antigravity 中文汉化补丁 (v4.1)

![Version](https://img.shields.io/badge/版本-v4.1.0-blue)
![Antigravity](https://img.shields.io/badge/适配版本-Antigravity%202.12.x%20~%202.35.0%2B-brightgreen)
![Platform](https://img.shields.io/badge/平台-Windows%2010%2F11-0078D6)
![Dependencies](https://img.shields.io/badge/外部依赖-0%20Dependencies-success)
![Dictionary](https://img.shields.io/badge/词条规模-8320%2B%20精确%20%7C%20725%2B%20动态正则-orange)

面向 [Google Antigravity](https://antigravity.google/) 桌面客户端打造的**模块化、零外部依赖、全自动路径探测、支持零重启实时热汉化与更新自愈**的开源中文汉化补丁。

电脑上**无需安装 Node.js**，下载解压后双击 `install.bat` 即可在 **100 毫秒**内完成内存级极速汉化；无论客户端安装在默认路径、`Program Files` 还是任意自定义盘符（D/E/F 盘），也无论通过何种方式启动或升级客户端，均可开箱即用、稳定生效。

---

## ✨ v4.1 核心亮点

1. **AI 智能体原生术语全面精校 + 插件市场 106 款扩展内部子技能 100% 全覆盖**
   - **地道 Agent 工程化表达**：深度排查并修正生硬机翻与商业错译（例如将智能体上下文中的 `Plan` 修正为 `计划`、设置页配额上下文精准区分 `订阅方案`；`Implementation Plan` 译为 `实施方案`、`Walkthrough` 译为 `执行总结`、`Proceed` 译为 `继续执行`、大模型 `Token` 与身份认证 `令牌` 严格区分，修复 16 处图标选择器名词污染）；
   - **斜杠命令与 `@` 提及芯片零误伤保护**：精准保护对话输入框中的 `/plan`、`/boost`、`/goal`、`/swarm`、`@research` 等交互芯片与命令标识符，彻底杜绝将斜杠命令误翻为中文；
   - **106 款远程市场扩展详情页全汉化**：完整提取并翻译 Google 官方与合作伙伴市场全部 106 款插件包内的 **799+ 条子技能 (`Skills`)、子智能体 (`Agents`)、护栏规则 (`Rules`) 与伴生面板简介**，点开任意插件均实现从顶部概要、推荐提示词到底部子技能列表的全中文呈现。
2. **全面适配 Antigravity 2.35.0+ 全新特性（四大词源无死角覆盖）**
   - 完整覆盖 **设置 → 通用** 全新双界面布局（`知识办公 / Knowledge Work` 与 `软件工程 / Software Engineering`）、权限预设、文件/网络访问规则、输入框发送策略；
   - 完整覆盖 **自定义 → 插件市场** 全部货架分类（`设计、创意与媒体`、`科学研究`、`效率与项目管理`、`云托管与部署`、`开发者工具`、`商业与企业服务` 等）及 `Gemini API`、科学套件等最新插件简介；
   - 完整覆盖 **2.35.0 新增核心子系统**：编排器双模型设置（`Orchestrator` / `Executor`）、思考深度（`Thinking effort`）、电脑操控（`Computer Use`）与实时画面预览、内置浏览器浏览数据与单站点 Cookie 管理、快捷键方案切换（`VS Code` / `AGY`）、语音听写多语言优先级、收件箱分组与自动解决（`Working Section` / `Auto-Resolve`）、插件细粒度权限管理以及远程 SSH 共享主目录接管与断线重连页。
3. **防版本退化翻译引擎**
   - **智能多词大小写不敏感回退索引**：自动免疫官方在 `Title Case` 与 `Sentence case` 之间调整文案风格导致的词条失效，同时严格跳过单词命令标识符；
   - **长描述省略号截断自适应**：自动匹配卡片被截断加 `...` / `…` 的长简介；
   - **严格代码与终端零误伤保护**：自动跳过 Monaco 代码编辑器、Xterm 终端、`<code>`/`<pre>` 代码块、模型名称选择器与斜杠命令芯片，绝不污染代码内容。
4. **跨环境零配置一键安装 + 四通道零重启热汉化与更新自愈**
   - **五级智能安装路径探测**：自动通过 `Windows 注册表 Uninstall 项 -> 运行中进程 -> PATH CLI -> 标准安装目录 -> 图形化文件夹选择框兜底` 精准定位客户端，无论装在哪个盘都能一键识别；
   - **系统目录自动提权 & 纯内存极速 ASAR 引擎**：支持 `Program Files` 自动 UAC 提权，直接在内存中重组二进制流并重算 4MB 分块 SHA256 Integrity；
   - **即装即显 & 更新不失效**：安装时已打开窗口 1 秒内原地热切换为中文；内置动态路径更新自愈服务（`update_runner.vbs` + `auto_heal.vbs`），客户端更新后自动保持中文界面（亦支持 `--no-daemon` 纯静态模式）。

---

## 🚀 快速开始（普通用户只需 2 步）

1. **下载并解压**
   - 前往本仓库 **[Releases 页面](../../releases/latest)** 下载最新 `Antigravity-Chinese-Patch-v4.1.0.zip`（或点击右上角绿色的 `<> Code` → `Download ZIP`），将其**完整解压**到任意文件夹。
   - ⚠️ *注意：请勿直接在压缩包预览窗口内双击运行脚本，必须先解压！*
2. **双击运行 `install.bat`**
   - 看到 **`✓ Antigravity 中文汉化补丁 v4.1.0 安装成功！`** 提示即告完成。
   - 当前已打开的窗口会实时变为中文；在方便时重启一次客户端，顶部系统原生菜单与托盘菜单也会全部变为中文。

### 🧹 如何卸载（恢复官方英文原版）
双击运行文件夹中的 **`uninstall.bat`**，脚本会自动移除更新守护服务并将客户端无损恢复为官方英文原包，重启客户端即可生效。

---

## 📂 项目工程结构

本项目采用**模块化分类词库 + 内存实时编译器**架构，**零第三方 npm 依赖**，既方便普通用户直接运行，也方便社区开发者阅读源码与提交词条 PR：

```text
Antigravity-Chinese-Patch/
├── locales/zh-CN/               # 模块化中文词库（扁平 JSON，按字母序排列）
│   ├── ui-core.json             # 主界面、侧边栏、收件箱、对话流与通用组件
│   ├── settings.json            # 设置中心全模块（双布局、权限、编排器、浏览器、快捷键等）
│   ├── marketplace.json         # 自定义市场货架分类 (Shelves)、插件简介与推荐提示词
│   ├── marketplace-skills.json  # 远程市场全部 106 款扩展内部子技能、子智能体与规则简介
│   ├── skills-agents.json       # 内置技能、子智能体、蜂群 (Swarm)、自动化与引导角色卡片
│   ├── remote-computer.json     # Computer Use 电脑操控、WSL、SSH 远程与通行密钥认证
│   ├── settings-context.json    # 设置界面特定短词上下文映射（如 Plan -> 订阅方案）
│   ├── patterns.js              # 动态正则表达式、跨节点混合语义规则与局部替换表
│   └── main-process.js          # Electron 主进程 dist/*.js 静态替换与原生菜单/弹窗词表
├── src/                       # 核心源码（100% Node.js 标准库实现）
│   ├── cli.js                 # 统一命令行调度入口 (install / uninstall / status / daemon)
│   ├── compiler.js            # 内存级极速词库合并与前端注入载荷编译器 (<30ms)
│   ├── core/                  # 五级路径探测 (detector)、纯内存 ASAR 引擎、CDP 热注入与补丁编排
│   ├── daemon/                # 动态路径 VBS 守护生成、更新代理与软链接被动保护
│   └── runtime/               # 浏览器端高性能 DOM 翻译运行时与 Electron 主进程/Preload 钩子
├── tools/                     # 开发者维护与构建工具
│   ├── extract-all.js         # 四源合一英文提取与覆盖率审计器（含 language_server Mendel 解析）
│   ├── lint-locales.js        # 词库去重、排序、语法与纯 ASCII 脚本静态检查器
│   └── build-release.js       # 最小化纯净 Release 发布包打包与隐私门禁校验工具
├── tests/
│   └── run-tests.js           # 单元测试与架构回归测试套件
├── install.bat                # Windows 一键双击安装入口
└── uninstall.bat              # Windows 一键双击卸载入口
```

---

## 🛠️ 高级命令行与开发者用法

如果您的电脑安装了 Node.js（或直接通过 `install.bat` 透传参数），可使用以下高级功能：

```powershell
# 查看当前客户端版本、汉化状态与守护进程健康体检报告
node src/cli.js status

# 纯静态安装模式（仅注入汉化补丁，不注册后台更新自愈服务）
.\install.bat --no-daemon

# 手动指定非常规位置的 Antigravity 安装目录
.\install.bat --path="D:\CustomApps\Antigravity"

# 纯内存模拟打补丁验证（仅在内存中演练并校验完整性，不修改任何磁盘文件）
.\install.bat --dry-run

# [开发者] 运行词库规范检查与自动化回归测试套件
npm test

# [开发者] 运行四源合一英文词条覆盖率审计（客户端升级新版本后排查新词条）
npm run audit

# [开发者] 编译打包纯净的 GitHub Release 发布压缩包（输出至 dist-release/）
npm run build
```

---

## 🤝 参与贡献

欢迎提交 Issue 反馈新版本中未覆盖的英文界面截图，或直接修改 `locales/zh-CN/*.json` 发起 Pull Request！提交前请运行 `npm test` 确保词库无跨文件重复键且通过全部回归测试。

---

## 📄 开源协议与免责声明

本项目基于 [MIT License](LICENSE) 开源，仅供个人学习与客户端本地化研究交流使用，并非 Google 官方出品。`Google Antigravity` 品牌名称及相关客户端软件归 Google LLC 所有。
