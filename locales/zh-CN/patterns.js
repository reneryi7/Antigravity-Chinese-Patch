/**
 * Antigravity 中文汉化补丁 v4.0 - 动态正则规则、跨节点混合语义规则与局部替换表
 *
 * 说明：由于部分高级动态规则使用了回调函数（如递归调用 translateString / translateDuration），
 * 本模块接收运行时工具函数并返回编译就绪的规则列表。
 */

'use strict';

function createPatterns(helpers = {}) {
  const translateString = helpers.translateString || ((s) => s);
  const translateDuration = helpers.translateDuration || ((s) => s);

  const REGEX_TRANSLATIONS = [
  // --- 原有核心动态规则（确保 100% 向后兼容） ---
  [/^Description:\s*(.+)$/i, (_, description) => `说明：${translateString(description)}`],
  [/^Available AI Credits:\s*(\d+)$/i, '可用 AI 点数：$1'],
  [/^Refreshes in\s+(.+)$/i, (_, time) => `${translateDuration(time)}后刷新`],
  [/^Resets in\s+(.+)$/i, (_, time) => `${translateDuration(time)}后重置`],
  [/^expires in\s+(.+)$/i, (_, time) => `${translateDuration(time)}后过期`],
  [/^Show\s+(\d+)\s+breakdowns?$/i, '显示 $1 项明细'],
  [/^Thinking for\s+(.+)$/i, (_, time) => `已思考 ${translateDuration(time)}`],
  [/^Thought for\s+(.+)$/i, (_, time) => `已思考 ${translateDuration(time)}`],
  [/^Worked for\s+(.+)$/i, (_, time) => `已工作 ${translateDuration(time)}`],
  [/^Tools\s*\((\d+)\)$/i, '工具（$1）'],
  [/^Tool Calls\s*\((\d+)\)$/i, '工具调用（$1）'],
  [/^Steps\s*\((\d+)\)$/i, '步骤（$1）'],
  [/^Subagents\s*\((\d+)\)$/i, '子智能体（$1）'],
  [/^Child Subagents\s*\((\d+)\)$/i, '子智能体（$1）'],
  [/^Invocations\s*\((\d+)\)$/i, '调用（$1）'],
  [/^Generation Steps\s*\((\d+)\)$/i, '生成步骤（$1）'],
  [/^Message History\s*\((\d+)\)$/i, '消息历史（$1）'],
  [/^Prompt Sections\s*\((\d+)\)$/i, '提示词部分（$1）'],
  [/^System Prompt Sections\s*\((\d+)\)$/i, '系统提示词部分（$1）'],
  [/^Rules\s*\(([^)]+)\)\s*(\d+)$/i, '规则（$1）$2'],
  [/^Skills\s*\(([^)]+)\)\s*(\d+)$/i, '技能（$1）$2'],
  [/^Rules:\s*(\d+)\s+tokens?$/i, '规则：$1 个令牌'],
  [/^Skills:\s*(\d+)\s+tokens?$/i, '技能：$1 个令牌'],
  [/^Your Plan:\s*(.+)$/i, '当前套餐：$1'],
  [/^([\d,]+)\s+tokens?\)$/i, '$1 个令牌）'],
  [/^([\d,]+)\s+tokens? total\)$/i, '共 $1 个令牌）'],
  [/^(Rules|Skills|Subagents|Mcp Tools):\s*([\d,]+)\s+tokens?$/i, (_, category, count) => `${translateString(category)}：${count} 个令牌`],
  [/^(\d+)\s+tools?\s+(enabled|disabled)$/i, (_, count, state) => `${count} 个工具${state.toLowerCase() === 'enabled' ? '已启用' : '已禁用'}`],
  [/^Toggle\s+(.+)$/i, (_, target) => `切换 ${translateString(target) || target}`],
  [/^Scheduled task\s+"(.+)"$/i, '定时任务“$1”'],
  [/^No MCP servers found for\s+"(.+)"$/i, '未找到“$1”的 MCP 服务器'],
  [/^([\d.]+)% of the customization budget is available\.?$/i, '自定义预算剩余 $1%。'],
  [/^You have used some of your weekly limit, it will fully refresh in (.+)\.$/i, (_, time) => `您的每周限额已使用一部分，将在 ${translateDuration(time)}后完全刷新。`],
  [/^You have used some of your 5-hour limit, it will fully refresh in (.+)\.$/i, (_, time) => `您的五小时限额已使用一部分，将在 ${translateDuration(time)}后完全刷新。`],
  [/^Send feedback as\s+(.+)$/i, '使用 $1 发送反馈'],
  [/^Plugin:\s*(.+)$/i, '插件：$1'],
  [/^See all\s*\((\d+)\)$/i, '查看全部（$1）'],
  [/^Select model, current:\s*(.+)$/i, '选择模型，当前：$1'],
  [/^Select project, current:\s*(.+)$/i, '选择项目，当前：$1'],
  [/^Select workspace, current:\s*(.+)$/i, (_, ws) => `选择工作区，当前：${translateString(ws) || ws}`],
  [/^Select modes, current:\s*(.+)$/i, '选择模式，当前：$1'],
  [/^Select harnesses, current:\s*(.+)$/i, '选择运行环境，当前：$1'],
  [/^Ran\s+(\d+)\s+background\s+commands?$/i, '已运行 $1 个后台命令'],
  [/^Running\s+(\d+)\s+background\s+commands?\.{0,3}$/i, '正在运行 $1 个后台命令...'],
  [/^Ran\s+(\d+)\s+commands?$/i, '已运行 $1 个命令'],
  [/^Running\s+(\d+)\s+commands?\.{0,3}$/i, '正在运行 $1 个命令...'],
  [/^Ran\s+(.+)$/i, '已运行 $1'],
  [/^Searched\s+(.+)$/i, '已搜索 $1'],
  [/^Analyzed\s+(.+)$/i, '已分析 $1'],
  [/^Explored\s+(\d+)\s+files?,\s*(\d+)\s+search(?:es)?$/i, '已探索 $1 个文件，$2 次搜索'],
  [/^Explored\s+(\d+)\s+files?$/i, '已探索 $1 个文件'],
  [/^Explored\s+(\d+)\s+searches?$/i, '已探索 $1 次搜索'],
  [/^Exploring\s+(\d+)\s+files?,\s*(\d+)\s+search(?:es)?$/i, '正在探索 $1 个文件，$2 次搜索'],
  [/^Exploring\s+(\d+)\s+files?$/i, '正在探索 $1 个文件'],
  [/^Exploring\s+(\d+)\s+searches?$/i, '正在探索 $1 次搜索'],
  [/^Modified in\s+(\d+)\s+projects?$/i, '已在 $1 个项目中修改'],
  [/^Permanently delete (.+) including (\d+) active conversations? and (\d+) archived conversations?\.$/i, '永久删除 $1，包括 $2 个活跃对话和 $3 个已归档对话。'],
  [/^(\d+)(mo|m|h|d|w|y)$/i, (_, count, unit) => `${count}${({ m: '分钟', h: '小时', d: '天', w: '周', mo: '个月', y: '年' })[unit.toLowerCase()]}`],
  [/^(.+)\s+command-line tool\.?$/i, '$1 命令行工具。'],

  // --- Antigravity 2.22.0 新增高频动态模板规则 ---
  [/^(Reading|Read) terminal:$/i, (_, state) => state.toLowerCase() === 'reading' ? '正在读取终端：' : '已读取终端：'],
  [/^(\d+)\s+Background Process(?:es)? Running$/i, '$1 个后台进程正在运行'],
  [/^(\d+)\s+attachments?$|^(\d+)\s+attachment\(s\)$/i, (_, a, b) => `${a || b} 个附件`],
  [/^(\d+)\s+audio attachments?$/i, '$1 个音频附件'],
  [/^(\d+)\s+image attachments?$/i, '$1 个图片附件'],
  [/^(\d+)\s+video attachments?$/i, '$1 个视频附件'],
  [/^(\d+)\s+comments? in (.+)$/i, '$2 中有 $1 条评论'],
  [/^(\d+)\s+comments?$/i, '$1 条评论'],
  [/^(\d+)\s+unresolved$/i, '$1 项未解决'],
  [/^(Failed to execute|Executing|Executed) notebook( cells)?$/i, (_, st, cells) => {
    const map = { 'failed to execute': '执行失败：', 'executing': '正在执行', 'executed': '已执行' };
    return `${map[st.toLowerCase()] || st}笔记本${cells ? '单元格' : ''}`;
  }],
  [/^(\d+)\s+questions?$/i, '$1 个问题'],
  [/^Question\s+(\d+)\s+of\s+(\d+)$/i, '第 $1 / $2 个问题'],
  [/^(\d+)\s+Side Questions?$/i, '$1 个旁路提问'],
  [/^View\s+(\d+)\s+side questions?$/i, '查看 $1 个旁路提问'],
  [/^Side Question:\s*(.+)$/i, '旁路提问：$1'],
  [/^Side question failed:\s*(.+)$/i, '旁路提问失败：$1'],
  [/^(.+)\s+Queues after the turn$/i, '$1 在当前轮次结束后排队发送'],
  [/^(.+)\s+Sends immediately$/i, '$1 立即发送'],
  [/^(\d+)\s+Files? With Changes$/i, '$1 个文件有更改'],
  [/^(\d+)\s+files? changed$/i, '$1 个文件已更改'],
  [/^(\d+)\s+active modes?$/i, '$1 个活动模式'],
  [/^(\d+)\s+subagents? blocked$/i, '$1 个子智能体受阻'],
  [/^(\d+)\s+blocked$/i, '$1 项受阻'],
  [/^(\d+)\s+(subagents\/tasks|subagents?|tasks?)\s+running$/i, (_, n, kind) => {
    const k = kind.toLowerCase();
    const label = k === 'subagents/tasks' ? '子智能体/任务' : k.startsWith('subagent') ? '子智能体' : '任务';
    return `${n} 个${label}运行中`;
  }],
  [/^(\d+|No)\s+agents?\s+running$/i, (_, n) => n.toLowerCase() === 'no' ? '无智能体运行' : `${n} 个智能体运行中`],
  [/^Artifacts\s*\((\d+)\s+Files? for Conversation\)$/i, '产物（当前对话共 $1 个文件）'],
  [/^Agent needs permission to act on\s+(.+)$/i, '智能体需要权限才能操作 $1'],
  [/^Agent needs permission to execute JavaScript on\s+(.+)$/i, '智能体需要权限才能在 $1 上执行 JavaScript'],
  [/^Requesting permission to\s+(.+)$/i, '正在请求权限以 $1'],
  [/^Requires manual confirmation:\s*(.+)$/i, '需要手动确认：$1'],
  [/^Allow\s+(.+)\?$/i, '允许 $1 吗？'],
  [/^Save rule to always allow\s+(.+)\?$/i, '保存规则以始终允许 $1 吗？'],
  [/^Yes, and always allow '(.+)' in this (conversation|workspace|project)$/i, (_, target, scope) => `是，并在此${({ conversation: '对话', workspace: '工作区', project: '项目' })[scope.toLowerCase()]}中始终允许 '${target}'`],
  [/^Yes, and always allow '(.+)' when not in a project$/i, "是，并在未处于项目中时始终允许 '$1'"],
  [/^Yes, and always allow '(.+)'$/i, "是，并始终允许 '$1'"],
  [/^Yes, save rule for '(.+)' (globally|in this conversation|in this workspace|in this project|when not in a project)$/i, (_, target, scope) => {
    const smap = {
      'globally': '全局',
      'in this conversation': '在此对话中',
      'in this workspace': '在此工作区中',
      'in this project': '在此项目中',
      'when not in a project': '在未处于项目中时',
    };
    return `是，${smap[scope.toLowerCase()] || scope}为 '${target}' 保存规则`;
  }],
  [/^Are you sure you want to delete the hook "(.+)"\?$/i, '确定要删除钩子 (Hook) “$1”吗？'],
  [/^Browser task:\s*"(.+)"$/i, '浏览器任务：“$1”'],
  [/^Generated image:\s*"(.+)"$/i, '已生成图片：“$1”'],
  [/^Internal search:\s*"(.+)"$/i, '内部搜索：“$1”'],
  [/^Invoked subagent:\s*(.+)$/i, '已调用子智能体：$1'],
  [/^Listed directory\s+(.+)$/i, '已列出目录 $1'],
  [/^Opened browser:\s*(.+)$/i, '已打开浏览器：$1'],
  [/^Opens external link:\s*(.+)$/i, '打开外部链接：$1'],
  [/^Open URL in system browser:\s*(.+)$/i, '在系统浏览器中打开网址：$1'],
  [/^Read URL:\s*(.+)$/i, '已读取网址：$1'],
  [/^Typed '(.+)' in Browser$/i, "已在浏览器中输入 '$1'"],
  [/^Typing '(.+)' in Browser$/i, "正在浏览器中输入 '$1'"],
  [/^Used MCP tool:\s*(.+)$/i, '已使用 MCP 工具：$1'],
  [/^Used tool:\s*(.+)$/i, '已使用工具：$1'],
  [/^Waiting for command completion \(up to (\d+) seconds\)$/i, '正在等待命令完成（最多 $1 秒）'],
  [/^Working directory:\s*(.+)$/i, '工作目录：$1'],
  [/^Process exited with code (\d+)\.?$/i, '进程已退出，退出码：$1。'],
  [/^Terminal process (.+) exited with non-zero code (\d+)$/i, '终端进程 $1 以非零代码 $2 退出'],
  [/^Proceed with implementation plan and (\d+) comments?$/i, '带着 $1 条评论继续执行实施计划'],
  [/^Publish (.+) to origin$/i, '将 $1 发布到远程 (origin)'],
  [/^Published (.+) to origin\.?$/i, '已将 $1 发布到远程 (origin)。'],
  [/^Push (\d+) commits? to (.+)$/i, '将 $1 个提交推送到 $2'],
  [/^Pushed (\d+) commits? to (.+)\.?$/i, '已将 $1 个提交推送到 $2。'],
  [/^Pushed to (.+)\.?$/i, '已推送到 $1。'],
  [/^Amended commit on (.+)\.?$/i, '已在 $1 上修正提交 (Amend)。'],
  [/^Fold lines (\d+)-(\d+)$/i, '折叠第 $1-$2 行'],
  [/^Unfold lines (\d+)-(\d+)$/i, '展开第 $1-$2 行'],
  [/^Load (\d+) (earlier|later) steps$/i, (_, n, dir) => `加载${dir.toLowerCase() === 'earlier' ? '更早的' : '后续'} ${n} 个步骤`],
  [/^Load older messages, showing (\d+) of (\d+)$/i, '加载更早的消息（当前显示 $1 / $2）'],
  [/^Model unavailable, retrying in (\d+)s(.*)$/i, '模型暂不可用，$1 秒后重试$2'],
  [/^Open (.+) skill$/i, '打开 $1 技能'],
  [/^Open the (.+) plugin$/i, '打开 $1 插件'],
  [/^Open conversation (.+)$/i, '打开对话 $1'],
  [/^Send all \((\d+)\)$/i, '全部发送（$1）'],
  [/^Send now:\s*(.+)$/i, '立即发送：$1'],
  [/^(Sending|Sent|Rejected sending|Suggested sending) (.+) to command$/i, (_, act, val) => {
    const amap = {
      'sending': '正在向命令发送',
      'sent': '已向命令发送',
      'rejected sending': '已拒绝向命令发送',
      'suggested sending': '建议向命令发送'
    };
    return `${amap[act.toLowerCase()]} ${val}`;
  }],
  [/^View Diff for (.+)$/i, '查看 $1 的差异对比 (Diff)'],
  [/^Version\s+([\d.]+.*)$/i, '版本 $1'],
  [/^Today\s+(.+)$/i, '今天 $1'],
  [/^Yesterday\s+(.+)$/i, '昨天 $1'],
  [/^today at\s+(.+)$/i, '今天 $1'],
  [/^tomorrow at\s+(.+)$/i, '明天 $1'],
  [/^Setting up WSL:\s*(.+)$/i, '正在配置 WSL：$1'],
  [/^Installing into\s+(.+)…$/i, '正在安装到 $1…'],
  // --- Antigravity 2.23.0 新增动态模板规则 ---
  [/^(\d+)\s+folders? in this project could not be loaded because their locations are invalid\.$/i, '此项目中有 $1 个文件夹因位置无效而无法加载。'],
  [/^(\d+)\s+customizations? failed to load$/i, '$1 项自定义扩展加载失败'],
  [/^\+(\d+)\s+more\s*\(Show all\)$/i, '+$1 项更多（显示全部）'],
  [/^Adding plugins from\s+(.+)$/i, '正在从 $1 添加插件'],
  [/^Authorization code for\s+(.+)$/i, '$1 的授权码'],
  [/^Automatically create a new\s+(.+)\s+workspace when the conversation starts$/i, '对话开始时自动新建 $1 工作区'],
  [/^Code search:\s*"(.+)"$/i, '代码搜索：“$1”'],
  [/^Committed to\s+(.+)\.$/i, '已提交至 $1。'],
  [/^Compare responses from\s+(\d+)\s+models side-by-side to find the best result\.$/i, '并排对比 $1 个模型的回答以选出最佳结果。'],
  [/^Could not attach folder\s+"(.+)":\s*(.+)$/i, '无法附加文件夹“$1”：$2'],
  [/^Could not open folder:\s*(.+)$/i, '无法打开文件夹：$1'],
  [/^Could not read\s+(.+)\.$/i, '无法读取 $1。'],
  [/^Creating workspace\s+"(.+)"\.{3}$/i, '正在创建工作区“$1”...'],
  [/^Edit comment:\s*(.+)$/i, '编辑评论：$1'],
  [/^Enlarged media:\s*(.+)$/i, '放大媒体：$1'],
  [/^Error deleting MCP server:\s*(.+)$/i, '删除 MCP 服务出错：$1'],
  [/^Error disconnecting MCP server:\s*(.+)$/i, '断开 MCP 服务连接出错：$1'],
  [/^Error installing MCP server:\s*(.+)$/i, '安装 MCP 服务出错：$1'],
  [/^Error restarting MCP server:\s*(.+)$/i, '重启 MCP 服务出错：$1'],
  [/^Error restarting\s+(.+):\s*(.+)$/i, '重启 $1 出错：$2'],
  [/^Error submitting auth code:\s*(.+)$/i, '提交授权码出错：$1'],
  [/^Error toggling MCP server:\s*(.+)$/i, '切换 MCP 服务状态出错：$1'],
  [/^Error toggling tool:\s*(.+)$/i, '切换工具状态出错：$1'],
  [/^Exited with code\s+(\d+)\.$/i, '已退出，退出码：$1。'],
  [/^Failed to compress image to fit within\s+([\d.]+)MB$/i, '无法将图片压缩至 $1MB 以内'],
  [/^Failed to create project:\s*(.+)$/i, '创建项目失败：$1'],
  [/^Failed to fetch directory contents:\s*(.+)$/i, '获取目录内容失败：$1'],
  [/^Failed to resolve folder:\s*(.+)$/i, '解析文件夹失败：$1'],
  [/^Failed to save configuration:\s*(.+)$/i, '保存配置失败：$1'],
  [/^Failed to save project branch:\s*(.+)$/i, '保存项目分支失败：$1'],
  [/^Failed to save project permissions:\s*(.+)$/i, '保存项目权限失败：$1'],
  [/^Failed to save project settings:\s*(.+)$/i, '保存项目设置失败：$1'],
  [/^Failed to save project:\s*(.+)$/i, '保存项目失败：$1'],
  [/^Failed to save settings:\s*(.+)$/i, '保存设置失败：$1'],
  [/^Failed to start\s+"(.+)"\.$/i, '启动“$1”失败。'],
  [/^Failed to update\s+"(.+)"$/i, '更新“$1”失败'],
  [/^Filter skills and rules:\s*(.+)$/i, '筛选技能与规则：$1'],
  [/^Fix with Agent:\s*(.+)$/i, '使用智能体修复：$1'],
  [/^Forked from\s+(.+)$/i, '分叉 (Fork) 自 $1'],
  [/^Further action is required to use\s+(.+)$/i, '需要执行进一步操作才能使用 $1'],
  [/^Install folder\s+"(.+)"\s+is already in use$/i, '安装文件夹“$1”已被占用'],
  [/^MCP server\s+"(.+)"\s+does not have a remote configuration\.$/i, 'MCP 服务“$1”没有远程配置。'],
  [/^MCP server\s+"(.+)"\s+does not have a supported configuration\.$/i, 'MCP 服务“$1”没有受支持的配置。'],
  [/^MCP server\s+"(.+)"\s+does not have any installation commands\.$/i, 'MCP 服务“$1”没有任何安装命令。'],
  [/^MCP server\s+"(.+)"\s+not found in the store\.$/i, '在商店中未找到 MCP 服务“$1”。'],
  [/^No installation command found for MCP server\s+"(.+)"\.$/i, '未找到 MCP 服务“$1”的安装命令。'],
  [/^Server\s+"(.+)"\s+not found in config$/i, '在配置中未找到服务“$1”'],
  [/^Marked\s+(\d+)\s+conversations? as read$/i, '已将 $1 个对话标记为已读'],
  [/^Move to Group:\s*(.+)$/i, '移动到分组：$1'],
  [/^No more older messages, showing\s+(\d+)\s+of\s+(\d+)$/i, '没有更早的消息了（当前显示 $1 / $2）'],
  [/^No plugins found for\s+"(.+)"\.$/i, '未找到与“$1”相关的插件。'],
  [/^Open Subagent:\s*(.+)$/i, '打开子智能体：$1'],
  [/^Playback speed\s+([\d.]+)x$/i, '播放速度 $1 倍'],
  [/^Please fill in all required fields:\s*(.+)$/i, '请填写所有必填字段：$1'],
  [/^Recording exceeds 15MB limit\s*\(([\d.]+)MB\)$/i, '录音超出 15MB 限制（当前 $1MB）'],
  [/^Reset\s+(\d+)\s+overrides?$/i, '重置 $1 项覆盖设置'],
  [/^Search for\s+"(.+)"\s+in the Marketplace$/i, '在插件市场中搜索“$1”'],
  [/^Secret for a new\s+(.+)\s+account$/i, '新 $1 账户的密钥'],
  [/^Secret for\s+(.+)$/i, '$1 的密钥'],
  [/^See\s+(\d+)\s+more$/i, '查看另外 $1 项'],
  [/^See\s+(\d+)\s+more\s+(.+)$/i, '查看另外 $1 项 $2'],
  [/^Select\s+(.+)\s+Theme$/i, '选择 $1 主题'],
  [/^Select at least\s+(\d+)\s+items$/i, '请至少选择 $1 项'],
  [/^Select at most\s+(\d+)\s+items$/i, '最多只能选择 $1 项'],
  [/^Select model with\s+(.+)$/i, '选择模型 ($1)'],
  [/^Sign in to use\s+(.+)!$/i, '登录以使用 $1！'],
  [/^Sorry, this account is ineligible to use\s+(.+)$/i, '抱歉，此账户无权使用 $1'],
  [/^Total media size exceeds\s+(\d+)MB limit$/i, '媒体文件总大小超出 $1MB 限制'],
  [/^User uploaded media\s+(\d+)$/i, '用户上传的媒体 $1'],
  [/^Work in\s+(.+)$/i, '在 $1 中工作'],
  [/^Work locally on\s+(.+)$/i, '在本地处理 $1'],
  [/^Worktree from\s+(.+)$/i, '来自 $1 的工作树'],
  [/^Zoom\s+(\d+)%,\s*reset to fit$/i, '缩放 $1%，点击重置为合适大小'],
  // --- Antigravity 2.25.0 新增动态模板规则 ---
  [/^Conflicts with your configured Ask permission:\s*(.+)$/i, '与您配置的“询问”权限冲突：$1'],
  [/^For\s+(.+),\s*telemetry is force disabled\.$/i, '对于 $1，遥测已被强制禁用。'],
  [/^Credentials expire in\s+(.+)\.\s*Refresh credentials to keep this automation running\.?$/i, (_, t) => `凭据将在 ${translateDuration(t)}后过期。请刷新凭据以保持此自动化任务运行。`],
  [/^Created automation\s+"(.+)"\.?$/i, '已创建自动化任务“$1”。'],
  [/^Couldn't load cloud plugins:\s*(.+)$/i, '无法加载云端插件：$1'],
  [/^No cloud plugins found for\s+"(.+)"\.?$/i, '未找到与“$1”相关的云端插件。'],
  [/^Make\s+(.+)\s+the default\s+(.+)\s+account$/i, '将 $1 设为默认 $2 账户'],
  [/^Managed by the\s+(.+)\s+(automation|plugin)$/i, (_, name, kind) => `由 ${name} ${kind.toLowerCase() === 'automation' ? '自动化任务' : '插件'}管理`],
  [/^MCP server\s+(.+)\s+requires authentication:\s*sign in to\s+"(.+)"\s+in the Accounts section of plugin\s+"(.+)"$/i, 'MCP 服务 $1 需要身份验证：请在插件“$3”的“账户”部分登录“$2”'],
  [/^MCP server\s+(.+)\s+requires authentication$/i, 'MCP 服务 $1 需要身份验证'],
  [/^Message queued\.\s*(\d+)\s+messages? in queue\.$/i, '消息已加入队列（当前队列中有 $1 条消息）。'],
  [/^Remount workspace\s+(.+)$/i, '重新挂载工作区 $1'],
  [/^Remounted workspace\s+(.+)$/i, '已重新挂载工作区 $1'],
  [/^Unmount workspace\s+(.+)$/i, '卸载工作区 $1'],
  [/^Unmounted workspace\s+(.+)$/i, '已卸载工作区 $1'],
  [/^Delete workspace\s+(.+)$/i, '删除工作区 $1'],
  [/^Deleted workspace\s+(.+)$/i, '已删除工作区 $1'],
  [/^Yes, and always allow\s+(in this project|when not in a project|in this conversation|in this workspace)$/i, (_, s) => `是，并${({ 'in this project': '在此项目中', 'when not in a project': '在未处于项目中时', 'in this conversation': '在此对话中', 'in this workspace': '在此工作区中' })[s.toLowerCase()] || s}始终允许`],
  [/^Yes, save rule\s+(in this project|when not in a project|in this conversation|in this workspace|globally)$/i, (_, s) => `是，${({ 'in this project': '在此项目中', 'when not in a project': '在未处于项目中时', 'in this conversation': '在此对话中', 'in this workspace': '在此工作区中', 'globally': '全局' })[s.toLowerCase()] || s}保存规则`],
  [/^Turn\s+(\d+)\s+of\s+(\d+)$/i, '第 $1 / $2 轮'],
  [/^Go to slide\s+(\d+)$/i, '前往第 $1 张幻灯片'],
  [/^Go to page\s+(\d+)$/i, '前往第 $1 页'],
  [/^Use custom repository:\s*"(.+)"$/i, '使用自定义代码仓库：“$1”'],
  [/^Valid until\s+(.+)$/i, '有效期至 $1'],
  [/^Failed to update rule:\s*(.+)$/i, '更新规则失败：$1'],
  // --- Antigravity 2.29.0 新增动态模板规则 ---
  [/^(.+) download progress$/i, '$1 下载进度'],
  [/^(\d+) matching bundles?$/i, '$1 个匹配的扩展包'],
  [/^(.+) needs you to sign in before it can be used\.$/i, '$1 需要您先登录才能使用。'],
  [/^(\d+) lines? added, (\d+) lines? removed$/i, '新增 $1 行，删除 $2 行'],
  [/^(.+) installed$/i, '$1 已安装'],
  [/^(\d+) browser steps?$/i, '$1 个浏览器步骤'],
  [/^(.+) on this computer$/i, '在此电脑上的 $1'],
  [/^(.+) could not find the requested page\.$/i, '$1 找不到所请求的页面。'],
  [/^(.+) is currently unable to handle this request\.$/i, '$1 当前无法处理此请求。'],
  [/^(.+) refused to connect\.$/i, '$1 拒绝了连接请求。'],
  [/^(.+) took too long to respond\.$/i, '$1 响应时间过长。'],
  [/^(Skill|Plugin) installed:\s*(.+)$/i, (_, k, name) => `${k.toLowerCase() === 'skill' ? '技能' : '插件'}已安装：${name}`],
  [/^(\d+) accounts?$/i, '$1 个账户'],
  [/^(\d+) turns?$/i, '$1 轮对话'],
  [/^Account this MCP server uses:\s*(.+)$/i, '此 MCP 服务器使用的账户：$1'],
  [/^Add (\d+) plugins? from (.+)$/i, '从 $2 添加 $1 个插件'],
  [/^Add shortcut for (.+)$/i, '为 $1 添加快捷键'],
  [/^Agent finished:\s*(.+)$/i, '智能体已完成：$1'],
  [/^Agent permissions preset:\s*(.+)$/i, '智能体权限预设：$1'],
  [/^An embedded page at (.+) says$/i, '位于 $1 的嵌入页面显示'],
  [/^Cancel Questionnaire and Stop the Agent\s*\((.+)\)$/i, '取消问卷并停止智能体 ($1)'],
  [/^Check if there is a typo in (.+), or open the page in your external browser\.$/i, '请检查 $1 是否有拼写错误，或在外部浏览器中打开该页面。'],
  [/^Choose (Antigravity|Jetski)'s Voice$/i, '选择 $1 的语音音色'],
  [/^Comment\s*\((\d+)\)$/i, '评论 ($1)'],
  [/^Comments\s*\((\d+)\)$/i, '评论 ($1)'],
  [/^Comment on page (\d+)$/i, '第 $1 页上的评论'],
  [/^Context window (\d+)% full$/i, '上下文窗口已使用 $1%'],
  [/^Context window about (\d+)% full, compacted since the last response$/i, '上下文窗口已使用约 $1%（自上次回复后已压缩）'],
  [/^Cost summary:\s*(.+)$/i, '费用汇总：$1'],
  [/^Could not apply the selected permissions:\s*(.+)$/i, '无法应用所选权限：$1'],
  [/^Could not attach image:\s*(.+)$/i, '无法附加图片：$1'],
  [/^Couldn't load apps:\s*(.+)$/i, '无法加载应用：$1'],
  [/^Couldn't save base branch:\s*(.+)$/i, '无法保存基准分支：$1'],
  [/^Couldn't switch to (.+):\s*(.+)$/i, '无法切换到 $1：$2'],
  [/^Daily at (.+)$/i, '每天 $1'],
  [/^Details for (.+)$/i, '$1 的详情'],
  [/^Downloads, (\d+)% complete$/i, '下载中，已完成 $1%'],
  [/^Edit side question title:\s*(.+)$/i, '编辑旁路问题标题：$1'],
  [/^Environment paused\. Click to resume it and load the (.+)\.$/i, '环境已暂停。点击以恢复环境并加载 $1。'],
  [/^Environment:\s*(.+)$/i, '环境：$1'],
  [/^Failed to delete recordings:\s*(.+)$/i, '删除录音失败：$1'],
  [/^Failed to open workspace:\s*(.+)$/i, '打开工作区失败：$1'],
  [/^Failed to save cloud permission settings:\s*(.+)$/i, '保存云端权限设置失败：$1'],
  [/^File exceeds the 20MB display limit\s*\((\d+)MB\)\.$/i, '文件超出 20MB 显示限制（当前 $1MB）。'],
  [/^For (.+), this setting is disabled\.$/i, '对于 $1，此设置已禁用。'],
  [/^GitHub token validation failed\s*\(status (\d+)\)\.$/i, 'GitHub 令牌验证失败（状态码 $1）。'],
  [/^Go to turn (\d+) of (\d+)$/i, '跳转到第 $1 / $2 轮'],
  [/^Hi (.+), what can we get done today\?$/i, '您好 $1，今天我们能一起完成些什么？'],
  [/^Not referenced by any feature\s*\((\d+)\)$/i, '未被任何功能引用 ($1)'],
  [/^Show more\s*\((\d+)\)$/i, '显示更多 ($1)'],
  [/^Show submitted\s*\((\d+)\)$/i, '显示已提交 ($1)'],
  [/^Start Best-of-(\d+)$/i, '启动 $1 选 1 (Best-of-$1)'],
  [/^Best of N\s*\((.+)\)$/i, '优选对比 ($1)'],
  [/^Task "(.+)" not found\.$/i, '未找到任务“$1”。'],
  [/^Select all in (.+)$/i, '在 $1 中全选'],
  [/^Started (during|from) “(.+)”(\. Show in main conversation)?$/i, (_, mode, title, suffix) => `${mode.toLowerCase() === 'during' ? '发起于“' + title + '”执行期间' : '发起自“' + title + '”'}${suffix ? '。在主对话中显示' : ''}`],
  [/^Started (during|from) the main conversation(\. Show in main conversation)?$/i, (_, mode, suffix) => `${mode.toLowerCase() === 'during' ? '发起于主对话执行期间' : '发起自主对话'}${suffix ? '。在主对话中显示' : ''}`],
  [/^Recording shortcut for (.+)\. Press keys to bind, Enter to save, Escape to cancel\.$/i, '正在为 $1 录制快捷键。请按键绑定，按 Enter 保存，按 Escape 取消。'],
  [/^Remove (.+) from list$/i, '将 $1 从列表中移除'],
  [/^Remove shortcut (.+) for (.+)$/i, '移除 $2 的快捷键 $1'],
  [/^Shortcut (.+) for (.+)$/i, '$2 的快捷键 $1'],
  [/^Reset (.+) to default$/i, '将 $1 重置为默认值'],
  [/^Run (.+) now$/i, '立即运行 $1'],
  [/^Running for (.+)$/i, (_, t) => `已运行 ${translateDuration(t)}`],
  [/^Show (.+) in folder$/i, '在文件夹中显示 $1'],
  [/^Show (\d+) more subagents?$/i, '显示另外 $1 个子智能体'],
  [/^Show (\d+) earlier steps?$/i, '显示更早的 $1 个步骤'],
  [/^Sign in from the (.+) panel\.$/i, '请从 $1 面板登录。'],
  [/^Sign in to (.+) on this computer$/i, '在此电脑上登录 $1'],
  [/^Sign in to (.+) remotely$/i, '远程登录 $1'],
  [/^Sign in to (.+)$/i, '登录到 $1'],
  [/^Signed in:\s*(.+)$/i, '已登录：$1'],
  [/^Sort and filter conversations\s*\((\d+) active\)$/i, '排序并筛选对话（$1 个活跃）'],
  [/^Still thinking, (\d+) seconds?$/i, '仍在思考中，已用时 $1 秒'],
  [/^Stop (\d+) selected$/i, '停止所选的 $1 项'],
  [/^Switch environment\s*\((.+)\)$/i, '切换环境 ($1)'],
  [/^System default\s*\((.+)\)$/i, '系统默认 ($1)'],
  [/^The certificate was rejected\s*\((.+)\)\.$/i, '证书被拒绝 ($1)。'],
  [/^Tomorrow (.+)$/i, '明天 $1'],
  [/^Triggered (.+)$/i, '已触发 $1'],
  [/^Turn (\d+)$/i, '第 $1 轮'],
  [/^Using browser\s*\((\d+)s\)$/i, '正在使用浏览器 ($1 秒)'],
  [/^Voice speed,\s*(.+)$/i, '语速：$1'],
  [/^Where the agent runs, current:\s*(.+)$/i, '智能体运行位置，当前：$1'],
  [/^Yes, allow (.+) in this conversation$/i, '是，在此对话中允许 $1'],
  [/^Yes, always allow (.+)$/i, '是，始终允许 $1'],
  [/^Your quota for (.+) has been reached\. Switch to another available model to continue\.$/i, '您的 $1 额度已用尽。请切换到其他可用模型以继续。'],
  [/^Your quota for (.+) will reset on (.+)\. Switch to another available model to continue\.$/i, '您的 $1 额度将于 $2 重置。请切换到其他可用模型以继续。'],

  // --- Antigravity 2.31.0 新增动态模板规则 ---
  [/^Welcome to\s+(.+?)\.\s*I coordinate across the conversations in this project—keeping track of what's in flight, what's decided, and how the pieces fit together\.$/i, '欢迎来到 $1。我负责统筹协调此项目中的所有对话——跟踪进行中的任务、已确定的决策，以及各个部分如何协同配合。'],
  [/^I coordinate across the conversations in this project—keeping track of what's in flight, what's decided, and how the pieces fit together\.$/i, '我负责统筹协调此项目中的所有对话——跟踪进行中的任务、已确定的决策，以及各个部分如何协同配合。'],
  [/^You can follow the conversations I create in the sidebar, and jump in anytime to steer them directly or talk to me here\.$/i, '您可以在侧边栏中跟进我创建的对话，并随时介入直接引导，或在此处与我交流。'],
  [/^Ask (.+) coordinator anything\.\.\.$/i, '向 $1 协调器提问任何问题...'],
  [/^Message (.+) coordinator\.\.\.$/i, '给 $1 协调器发消息...'],
  [/^Pinned\s*\((\d+)\)$/i, '已置顶 ($1)'],
  [/^Needs Attention\s*\((\d+)\)$/i, '需要关注 ($1)'],
  [/^Running\s*\((\d+)\)$/i, '运行中 ($1)'],
  [/^Current week\s*\((\d+)\)$/i, '本周 ($1)'],
  [/^Last week\s*\((\d+)\)$/i, '上周 ($1)'],
  [/^Earlier\s*\((\d+)\)$/i, '更早 ($1)'],
  [/^(\d+)\s+pinned conversations?$/i, '$1 个已置顶对话'],
  [/^(\d+)\s+conversations? running$/i, '$1 个对话运行中'],
  [/^(\d+)\s+conversations? need(?:s)? attention$/i, '$1 个对话需要关注'],
  [/^(\d+)\s+queued messages?$/i, '$1 条排队消息'],
  [/^(\d+)\s+staged changes?$/i, '$1 项已暂存更改'],
  [/^(\d+)\s+unstaged changes?$/i, '$1 项未暂存更改'],
  [/^(\d+)\s+untracked files?$/i, '$1 个未跟踪文件'],
  [/^(\d+)\s+conflicted files?$/i, '$1 个冲突文件'],
  [/^(\d+)\s+commits? ahead$/i, '领先 $1 个提交'],
  [/^(\d+)\s+commits? behind$/i, '落后 $1 个提交'],
  [/^(\d+)\s+ahead,\s*(\d+)\s+behind$/i, '领先 $1 个，落后 $2 个'],
  [/^Switched to branch\s+['"]?(.+?)['"]?$/i, '已切换到分支 $1'],
  [/^Created branch\s+['"]?(.+?)['"]?$/i, '已创建分支 $1'],
  [/^Deleted branch\s+['"]?(.+?)['"]?$/i, '已删除分支 $1'],
  [/^Discard changes to\s+(.+)\?$/i, '放弃对 $1 的更改吗？'],
  [/^Stage\s+(\d+)\s+files?$/i, '暂存 $1 个文件'],
  [/^Unstage\s+(\d+)\s+files?$/i, '取消暂存 $1 个文件'],
  [/^Commit\s+(\d+)\s+files?$/i, '提交 $1 个文件'],
  [/^Commit to\s+(.+)$/i, '提交到 $1'],
  [/^Push to\s+(.+)$/i, '推送到 $1'],
  [/^Pull from\s+(.+)$/i, '从 $1 拉取'],
  [/^Expand\s+(\d+)\s+unchanged lines?$/i, '展开 $1 行未更改内容'],
  [/^Show\s+(\d+)\s+more lines?$/i, '显示另外 $1 行'],
  [/^(\d+)\s+additions?,\s*(\d+)\s+deletions?$/i, '$1 行新增，$2 行删除'],
  [/^\+(\d+)\s+-(\d+)$/, '+$1 -$2'],
  [/^Line\s+(\d+),\s*Column\s+(\d+)$/i, '第 $1 行，第 $2 列'],
  [/^Ln\s+(\d+),\s*Col\s+(\d+)$/i, '第 $1 行，第 $2 列'],
  [/^(\d+)\s+results?\s+in\s+(\d+)\s+files?$/i, '$2 个文件中有 $1 个结果'],
  [/^(\d+)\s+matches?\s+in\s+(\d+)\s+files?$/i, '$2 个文件中有 $1 处匹配'],
  [/^(\d+)\s+matches?$/i, '$1 处匹配'],
  [/^(\d+)\s+of\s+(\d+)\s+matches?$/i, '第 $1 / $2 处匹配'],
  [/^Replaced\s+(\d+)\s+occurrences?\s+across\s+(\d+)\s+files?$/i, '已在 $2 个文件中替换 $1 处'],
  [/^Terminal\s+(\d+)$/i, '终端 $1'],
  [/^Process exited with code\s+(\d+)$/i, '进程已退出，代码为 $1'],
  [/^Port\s+(\d+)\s+is in use$/i, '端口 $1 已被占用'],
  [/^Forwarded port\s+(\d+)$/i, '已转发端口 $1'],
  [/^Open\s+http(s?):\/\/([^\s]+)\s+in browser$/i, '在浏览器中打开 http$1://$2'],
  [/^Select\s+(.+)\s+for\s+(.+)$/i, (_, a, b) => `为 ${translateString(b) || b} 选择 ${translateString(a) || a}`],
  [/^Configure\s+(.+)$/i, (_, a) => `配置 ${translateString(a) || a}`],
  [/^Manage\s+(.+)$/i, (_, a) => `管理 ${translateString(a) || a}`],
  [/^Search\s+(.+)\.\.\.$/i, (_, a) => `搜索${translateString(a) || a}...`],
  [/^Filter\s+(.+)\.\.\.$/i, (_, a) => `筛选${translateString(a) || a}...`],
  [/^No\s+(.+)\s+found\.?$/i, (_, a) => `未找到${translateString(a) || a}`],
  [/^Failed to load\s+(.+)\.?$/i, (_, a) => `加载${translateString(a) || a}失败`],
  [/^Failed to save\s+(.+)\.?$/i, (_, a) => `保存${translateString(a) || a}失败`],
  [/^Failed to delete\s+(.+)\.?$/i, (_, a) => `删除${translateString(a) || a}失败`],
  [/^Failed to create\s+(.+)\.?$/i, (_, a) => `创建${translateString(a) || a}失败`],
  [/^Failed to update\s+(.+)\.?$/i, (_, a) => `更新${translateString(a) || a}失败`],
  [/^Are you sure you want to delete\s+['"]?(.+?)['"]?\?$/i, '确定要删除“$1”吗？'],
  [/^Are you sure you want to remove\s+['"]?(.+?)['"]?\?$/i, '确定要移除“$1”吗？'],

  // --- Antigravity 2.31.0 全量弹窗/引导/模板深度扫描正则规则 ---
  [/^Welcome to\s+(.+?)\.\s*I coordinate the work for this project\. Ask me a question or hand me a task, and I'll answer directly or start workers that run in parallel\.$/i, '欢迎来到 $1。我负责统筹协调此项目的工作。您可以向我提问或交办任务，我会直接解答，或启动多个并行运行的工作节点 (Workers)。'],
  [/^Customize your experience across the agent, plugins, and product from the settings and marketplace\. We won['’]t show you ads or let advertisers influence what (.+) says\.$/i, '您可以通过“设置”和插件市场全面定制智能体、插件与产品体验。我们绝不会向您展示广告，也不会让广告商影响 $1 的回答内容。'],
  [/^(.+)['’]s agents are powerful and will help you get a lot done better and faster than before, but still make sure to verify the actions taken by the agent\.$/i, '$1 的智能体功能强大，能够帮助您比以往更快、更好地完成大量工作，但仍请务必核实智能体所执行的操作。'],
  [/^Help us improve (.+)\.$/i, '帮助我们改进 $1。'],
  [/^Sign up for newsletters, tips and tricks, and other notifications about (.+)\.$/i, '订阅有关 $1 的资讯简报、实用技巧及其他通知。'],
  [/^(.+) does not collect any of your prompts, content, or model responses but does collect general usage patterns such as feature adoption and active user counts \([“"]product analytics[”"]\)\. Telemetry data will be handled in accordance with the Google Privacy Policy\.$/i, '$1 不会收集您的任何提示词、内容或模型回复，但会收集常规使用模式数据，例如功能采用率和活跃用户数量（“产品分析数据”）。遥测数据将按照《Google 隐私权政策》进行处理。'],
  [/^For (.+),\s*(.+) does not collect any of your prompts, content, or model responses but will still collect general usage patterns \(e\.g\., feature adoption, active user counts\)\.$/i, '对于 $1，$2 不会收集您的任何提示词、内容或模型回复，但仍会收集常规使用模式数据（例如功能采用率、活跃用户数量）。'],
  [/^Google (.+) Terms of Service$/i, 'Google $1 服务条款'],
  [/^Marked (\d+) conversations? as read$/i, '已将 $1 个对话标为已读'],
  [/^Open (.+) panel$/i, '打开 $1 面板'],
  [/^(\d+) lines? added, (\d+) lines? removed$/i, '新增 $1 行，删除 $2 行'],
  [/^(\d+) tools? (enabled|disabled)$/i, (_, n, st) => `已${st.toLowerCase() === 'enabled' ? '启用' : '禁用'} ${n} 个工具`],
  [/^(\d+) tools?$/i, '$1 个工具'],
  [/^(\d+) accounts?$/i, '$1 个账户'],
  [/^(\d+) rows?$/i, '$1 行'],
  [/^(\d+)\s*\/\s*(\d+) rows?$/i, '第 $1 / $2 行'],
  [/^(\d+) CEL values?$/i, '$1 个 CEL 值'],
  [/^(\d+) references?$/i, '$1 处引用'],
  [/^Showing first (\d+) references?$/i, '正在显示前 $1 处引用'],
  [/^(\d+) seconds?$/i, '$1 秒'],
  [/^(\d+) grants?$/i, '$1 项授权'],
  [/^(Disable|Enable) (.+) tool for (.+)$/i, (_, act, t, target) => `为 ${target} ${act.toLowerCase() === 'disable' ? '禁用' : '启用'} ${t} 工具`],
  [/^(Pause|Resume) (.+)$/i, (_, act, target) => `${act.toLowerCase() === 'pause' ? '暂停' : '恢复'} ${translateString(target) || target}`],
  [/^(.+) \(Experimental\)$/i, '$1（实验性）'],
  [/^(.+) \(Remote\)$/i, '$1（远程）'],
  [/^(.+) on this computer$/i, '此电脑上的 $1'],
  [/^(.+) color picker$/i, '$1 颜色选择器'],
  [/^(.+)\. Switch mic(?:rophone)?\.?$/i, '$1。切换麦克风'],
  [/^(.+)\. View site information$/i, '$1。查看网站信息'],
  [/^(.+)\. Show in (.+)$/i, '$1。在 $2 中显示'],
  [/^(.+)\. Starting in local workspace\.$/i, '$1。正在本地工作区中启动。'],
  [/^A file already exists at (.+)\.$/i, '$1 处已存在文件。'],
  [/^Account this MCP server uses:\s*(.+)$/i, '此 MCP 服务器使用的账户：$1'],
  [/^Add shortcut for (.+)$/i, '为 $1 添加快捷键'],
  [/^Agents created by this (.+) run in a dedicated (.+) with its own permissions\. You can change the permissions in the (.+) settings page\.$/i, '由此 $1 创建的智能体将在具有独立权限的专用 $2 中运行。您可以在 $3 设置页面中更改这些权限。'],
  [/^App view for (.+)$/i, '$1 的应用视图'],
  [/^Are you sure you want to delete (.+)\? This action cannot be undone\.$/i, '确定要删除 $1 吗？此操作无法撤销。'],
  [/^Are you sure you want to delete (.+)\? This will remove it from your MCP configuration\.$/i, '确定要删除 $1 吗？这将从您的 MCP 配置中将其移除。'],
  [/^Auth(?:orization)? code for (.+)$/i, '$1 的授权码'],
  [/^Authenticated as (.+)$/i, '已作为 $1 通过身份验证'],
  [/^Blocked cross-origin subframe "(.+)"$/i, '已阻止跨源子框架 "$1"'],
  [/^Blocked external popup navigation to "(.+)"$/i, '已阻止向 "$1" 的外部弹窗导航'],
  [/^Blocked navigation to "(.+)"$/i, '已阻止向 "$1" 的导航'],
  [/^Blocked popup to "(.+)"$/i, '已阻止向 "$1" 的弹窗'],
  [/^Branch, current:\s*(.+)$/i, '分支，当前：$1'],
  [/^Build with (.+) Plugins$/i, '使用 $1 插件进行构建'],
  [/^Cancel Questionnaire and Stop the Agent \((.+)\)$/i, '取消问卷并停止智能体 ($1)'],
  [/^Cannot add folder: "(.+)" is not a valid folder location\.$/i, '无法添加文件夹：“$1”不是有效的文件夹位置。'],
  [/^Can['’]t create this path — [“"](.+)[”"] is a file, not a folder\.$/i, '无法创建此路径——“$1”是文件而非文件夹。'],
  [/^Captured DOM tree for (.+)\.$/i, '已捕获 $1 的 DOM 树。'],
  [/^Choose (.+)'s Voice$/i, '选择 $1 的语音'],
  [/^Chunk (\d+)$/i, '数据块 $1'],
  [/^Compare responses from (\d+) models side-by-side to find the best result\.$/i, '并排对比 $1 个模型的回复，以挑选最佳结果。'],
  [/^Connect GitHub:\s*(.+)$/i, '连接 GitHub：$1'],
  [/^Connect an account for (.+) so the agent can run automations\.$/i, '请为 $1 连接账户，以便智能体运行自动化任务。'],
  [/^Cost summary:\s*(.+)$/i, '费用汇总：$1'],
  [/^Created automation "(.+)"\.$/i, '已创建自动化任务“$1”。'],
  [/^Deleted "(.+)"\.$/i, '已删除“$1”。'],
  [/^Enabled "(.+)"\.$/i, '已启用“$1”。'],
  [/^Started "(.+)"\.$/i, '已启动“$1”。'],
  [/^Restarted "(.+)"\.$/i, '已重启“$1”。'],
  [/^Detached at (.+)$/i, '分离头指针位于 $1'],
  [/^Details for (.+)$/i, '$1 的详情'],
  [/^Disconnect (.+)$/i, '断开 $1 的连接'],
  [/^Reconnect (.+)$/i, '重新连接 $1'],
  [/^Duplicate (.+) name$/i, '重复的 $1 名称'],
  [/^Edit (.+) name$/i, '编辑 $1 名称'],
  [/^Edit comment:\s*(.+)$/i, '编辑评论：$1'],
  [/^Endpoint (.+) not implemented$/i, '端点 $1 未实现'],
  [/^Failed to archive (.+)$/i, '归档 $1 失败'],
  [/^Failed to unarchive project:\s*(.+)$/i, '取消归档项目失败：$1'],
  [/^Failed to create project:\s*(.+)$/i, '创建项目失败：$1'],
  [/^Failed to delete recordings:\s*(.+)$/i, '删除录音失败：$1'],
  [/^Failed to evict annotation index for page (.+)$/i, '清除第 $1 页的批注索引失败'],
  [/^Failed to resolve folder:\s*(.+)$/i, '解析文件夹失败：$1'],
  [/^Failed to save cloud permission settings:\s*(.+)$/i, '保存云端权限设置失败：$1'],
  [/^Failed to save project Google3 configuration:\s*(.+)$/i, '保存项目 Google3 配置失败：$1'],
  [/^Failed to save project permissions:\s*(.+)$/i, '保存项目权限失败：$1'],
  [/^Failed to save project settings:\s*(.+)$/i, '保存项目设置失败：$1'],
  [/^Failed to save project:\s*(.+)$/i, '保存项目失败：$1'],
  [/^Failed to save settings:\s*(.+)$/i, '保存设置失败：$1'],
  [/^Failed to select workspace:\s*(.+)$/i, '选择工作区失败：$1'],
  [/^Failed to start "(.+)"\.?$/i, '启动“$1”失败。'],
  [/^Filter skills and rules:\s*(.+)$/i, '筛选技能与规则：$1'],
  [/^Fix with Agent:\s*(.+)$/i, '使用智能体修复：$1'],
  [/^Forked from (.+)$/i, '分支自 $1'],
  [/^Go to page (\d+)$/i, '前往第 $1 页'],
  [/^Go to slide (\d+)$/i, '前往第 $1 张幻灯片'],
  [/^Go to turn (\d+) of (\d+)$/i, '前往第 $1 / $2 轮'],
  [/^Step (\d+) of (\d+)$/i, '第 $1 / $2 步'],
  [/^Turn (\d+) of (\d+)$/i, '第 $1 / $2 轮'],
  [/^Source (\d+)$/i, '来源 $1'],
  [/^Inspected commit (.+)$/i, '已检查提交 $1'],
  [/^Install folder "(.+)" is already in use$/i, '安装文件夹“$1”已被占用'],
  [/^Keep:\s*(.+)$/i, '保留：$1'],
  [/^Label for (.+)$/i, '$1 的标签'],
  [/^Learn more about (.+)$/i, '了解更多关于 $1 的信息'],
  [/^Low contrast ratio \((.+)\)\. Text may be hard to read\.$/i, '对比度过低 ($1)，文本可能难以阅读。'],
  [/^Manage (.+) app settings\.$/i, '管理 $1 应用设置。'],
  [/^Managed by plugin (.+)$/i, '由插件 $1 管理'],
  [/^Message from (.+)$/i, '来自 $1 的消息'],
  [/^Microphone blocked\. Allow in (.+)\.$/i, '麦克风已被阻止。请在 $1 中允许访问。'],
  [/^More actions for (.+)$/i, '$1 的更多操作'],
  [/^More for (.+)$/i, '$1 的更多选项'],
  [/^Move to Group:\s*(.+)$/i, '移动到分组：$1'],
  [/^Navigate to (.+)$/i, '导航至 $1'],
  [/^No connectors match [“"](.+)[”"]$/i, '没有与“$1”匹配的连接器'],
  [/^No handlers configured for (.+)\.$/i, '尚未为 $1 配置处理程序。'],
  [/^No server is listening on port (\d+) inside the remote workspace\. Start it, or ask the agent to, then retry\.$/i, '远程工作区内没有服务器在监听端口 $1。请先启动服务（或让智能体启动），然后重试。'],
  [/^Nothing is running on port (\d+)$/i, '端口 $1 上没有正在运行的服务'],
  [/^Resume the conversation to start its workspace again, then start the server on port (\d+) and retry\.$/i, '请恢复对话以重新启动其工作区，然后在端口 $1 上启动服务器并重试。'],
  [/^On top of those defaults, (.+) requests the access below\.$/i, '除上述默认权限外，$1 还请求以下访问权限。'],
  [/^Open (.+) skill$/i, '打开 $1 技能'],
  [/^Open the (.+) plugin$/i, '打开 $1 插件'],
  [/^Open Subagent:\s*(.+)$/i, '打开子智能体：$1'],
  [/^Open URL in system browser:\s*(.+)$/i, '在系统浏览器中打开网址：$1'],
  [/^Opens external link:\s*(.+)$/i, '打开外部链接：$1'],
  [/^Page (\d+) failed to load$/i, '第 $1 页加载失败'],
  [/^Playback speed (.+)x$/i, '播放速度 $1x'],
  [/^Plugins in (.+)$/i, '$1 中的插件'],
  [/^Preview unavailable — (.+)$/i, '预览不可用 —— $1'],
  [/^Receive product updates, tips, and promotions from Google (.+) via email\.$/i, '通过电子邮件接收来自 Google $1 的产品更新、实用技巧与优惠资讯。'],
  [/^Recording shortcut for (.+)\. Press keys to bind, Enter to save, Escape to cancel\.$/i, '正在为 $1 录制快捷键。请按下按键进行绑定，按 Enter 保存，按 Esc 取消。'],
  [/^Remove (.+) from list$/i, '从列表中移除 $1'],
  [/^Remove context from (.+)$/i, '从 $1 移除上下文'],
  [/^Remove shortcut (.+) for (.+)$/i, '移除 $2 的快捷键 $1'],
  [/^Shortcut (.+) for (.+)$/i, '$2 的快捷键 $1'],
  [/^Reset (.+) to default$/i, '将 $1 重置为默认值'],
  [/^Reset (\d+) overrides?$/i, '重置 $1 项覆盖设置'],
  [/^Run (.+) now$/i, '立即运行 $1'],
  [/^Running for (.+)$/i, (_, t) => `已运行 ${translateDuration(t)}`],
  [/^Up (.+)$/i, (_, t) => `已运行 ${translateDuration(t)}`],
  [/^Scroll to:\s*(.+) on page (\d+)$/i, '滚动至：第 $2 页上的 $1'],
  [/^Search Google for "(.+)"$/i, '在 Google 中搜索“$1”'],
  [/^See (\d+) more$/i, '查看另外 $1 项'],
  [/^\+(\d+) more \(Show all\)$/i, '另外 +$1 项（显示全部）'],
  [/^\+(\d+) more$/i, '另外 +$1 项'],
  [/^Select (.+) Theme$/i, '选择 $1 主题'],
  [/^Select model with (.+)$/i, '使用 $1 选择模型'],
  [/^Send all \((\d+)\)$/i, '全部发送 ($1)'],
  [/^Show (.+) in folder$/i, '在文件夹中显示 $1'],
  [/^Show (\d+) more subagents?$/i, '显示另外 $1 个子智能体'],
  [/^Show (\d+) earlier steps?$/i, '显示前 $1 个步骤'],
  [/^Hide earlier steps$/i, '隐藏更早的步骤'],
  [/^Sign in to (.+) on this computer$/i, '在此电脑上登录 $1'],
  [/^Sign in to (.+) remotely$/i, '远程登录 $1'],
  [/^Sign in to (.+)$/i, '登录 $1'],
  [/^Successfully imported project:\s*(.+) from AI Studio$/i, '已成功从 AI Studio 导入项目：$1'],
  [/^Suggested plugin:\s*(.+)$/i, '推荐插件：$1'],
  [/^The (.+) MCP server requires configuration parameters before it can be started\.$/i, '$1 MCP 服务器需要先配置参数才能启动。'],
  [/^The folder [“"](.+)[”"] does not exist\. Would you like to create it\?$/i, '文件夹“$1”不存在。您想要创建它吗？'],
  [/^[“"](.+)[”"] isn['’]t a valid folder name\.$/i, '“$1”不是有效的文件夹名称。'],
  [/^Unfold lines (\d+)-(\d+)$/i, '展开第 $1-$2 行'],
  [/^Using default (.+) name$/i, '使用默认 $1 名称'],
  [/^Version (.+)$/i, '版本 $1'],
  [/^View Diff for (.+)$/i, '查看 $1 的差异对比'],
  [/^Waiting for command completion \(up to (\d+) seconds\)$/i, '正在等待命令执行完成（最多 $1 秒）'],
  [/^Welcome to (.+)!$/i, '欢迎使用 $1！'],
  [/^When toggled on, (.+) collects usage data to help Google enhance performance and features\.$/i, '开启后，$1 会收集使用情况数据，以帮助 Google 提升性能并完善功能。'],
  [/^When toggled on, (.+) will use your AI credits to fulfill model requests once you're out of model quota\. (.+) will always use your model quota first before using AI credits\.$/i, '开启后，当您的模型配额用尽时，$1 将使用您的 AI 点数来完成模型请求。在使用 AI 点数之前，$2 始终会优先使用您的模型配额。'],
  [/^You have (\d+) conversations in progress\. Updating will cancel them and you'll need to manually restart them\.$/i, '您有 $1 个正在进行的对话。更新将取消这些对话，之后您需要手动重新启动它们。'],
  [/^You have (\d+) conversations in progress\. Updating will interrupt them, and they will automatically resume once the update completes\.$/i, '您有 $1 个正在进行的对话。更新将暂时中断这些对话，并在更新完成后自动恢复。'],
  [/^Zoom (\d+)%, reset to fit$/i, '缩放 $1%，点击重置以适应窗口'],
  [/^script timed out after (\d+)ms$/i, '脚本在 $1 毫秒后超时'],
  // --- Antigravity 2.32.2 动态模板正则 ---
  [/^Manage\s+(.+?)\s+app settings\.$/i, '管理 $1 应用设置。'],
  [/^Build with\s+(.+?)\s+Plugins$/i, (_, name) => `使用 ${name} 插件构建`],
  [/^(\d+)\s+MCP servers?\s+failed to start$/i, '$1 个 MCP 服务器启动失败'],
  [/^Added MCP server "([^"]+)", but it failed to start:\s*(.+)$/i, (_, name, err) => `已添加 MCP 服务器“${name}”，但启动失败：${translateString(err)}`],
  [/^The MCP server "([^"]+)"(?:\s+from plugin "([^"]+)")?\s+failed to start\.\s*Error:\s*([\s\S]+)$/i, (_, name, plugin, err) =>
    plugin
      ? `来自插件“${plugin}”的 MCP 服务器“${name}”启动失败。\n错误：${translateString(err)}`
      : `MCP 服务器“${name}”启动失败。\n错误：${translateString(err)}`],
  [/^Error refreshing MCP servers:\s*(.+)$/i, (_, err) => `刷新 MCP 服务器时出错：${err}`],
  [/^(\d+)\s+tools?\s+enabled$/i, '已启用 $1 个工具'],
  [/^(\d+)\s+tools?\s+disabled$/i, '已禁用 $1 个工具'],
  [/^(Enable|Disable)\s+(.+?)\s+tool\s+for\s+(.+)$/i, (_, act, tool, target) => `${/^enable$/i.test(act) ? '启用' : '禁用'} ${target} 的 ${tool} 工具`],
  [/^Sign-ins to\s+(.+?)\s+are kept in the cloud with your account\.$/i, '您对 $1 的登录状态将随您的账户保存在云端。'],
  [/^New secret for\s+(.+)$/i, '为 $1 添加新密钥'],
  [/^Couldn't disconnect\s+(.+?):\s*(.+)$/i, '无法断开 $1 连接：$2'],
  [/^Connect\s+([A-Z][\w\s.+-]{1,40})$/, '连接 $1'],
  [/^(\d+)\s+active conversations?$/i, '$1 个活跃对话'],
  [/^(\d+)\s+archived conversations?$/i, '$1 个已归档对话'],
  [/^Agent settings and permissions for conversations outside of\s+(.+?)\.$/i, '位于 $1 之外对话的智能体设置与权限。'],
  [/^Settings for conversations outside of\s+(.+?)\.$/i, '位于 $1 之外对话的设置。'],
  [/^Inherits your Global Permissions when working\s+(.+?)\.$/i, (_, scope) => `在${/outside|conversations/i.test(scope) ? '这些对话' : '此项目'}中使用时继承您的全局权限。`],
  [/^Remove\s+(.+?)\s+from Recent$/i, '从最近列表中移除 $1'],
  [/^Hide\s+(.+?)\s+from this list$/i, '从此列表中隐藏 $1'],
  [/^Show\s+(.+?)\s+in the list again$/i, '在列表中重新显示 $1'],
  [/^Connected to\s+(.+)$/i, '已连接到 $1'],
  [/^Couldn't connect to\s+(.+)$/i, '无法连接到 $1'],
  [/^This window's agents, files, and terminals are on\s+(.+?)\.$/i, '此窗口的智能体、文件和终端均运行在 $1 上。'],
  [/^SSH Config\s*\((.+)\)$/i, 'SSH 配置（$1）'],
  [/^(\d+)\s+hidden hosts?$/i, '$1 个已隐藏的主机'],
  [/^No matching\s+(.+)$/i, (_, what) => `无匹配的${translateExactOrPattern(what) || what}`],
  [/^No remote\s+(.+)$/i, (_, what) => `无远程${translateExactOrPattern(what) || what}`],
  [/^(.+?)\s+\(disabled by admin\)$/i, (_, label) => `${translateExactOrPattern(label) || label}（已被管理员禁用）`],
  [/^Microphone access for\s+(.+?)\s+was denied\. Quit and reopen the app to be asked again\.$/i, '$1 的麦克风权限已被拒绝。请退出并重新打开应用以重新请求授权。'],
  [/^Reset\s+(.+?)\s+overrides?$/i, '重置 $1 覆盖设置'],
  [/^This deletes\s+(.+?)\s+\(([^)]+)\)\s+from your machine\. You can't undo this\.$/i, '此操作将从您的计算机中永久删除 $1（$2），且无法撤销。'],
  [/^Question\s+(\d+)\s+of\s+(\d+)$/i, '第 $1 / $2 题'],
  [/^Compare responses from\s+(\d+)\s+models side-by-side to find the best result\.$/i, '并排对比 $1 个模型的回复，择优选择最佳结果。'],
  [/^No\s+(.+?)\s+found for\s+(.+)$/i, '未找到与 $2 相关的 $1'],
  [/^No\s+(.+?)\s+matching your search$/i, (_, what) => `未找到与您的搜索匹配的${translateExactOrPattern(what) || what}`],
  [/^No apps found for "([^"]+)"\.$/i, '未找到与“$1”匹配的应用。'],
  [/^No\s+(.+?)\s+configured\.$/i, (_, what) => `尚未配置${translateExactOrPattern(what) || what}。`],
  [/^(\d+)\s+Files?\s+With Changes$/i, '$1 个已更改的文件'],
  [/^Show\s+(\d+)\s+more subagents?$/i, '再显示 $1 个子智能体'],
  [/^Message queued\.\s*(\d+)\s+messages in queue\.$/i, '消息已入队。队列中现有 $1 条消息。'],
  [/^(\d+)\s+attachment\(s\)$/i, '$1 个附件'],
  [/^\+(\d+)\s+attachments$/i, '另有 $1 个附件'],
  [/^\+(\d+)\s+more\s*\(Show all\)$/i, '另有 $1 项（显示全部）'],
  [/^\+(\d+)\s+more$/i, '另有 $1 项'],
  [/^Working [Dd]irectory:\s*(.+)$/, '工作目录：$1'],
  [/^Agent:\s*(.+?)\.\s*Change it in the model menu\.$/i, '智能体：$1。可在模型菜单中更改。'],
  [/^Disable Word Wrap(.*)$/i, '关闭自动换行$1'],
  [/^Enable Word Wrap(.*)$/i, '开启自动换行$1'],
  [/^Load older messages, showing\s+(\d+)\s+of\s+(\d+)$/i, '加载更早的消息（当前显示 $1 / $2 条）'],
  [/^No more older messages, showing\s+(\d+)\s+of\s+(\d+)$/i, '没有更多更早的消息（当前显示 $1 / $2 条）'],
  [/^Go to turn\s+(\d+)\s+of\s+(\d+)$/i, '跳转到第 $1 / $2 轮对话'],
  [/^Turn\s+(\d+)\s+of\s+(\d+)$/i, '第 $1 / $2 轮'],
  [/^Turns\s+(\d+)[–-](\d+)$/i, '第 $1–$2 轮'],
  [/^Open\s+(.+?)\s+settings$/i, (_, what) => `打开${what === 'accessibility' ? '辅助功能' : what === 'screen recording' ? '屏幕录制' : what}设置`],
  [/^Add\s+(\d+)\s+plugins?\s+from\s+(.+)$/i, '从 $2 添加 $1 个插件'],
  [/^Pushed\s+(\d+)\s+commits?\s+to\s+(.+?)\.$/i, '已推送 $1 个提交至 $2。'],
  [/^Push\s+(\d+)\s+commits?\s+to\s+(.+)$/i, '推送 $1 个提交至 $2'],
  [/^(.+?)\.\s+This commit is already pushed; amending will require a force push\.$/i, '$1。此提交已推送至远程；修补提交 (Amend) 将需要强制推送。'],
  [/^Low contrast ratio\s*\(([^)]+)\)\.\s*Text may be hard to read\.$/i, '对比度较低（$1），文本可能较难辨认。'],
  [/^The browser blocked the download of\s+(.+)$/i, '浏览器阻止了 $1 的下载'],
  [/^Exited with code\s+(-?\d+)\.?$/i, '已退出，退出码：$1。'],
  [/^Skip\s*\(([^)]+)\),\s*Skip All\s*\(([^)]+)\)$/i, '跳过 ($1)，全部跳过 ($2)'],
  [/^Submit\s*\(([^)]+)\)$/i, '提交 ($1)'],
  [/^Continue\s*\(([^)]+)\)$/i, '继续 ($1)'],
  [/^Stop\s+(.+?)\s+selected$/i, '停止所选 $1'],
  [/^Delete side question:\s*(.+)$/i, '删除侧边问题：$1'],
  [/^Fix with Agent:\s*(.+)$/i, '使用智能体修复：$1'],
  [/^Remove\s+(.+)$/i, (_, item) => `移除 ${item}`],
  [/^Restore\s+(.+)$/i, (_, item) => `恢复 ${item}`],
  [/^Mute\s+(.+)$/i, '静音 $1'],
  [/^Unmute\s+(.+)$/i, '取消静音 $1'],
  [/^(.+?)\s+\(Default\)$/i, '$1（默认）'],
  [/^(.+?)\s+\(unavailable\)$/i, '$1（不可用）'],
  [/^(.+?)\s+\(latest\)$/i, '$1（最新）'],
  [/^(.+?)\s+\(CLI\)$/i, '$1 (CLI)'],
  [/^(.+?)\s+\(MCP\)$/i, '$1 (MCP)'],
  [/^(.+?)\s+·\s+This computer$/i, '$1 · 此计算机'],
  [/^Waiting for your input(.*)$/i, '等待您的输入$1'],
  [/^Running\s*(·.+)$/i, '运行中 $1'],
  [/^(\d+)\s+models selected$/i, '已选择 $1 个模型'],
  [/^(\d+)\s+comments?$/i, '$1 条评论'],
  [/^Step\s+(\d+)\s+of\s+(\d+)$/i, '第 $1 / $2 步'],
  [/^(\d+)\s+turn(s)?$/i, '$1 轮对话'],
  [/^Runs even when your computer is off\.\s*(.+)$/i, (_, rest) => `即使您的计算机处于关闭状态也会运行。${translateString(rest)}`],
  [/^Next run\s+(.+?)\s+around\s+(.+)$/i, '下次运行：$1 大约 $2'],
  [/^Checked out in\s+(.+)$/i, '已在 $1 中检出'],
  [/^Downloads,\s*(\d+)%\s*complete$/i, '下载中，已完成 $1%'],
  [/^Open\s+(.+),\s*(.+)\.\s*Summarizing call$/i, '打开 $1，$2。正在总结通话'],
  [/^(\d+)\s+lines?\s+added,\s*(\d+)\s+lines?\s+removed$/i, '新增 $1 行，删除 $2 行'],
  [/^Go to slide\s+(\d+)$/i, '转到第 $1 页幻灯片'],
  [/^Go to page\s+(\d+)$/i, '转到第 $1 页'],
  [/^Page\s+(\d+)\s+failed to load$/i, '第 $1 页加载失败'],
  [/^Multiple search matches near page\s+(\d+)$/i, '第 $1 页附近有多处搜索匹配'],
  [/^Multiple markers near page\s+(\d+)$/i, '第 $1 页附近有多个标记'],
  [/^Comment on page\s+(\d+)$/i, '第 $1 页的批注'],
  [/^Search match on page\s+(\d+)$/i, '第 $1 页上的搜索匹配'],
  [/^Bounding box on page\s+(\d+)$/i, '第 $1 页上的边界框'],
  [/^Scroll to:\s*(.+?)\s+on page\s+(\d+)$/i, '滚动至第 $2 页：$1'],
  [/^Sort and filter conversations\s*\((\d+)\s*active\)$/i, '排序与筛选对话（$1 个筛选器生效中）'],
  [/^GitHub:\s*(.+)$/i, (_, rest) => `GitHub：${rest === 'not signed in' ? '未登录' : rest}`],
  [/^(.+?),\s*voice\s+(\d+)\s+of\s+(\d+)$/i, '$1，语音 $2 / $3'],
  [/^Blocked:\s*(.+)$/i, '已阻止：$1'],
  [/^Unfold lines\s+(\d+)-(\d+)$/i, '展开第 $1–$2 行'],
  [/^Fold lines\s+(\d+)-(\d+)$/i, '折叠第 $1–$2 行'],
  [/^Marked\s+(\d+)\s+conversations?\s+as read$/i, '已将 $1 个对话标记为已读'],
  [/^See\s+(\d+)\s+more\s*(.*)$/i, (_, n, rest) => `再显示 ${n} 项${rest ? ' ' + (translateExactOrPattern(rest) || rest) : ''}`],
  [/^See more\s+(.+)$/i, (_, rest) => `查看更多 ${translateExactOrPattern(rest) || rest}`],
  [/^Hey\s+([^!]{1,40})!$/i, '嗨，$1！'],
  [/^Error:\s*(.+)$/i, (_, err) => `错误：${translateString(err)}`],
  [/^Invalid notebook JSON:\s*(.+)$/i, '无效的 Notebook JSON：$1'],
  [/^WSL:\s*(.+)$/i, 'WSL：$1'],
  [/^SSH:\s*(.+)$/i, 'SSH：$1'],
  [/^Install\s+([A-Za-z0-9_.\s-]{2,40})$/, '安装 $1'],
  [/^Adding\s+([A-Za-z0-9_.\s-]{2,40})$/, '正在添加 $1'],
  [/^Restart\s+([A-Za-z0-9_.\s-]{2,40})$/, '重启 $1'],
  [/^Unpin\s+([A-Za-z0-9_.\s-]{2,40})$/, '取消置顶 $1'],
  [/^You have\s+(\d+)\s+conversations? in progress\. Updating will\s+(.+)$/i, (_, n, tail) => `您当前有 ${n} 个正在进行的对话。更新将${/cancel/i.test(tail) ? '取消这些对话，更新后您需要手动重新启动它们。' : '暂时中断这些对话，并在更新完成后自动恢复。'}`],
  [/^Give each Best of N fork a full clone of your workspace[\s\S]*$/i, '为每个多方案择优 (Best of N) 分支创建包含本地提交历史的完整工作区克隆。选定优胜分支后，您的工作区将应用该分支的状态并保留其生成的提交；创建分支耗时比默认 CitC 克隆更长。'],
  [/^Give each Best of N fork its own clone of your Git repository[\s\S]*$/i, '为每个多方案择优 (Best of N) 分支创建独立的 Git 仓库克隆而非写时复制覆盖层。每个分支都是真实仓库，选定优胜者后提交记录将被保留；创建耗时较长，等待时间随仓库体积增大而增加。'],
  [/^(Total|Subagents?|Subagent Costs?|Main|Conversation Total)\s*\((\$[\d.,]+)\)$/i, (_, name, price) => {
    const labelMap = { total: '总计', subagent: '子智能体', subagents: '子智能体', 'subagent cost': '子智能体费用', 'subagent costs': '子智能体费用', main: '主对话', 'conversation total': '对话总计' };
    return `${labelMap[name.toLowerCase()] || name}（${price}）`;
  }],
  [/^No\s+(.+)$/i, (full, rest) => {
    const tr = translateExactOrPattern(rest);
    return tr && tr !== rest ? `没有${tr}` : full;
  }],
];

// 社区级联正则规则 (322 条)
const COMMUNITY_REGEX_PATTERNS = [
  {
    "regex": "^Thought\\s+for\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "已思考 $1 小时 $2 分 $3 秒"
  },
  {
    "regex": "^Thought\\s+for\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m$",
    "replacement": "已思考 $1 小时 $2 分钟"
  },
  {
    "regex": "^Thought\\s+for\\s+(\\d+)\\s*h$",
    "replacement": "已思考 $1 小时"
  },
  {
    "regex": "^Thought\\s+for\\s+(\\d+)\\s*m\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "已思考 $1 分 $2 秒"
  },
  {
    "regex": "^Thought\\s+for\\s+(\\d+)\\s*m$",
    "replacement": "已思考 $1 分钟"
  },
  {
    "regex": "^Thought\\s+for\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "已思考 $1 秒"
  },
  {
    "regex": "^See all\\s*\\((\\d+)\\)$",
    "replacement": "查看全部 ($1)"
  },
  {
    "regex": "^See all\\s+(\\d+)$",
    "replacement": "查看全部 $1 项"
  },
  {
    "regex": "^\\((\\d+)\\s+subagents?\\)$",
    "replacement": "($1 个子智能体)"
  },
  {
    "regex": "^(\\d+)\\s+subagents?$",
    "replacement": "$1 个子智能体"
  },
  {
    "regex": "^(\\d+)\\s+seconds?\\s+ago$",
    "replacement": "$1 秒前"
  },
  {
    "regex": "^(\\d+)\\s+minutes?\\s+ago$",
    "replacement": "$1 分钟前"
  },
  {
    "regex": "^(\\d+)\\s+hours?\\s+ago$",
    "replacement": "$1 小时前"
  },
  {
    "regex": "^(\\d+)\\s+days?\\s+ago$",
    "replacement": "$1 天前"
  },
  {
    "regex": "^(\\d+)\\s+weeks?\\s+ago$",
    "replacement": "$1 周前"
  },
  {
    "regex": "^(\\d+)\\s+months?\\s+ago$",
    "replacement": "$1 个月前"
  },
  {
    "regex": "^(\\d+)\\s+years?\\s+ago$",
    "replacement": "$1 年前"
  },
  {
    "regex": "^(\\d+)[sS]\\s+ago$",
    "replacement": "$1 秒前"
  },
  {
    "regex": "^(\\d+)[mM]\\s+ago$",
    "replacement": "$1 分钟前"
  },
  {
    "regex": "^(\\d+)[hH]\\s+ago$",
    "replacement": "$1 小时前"
  },
  {
    "regex": "^(\\d+)[dD]\\s+ago$",
    "replacement": "$1 天前"
  },
  {
    "regex": "^(\\d{1,2}:\\d{2})\\s*\\/\\s*(\\d{1,2}:\\d{2})$",
    "replacement": "$1 / $2"
  },
  {
    "regex": "^(\\d{1,2}:\\d{2}:\\d{2})\\s*\\/\\s*(\\d{1,2}:\\d{2}:\\d{2})$",
    "replacement": "$1 / $2"
  },
  {
    "regex": "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})\\s*[-–—]\\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})$",
    "replacement": "$1 $2日 - $3 $4日"
  },
  {
    "regex": "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})\\s*[-–—]\\s*(\\d{1,2})$",
    "replacement": "$1 $2日 - $3日"
  },
  {
    "regex": "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2}),\\s*(\\d{4}),\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*(AM|PM)?$",
    "replacement": "$3年 $1 $2日 $5 $4"
  },
  {
    "regex": "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2}),\\s*(\\d{1,2}:\\d{2}(?::\\d{2})?)\\s*(AM|PM)?$",
    "replacement": "$1 $2日 $4 $3"
  },
  {
    "regex": "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2}),\\s*(\\d{4})$",
    "replacement": "$3年 $1 $2日"
  },
  {
    "regex": "^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\\s+(\\d{1,2})$",
    "replacement": "$1 $2日"
  },
  {
    "regex": "\\bJan\\b(?=\\s+\\d+日)",
    "replacement": "1月"
  },
  {
    "regex": "\\bFeb\\b(?=\\s+\\d+日)",
    "replacement": "2月"
  },
  {
    "regex": "\\bMar\\b(?=\\s+\\d+日)",
    "replacement": "3月"
  },
  {
    "regex": "\\bApr\\b(?=\\s+\\d+日)",
    "replacement": "4月"
  },
  {
    "regex": "\\bMay\\b(?=\\s+\\d+日)",
    "replacement": "5月"
  },
  {
    "regex": "\\bJun\\b(?=\\s+\\d+日)",
    "replacement": "6月"
  },
  {
    "regex": "\\bJul\\b(?=\\s+\\d+日)",
    "replacement": "7月"
  },
  {
    "regex": "\\bAug\\b(?=\\s+\\d+日)",
    "replacement": "8月"
  },
  {
    "regex": "\\bSep\\b(?=\\s+\\d+日)",
    "replacement": "9月"
  },
  {
    "regex": "\\bOct\\b(?=\\s+\\d+日)",
    "replacement": "10月"
  },
  {
    "regex": "\\bNov\\b(?=\\s+\\d+日)",
    "replacement": "11月"
  },
  {
    "regex": "\\bDec\\b(?=\\s+\\d+日)",
    "replacement": "12月"
  },
  {
    "regex": "\\bAM\\b(?=\\s+\\d{1,2}:\\d{2})",
    "replacement": "上午"
  },
  {
    "regex": "\\bPM\\b(?=\\s+\\d{1,2}:\\d{2})",
    "replacement": "下午"
  },
  {
    "regex": "(?<=\\d{1,2}:\\d{2}(?::\\d{2})?\\s*)AM\\b",
    "replacement": "上午"
  },
  {
    "regex": "(?<=\\d{1,2}:\\d{2}(?::\\d{2})?\\s*)PM\\b",
    "replacement": "下午"
  },
  {
    "regex": "^([\\d\\.]+)% of the customization budget is available\\.$",
    "replacement": "$1% 的自定义扩展预算可用。"
  },
  {
    "regex": "^Show (\\d+) breakdowns?$",
    "replacement": "显示 $1 项明细"
  },
  {
    "regex": "^Hide (\\d+) breakdowns?$",
    "replacement": "隐藏 $1 项明细"
  },
  {
    "regex": "^You have used some of your weekly limit, it will fully refresh in (.+)\\.$",
    "replacement": "您已消耗了部分每周额度，将在 $1 后完全重置刷新。"
  },
  {
    "regex": "^You have used some of your 5 hour limit, it will fully refresh in (.+)\\.$",
    "replacement": "您已消耗了部分 5 小时额度，将在 $1 后完全重置刷新。"
  },
  {
    "regex": "^You have hit your 5-hour limit, so the weekly limit does not currently apply\\. Your 5-hour limit will refresh in (.+)\\.$",
    "replacement": "您已达到 5 小时上限，因此每周额度当前不适用。您的 5 小时额度将在 $1 后重置刷新。"
  },
  {
    "regex": "^You have hit your 5-hour limit, it will refresh in (.+)\\. If on a supported paid plan, you can use AI credits in the interim\\.$",
    "replacement": "您已达到 5 小时上限，将在 $1 后重置刷新。如果使用的是支持的付费套餐，您可以在此期间使用 AI 积分。"
  },
  {
    "regex": "(\\d+) days?, (\\d+) hours?",
    "replacement": "$1 天 $2 小时"
  },
  {
    "regex": "(\\d+) hours?, (\\d+) minutes?",
    "replacement": "$1 小时 $2 分钟"
  },
  {
    "regex": "(\\d+) days?",
    "replacement": "$1 天"
  },
  {
    "regex": "(\\d+) hours?",
    "replacement": "$1 小时"
  },
  {
    "regex": "(\\d+) minutes?",
    "replacement": "$1 分钟"
  },
  {
    "regex": "^(\\d+) files? changed$",
    "replacement": "$1 个文件已修改"
  },
  {
    "regex": "^(\\d+) insertions?\\(\\+\\)$",
    "replacement": "$1 行新增(+)"
  },
  {
    "regex": "^(\\d+) deletions?\\(-\\)$",
    "replacement": "$1 行删除(-)"
  },
  {
    "regex": "^Step (\\d+) of (\\d+)$",
    "replacement": "第 $1 步（共 $2 步）"
  },
  {
    "regex": "^Task (\\d+) running$",
    "replacement": "正在运行任务 $1"
  },
  {
    "regex": "^Saved at (\\d{1,2}:\\d{2}(?::\\d{2})?)$",
    "replacement": "已于 $1 保存"
  },
  {
    "regex": "^(\\d+) active subagents?$",
    "replacement": "$1 个运行中的子智能体"
  },
  {
    "regex": "^Created (\\d+) files?$",
    "replacement": "已创建 $1 个文件"
  },
  {
    "regex": "^Modified (\\d+) files?$",
    "replacement": "已修改 $1 个文件"
  },
  {
    "regex": "^Thinking for (\\d+)s$",
    "replacement": "已思考 $1 秒"
  },
  {
    "regex": "^Stopped after (\\d+) steps?$",
    "replacement": "已在 $1 步后停止"
  },
  {
    "regex": "Scan the code to open this device in\\s*",
    "replacement": "扫描二维码在此设备中打开 "
  },
  {
    "regex": "to browse the store, or add a custom server via the MCP config\\.?",
    "replacement": "浏览应用商店，或通过 MCP 配置文件添加自定义服务。"
  },
  {
    "regex": "^(\\d+(?:\\.\\d+)?)% of the customization budget is available\\.?$",
    "replacement": "$1% 的自定义扩展预算可用。"
  },
  {
    "regex": "了解更多关于\\s*Inherit General",
    "replacement": "了解更多关于继承通用设置"
  },
  {
    "regex": "Also includes global settings when working in this project\\.?",
    "replacement": "在此项目中工作时也包含全局设置。"
  },
  {
    "regex": "\\bInherit General\\b",
    "replacement": "继承通用设置"
  },
  {
    "regex": "It requires\\s+([a-zA-Z0-9\\s]+?)\\s+to be installed\\.?",
    "replacement": "需要安装 $1 才能运行。"
  },
  {
    "regex": "(\\d+(?:\\.\\d+)?)% of the customization budget is available",
    "replacement": "$1% 的自定义扩展预算可用"
  },
  {
    "regex": "Configure (?:the )?browser subagent\\s*\\.?",
    "replacement": "配置浏览器子智能体。"
  },
  {
    "regex": "(\\d+(?:\\.\\d+)?)% of the customization budget is available\\.?",
    "replacement": "$1% 的自定义扩展预算可用。"
  },
  {
    "regex": "(?:^|\\s*)of the customization budget is available\\.?",
    "replacement": " 的自定义扩展预算可用。"
  },
  {
    "regex": "Manage project folders,\\s*agent settings,?\\s*and permissions\\.?",
    "replacement": "管理项目文件夹、智能体设置与权限。"
  },
  {
    "regex": "No folders added yet\\.?",
    "replacement": "暂未添加任何文件夹。"
  },
  {
    "regex": "^\\+\\s*Add Folder$",
    "replacement": "+ 添加文件夹"
  },
  {
    "regex": "You have used some of your 5-?hour limit,?\\s*it will fully refresh in (.*?)\\.?$",
    "replacement": "您已消耗了部分 5 小时额度，将在 $1 后完全重置刷新。"
  },
  {
    "regex": "You have used some of your weekly limit,?\\s*it will fully refresh in (.*?)\\.?$",
    "replacement": "您已消耗了部分每周额度，将在 $1 后完全重置刷新。"
  },
  {
    "regex": "You have hit your 5-?hour limit,?\\s*it will refresh in (.*?)\\.?$",
    "replacement": "您已达到 5 小时上限，将在 $1 后重置刷新。"
  },
  {
    "regex": "You have hit your weekly limit,?\\s*it will refresh in (.*?)\\.?$",
    "replacement": "您已达到每周上限，将在 $1 后重置刷新。"
  },
  {
    "regex": "^Permanently delete (.*?)\\.?$",
    "replacement": "永久删除 $1。"
  },
  {
    "regex": "配置浏览器子智能体[。.]\\s*It requires",
    "replacement": "配置浏览器子智能体。需要安装"
  },
  {
    "regex": "Configure (?:the )?browser subagent[。.]\\s*It requires",
    "replacement": "配置浏览器子智能体。需要安装"
  },
  {
    "regex": "\\bIt requires\\b",
    "replacement": "需要安装"
  },
  {
    "regex": "^快捷键\\s*for quick navigation and control\\.?$",
    "replacement": "快捷键，用于快速导航和操作控制。"
  },
  {
    "regex": "^(?:Shortcuts\\s+)?for quick navigation and control\\.?$",
    "replacement": "用于快速导航和操作控制。"
  },
  {
    "regex": "^(?:LAYOUT|Layout)\\s+CONTROLS$",
    "replacement": "布局控制"
  },
  {
    "regex": "Attach (?:a )?screenshot(?:s)?\\s*\\(optional\\)",
    "replacement": "附上屏幕截图（可选）"
  },
  {
    "regex": "Please list the steps to reproduce the issue\\.?",
    "replacement": "请列出重现该问题的具体操作步骤…"
  },
  {
    "regex": "Describe the bug you encountered\\.{0,3}",
    "replacement": "请详细描述您遇到的问题或缺陷…"
  },
  {
    "regex": "^(?:Steps\\s+to\\s+[Rr]eproduce|STEPS\\s+TO\\s+REPRODUCE)\\b",
    "replacement": "重现步骤"
  },
  {
    "regex": "^(Enter|Alt\\+Enter|Shift\\+Enter|Ctrl\\+Enter|Cmd\\+Enter)\\s+Queues after the turn$",
    "replacement": "$1 轮次结束后进入排队"
  },
  {
    "regex": "^(Enter|Alt\\+Enter|Shift\\+Enter|Ctrl\\+Enter|Cmd\\+Enter)\\s+Sends immediately$",
    "replacement": "$1 立即发送"
  },
  {
    "regex": "^(Enter|Alt\\+Enter|Shift\\+Enter|Ctrl\\+Enter|Cmd\\+Enter)\\s+On empty prompt,\\s*sends next in queue$",
    "replacement": "$1 在输入框为空时发送队列中的下一条消息"
  },
  {
    "regex": "^On empty prompt,\\s*sends next in queue$",
    "replacement": "在输入框为空时发送队列中的下一条消息"
  },
  {
    "regex": "^Queues after the turn$",
    "replacement": "轮次结束后进入排队"
  },
  {
    "regex": "^Sends immediately$",
    "replacement": "立即发送"
  },
  {
    "regex": "^Models\\s+within\\s+this\\s+group:?\\s*(.*)$",
    "replacement": "该分组包含的模型：$1"
  },
  {
    "regex": "^Inherits\\s+your\\s+General\\s+settings\\s*在此项目中工作时[。.]?$",
    "replacement": "在此项目中工作时，继承您的“通用”设置。"
  },
  {
    "regex": "^Inherits\\s+(?:your\\s+)?(?:General|default)\\s+settings[。.]?$",
    "replacement": "继承您的“通用”设置。"
  },
  {
    "regex": "\\bInherits\\s+your\\s+General\\s+settings\\b",
    "replacement": "继承您的“通用”设置"
  },
  {
    "regex": "^Your\\s+quota\\s+for\\s+this\\s+model\\s+is\\s+running\\s+low\\.?",
    "replacement": "您在此模型上的剩余配额即将耗尽。"
  },
  {
    "regex": "^Your\\s+quota\\s+for\\s+this\\s+model\\s+has\\s+run\\s+out\\.?",
    "replacement": "您在此模型上的配额已耗尽。"
  },
  {
    "regex": "^View\\s+Usage\\b",
    "replacement": "查看用量明细"
  },
  {
    "regex": "\\bSends\\s+after\\s+agent\\s+finishes\\s+working\\b",
    "replacement": "智能体结束工作后发送"
  },
  {
    "regex": "^Sends\\s+after\\s+agent\\s+finishes\\s+working[。.]?$",
    "replacement": "智能体结束工作后发送"
  },
  {
    "regex": "^Send\\s+Now$",
    "replacement": "立即发送"
  },
  {
    "regex": "^Select\\s+Project(\\s+(?:Ctrl|Cmd|Alt|Shift)\\+[\\w;:,\\/\\+\\-]+)?$",
    "replacement": "选择项目$1"
  },
  {
    "regex": "^Select\\s+Model(\\s+(?:Ctrl|Cmd|Alt|Shift)\\+[\\w;:,\\/\\+\\-]+)?$",
    "replacement": "选择模型$1"
  },
  {
    "regex": "^No\\s+Project$",
    "replacement": "无项目关联"
  },
  {
    "regex": "^Quick\\s+Start$",
    "replacement": "快速入门"
  },
  {
    "regex": "^Copy\\s+项目名称$",
    "replacement": "复制项目名称"
  },
  {
    "regex": "^Copy\\s+Project\\s+Name$",
    "replacement": "复制项目名称"
  },
  {
    "regex": "^Cancel\\s*\\(((?:Ctrl|Cmd|Alt|Shift)\\+[\\w\\+\\-]+)\\)$",
    "replacement": "取消 ($1)"
  },
  {
    "regex": "^Pin$",
    "replacement": "置顶"
  },
  {
    "regex": "^Unpin$",
    "replacement": "取消置顶"
  },
  {
    "regex": "^Good\\s+response$",
    "replacement": "优质回答"
  },
  {
    "regex": "^Bad\\s+response$",
    "replacement": "不佳回答"
  },
  {
    "regex": "^Mark\\s+Unread$",
    "replacement": "标记为未读"
  },
  {
    "regex": "^Mark\\s+Read$",
    "replacement": "标记为已读"
  },
  {
    "regex": "^Copy\\s+Command$",
    "replacement": "复制命令"
  },
  {
    "regex": "^(\\d+)\\s+tasks?\\s+running$",
    "replacement": "$1 个运行中的任务"
  },
  {
    "regex": "^Ran\\s+(.*)$",
    "replacement": "运行 $1"
  },
  {
    "regex": "^Explored\\s+(\\d+)\\s+files?$",
    "replacement": "已浏览探索 $1 个文件"
  },
  {
    "regex": "^Explored\\s+(.*)$",
    "replacement": "已浏览探索 $1"
  },
  {
    "regex": "^Edited\\s+(\\d+)\\s+files?(\\s*\\([^)]+\\))?$",
    "replacement": "已编辑 $1 个文件$2"
  },
  {
    "regex": "^Viewed\\s+(\\d+)\\s+files?(\\s*\\([^)]+\\))?$",
    "replacement": "已查看 $1 个文件$2"
  },
  {
    "regex": "^Edited\\s+(.*)$",
    "replacement": "已编辑 $1"
  },
  {
    "regex": "^Viewed\\s+(.*)$",
    "replacement": "已查看 $1"
  },
  {
    "regex": "^Ran\\s+(\\d+)\\s+commands?$",
    "replacement": "已运行 $1 个命令"
  },
  {
    "regex": "^Explored\\s+(\\d+)\\s+tasks?$",
    "replacement": "已查看 $1 个任务"
  },
  {
    "regex": "^Timed\\s+(\\d+)\\s+seconds?$",
    "replacement": "已计时 $1 秒"
  },
  {
    "regex": "^Timed\\s+(\\d+)\\s+minutes?$",
    "replacement": "已计时 $1 分钟"
  },
  {
    "regex": "(:?\\s*)Timer has expired$",
    "replacement": "$1定时器已到期"
  },
  {
    "regex": "(\\s+)finished$",
    "replacement": "$1已完成"
  },
  {
    "regex": "^Outside\\s+of\\s+Project$",
    "replacement": "项目外"
  },
  {
    "regex": "^Inside\\s+of\\s+Project$",
    "replacement": "项目内"
  },
  {
    "regex": "^Updated\\s+(.*)$",
    "replacement": "更新于 $1"
  },
  {
    "regex": "^Created\\s+(.*)$",
    "replacement": "创建于 $1"
  },
  {
    "regex": "继承您的“通用”设置\\s+when working in this project\\.?",
    "replacement": "在此项目中工作时，继承您的“通用”设置。"
  },
  {
    "regex": "Inherits\\s+your\\s+[“\\\"]?General[”\\\"]?\\s+settings\\s+when working in this project\\.?",
    "replacement": "在此项目中工作时，继承您的“通用”设置。"
  },
  {
    "regex": "\\bwhen working in this project\\.?",
    "replacement": "在此项目中工作时。"
  },
  {
    "regex": "^Tool\\s+Permissions$",
    "replacement": "工具权限"
  },
  {
    "regex": "^Controls\\s+the\\s+actions\\s+the\\s+agent\\s+can\\s+take[。.]?$",
    "replacement": "控制智能体可以执行的操作。"
  },
  {
    "regex": "^Whether\\s+the\\s+agent\\s+asks\\s+you\\s+to\\s+review\\s+its\\s+documents[。.]?$",
    "replacement": "智能体在创建产物文档时是否请求您审查。"
  },
  {
    "regex": "^Browser\\s+settings\\s+have\\s+moved$",
    "replacement": "浏览器设置已迁移"
  },
  {
    "regex": "Browser\\s+settings\\s+have\\s+moved\\s+to\\s+the\\s+Browser\\s+section\\s+of\\s+General\\s+settings\\.?",
    "replacement": "浏览器设置已迁移至“通用设置”中的“浏览器”板块。"
  },
  {
    "regex": "^Go\\s+to\\s+General\\s+settings$",
    "replacement": "前往通用设置"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "已运行 $1 小时 $2 分 $3 秒"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m$",
    "replacement": "已运行 $1 小时 $2 分钟"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+)\\s*h$",
    "replacement": "已运行 $1 小时"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+)\\s*m\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "已运行 $1 分 $2 秒"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+)\\s*m$",
    "replacement": "已运行 $1 分钟"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "已运行 $1 秒"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "在 $1 小时 $2 分 $3 秒后停止"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m$",
    "replacement": "在 $1 小时 $2 分钟后停止"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+)\\s*h$",
    "replacement": "在 $1 小时后停止"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+)\\s*m\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "在 $1 分 $2 秒后停止"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+)\\s*m$",
    "replacement": "在 $1 分钟后停止"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+(?:\\.\\d+)?)\\s*s$",
    "replacement": "在 $1 秒后停止"
  },
  {
    "regex": "^Message\\s+from\\s+(.+)$",
    "replacement": "来自 $1 的消息"
  },
  {
    "regex": "^Executing\\s+task:\\s+(.+)$",
    "replacement": "正在执行任务: $1"
  },
  {
    "regex": "^Record Audio(\\s+Ctrl\\+[A-Za-z])$",
    "replacement": "录制音频$1"
  },
  {
    "regex": "^Create\\s+(?:New\\s+)?Project$",
    "replacement": "新建项目"
  },
  {
    "regex": "^New Terminal(\\s+Ctrl\\+Shift\\+.*?)$",
    "replacement": "新建终端$1"
  },
  {
    "regex": "^Add Terminal(\\s+Ctrl\\+Shift\\+.*?)$",
    "replacement": "添加终端$1"
  },
  {
    "regex": "^Add Context(\\s+.*)$",
    "replacement": "添加上下文$1"
  },
  {
    "regex": "^(\\d+)\\s+agents?\\s+running$",
    "replacement": "$1 个运行中的智能体"
  },
  {
    "regex": "Remote Control,\\s*or\\s*",
    "replacement": "远程控制，或 "
  },
  {
    "regex": "^(?:继承您的全局权限|Inherits\\s+your\\s+(?:Global\\s+Permissions|global\\s+permissions))[\\s,，]*(?:when\\s+working\\s+in\\s+this\\s+project|在此项目中工作时)[。.]?$",
    "replacement": "在此项目中工作时，继承您的全局权限。"
  },
  {
    "regex": "^Inherits\\s+your\\s+(?:Global\\s+Permissions|global\\s+permissions)[。.]?$",
    "replacement": "继承您的全局权限。"
  },
  {
    "regex": "\\b(?:Inherits\\s+your|继承您的)[\\s,，]*(?:Global\\s+Permissions|global\\s+permissions|全局权限)[\\s,，]*(?:when\\s+working\\s+in\\s+this\\s+project|在此项目中工作时)[。.]?",
    "replacement": "在此项目中工作时，继承您的全局权限。"
  },
  {
    "regex": "^(?:Also\\s+includes|也包含)[\\s,，]*(?:Global\\s+Permissions|global\\s+permissions|全局权限)[\\s,，]*(?:when\\s+working\\s+in\\s+this\\s+project|在此项目中工作时)[。.]?\\s*(?:Learn\\s+more|了解更多)[。.]?$",
    "replacement": "在此项目中工作时也包含全局权限。了解更多。"
  },
  {
    "regex": "^(?:Also\\s+includes|也包含)[\\s,，]*(?:Global\\s+Permissions|global\\s+permissions|全局权限)[\\s,，]*(?:when\\s+working\\s+in\\s+this\\s+project|在此项目中工作时)[。.]?$",
    "replacement": "在此项目中工作时也包含全局权限。"
  },
  {
    "regex": "\\b(?:Also\\s+includes|也包含)[\\s,，]*(?:Global\\s+Permissions|global\\s+permissions|全局权限)[\\s,，]*(?:when\\s+working\\s+in\\s+this\\s+project|在此项目中工作时)[。.]?",
    "replacement": "在此项目中工作时也包含全局权限。"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:d|days?)[,\\s]+(\\d+)\\s*(?:h|hours?)[,\\s]+(\\d+)\\s*(?:m|mins?|minutes?)[。.]?$",
    "replacement": "$1 天 $2 小时 $3 分钟后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:d|days?)[,\\s]+(\\d+)\\s*(?:h|hours?)[。.]?$",
    "replacement": "$1 天 $2 小时后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:h|hours?)[,\\s]+(\\d+)\\s*(?:m|mins?|minutes?)[。.]?$",
    "replacement": "$1 小时 $2 分钟后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:m|mins?|minutes?)[,\\s]+(\\d+)\\s*(?:s|secs?|seconds?)[。.]?$",
    "replacement": "$1 分 $2 秒后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:d|days?)[。.]?$",
    "replacement": "$1 天后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:h|hours?)[。.]?$",
    "replacement": "$1 小时后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:m|mins?|minutes?)[。.]?$",
    "replacement": "$1 分钟后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:s|secs?|seconds?)[。.]?$",
    "replacement": "$1 秒后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+less\\s+than\\s+a\\s+minute[。.]?$",
    "replacement": "不到 1 分钟后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+in\\s+a\\s+few\\s+seconds[。.]?$",
    "replacement": "几秒后重置"
  },
  {
    "regex": "^[Rr]esets?\\s+soon[。.]?$",
    "replacement": "即将重置"
  },
  {
    "regex": "\\b[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:d|days?)[,\\s]+(\\d+)\\s*(?:h|hours?)",
    "replacement": "$1 天 $2 小时后重置"
  },
  {
    "regex": "\\b[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:h|hours?)[,\\s]+(\\d+)\\s*(?:m|mins?|minutes?)",
    "replacement": "$1 小时 $2 分钟后重置"
  },
  {
    "regex": "\\b[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:m|mins?|minutes?)[,\\s]+(\\d+)\\s*(?:s|secs?|seconds?)",
    "replacement": "$1 分 $2 秒后重置"
  },
  {
    "regex": "\\b[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:d|days?)",
    "replacement": "$1 天后重置"
  },
  {
    "regex": "\\b[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:h|hours?)",
    "replacement": "$1 小时后重置"
  },
  {
    "regex": "\\b[Rr]esets?\\s+in\\s+(\\d+)\\s*(?:m|mins?|minutes?)",
    "replacement": "$1 分钟后重置"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:d|days?)[,\\s]+(\\d+)\\s*(?:h|hours?)[,\\s]+(\\d+)\\s*(?:m|mins?|minutes?)[。.]?$",
    "replacement": "$1 天 $2 小时 $3 分钟后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:d|days?)[,\\s]+(\\d+)\\s*(?:h|hours?)[。.]?$",
    "replacement": "$1 天 $2 小时后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:h|hours?)[,\\s]+(\\d+)\\s*(?:m|mins?|minutes?)[。.]?$",
    "replacement": "$1 小时 $2 分钟后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:m|mins?|minutes?)[,\\s]+(\\d+)\\s*(?:s|secs?|seconds?)[。.]?$",
    "replacement": "$1 分 $2 秒后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:d|days?)[。.]?$",
    "replacement": "$1 天后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:h|hours?)[。.]?$",
    "replacement": "$1 小时后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:m|mins?|minutes?)[。.]?$",
    "replacement": "$1 分钟后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+in\\s+(\\d+)\\s*(?:s|secs?|seconds?)[。.]?$",
    "replacement": "$1 秒后重置刷新"
  },
  {
    "regex": "^[Rr]efreshes?\\s+soon[。.]?$",
    "replacement": "即将重置刷新"
  },
  {
    "regex": "^(?:All|全部)\\s+scheduled\\s+tasks\\s+run\\s+as\\s+(.+?)[。.]?$",
    "replacement": "所有定时任务均以 $1 模型运行。"
  },
  {
    "regex": "^scheduled\\s+tasks\\s+run\\s+as\\s+(.+?)[。.]?$",
    "replacement": "定时任务均以 $1 模型运行。"
  },
  {
    "regex": "^Search\\s+tasks[\\.…]*$",
    "replacement": "搜索任务..."
  },
  {
    "regex": "^Search\\s+conversations[\\.…]*$",
    "replacement": "搜索会话..."
  },
  {
    "regex": "^Enter\\s+scheduled\\s+task\\s+name[\\.…]*$",
    "replacement": "输入定时任务名称..."
  },
  {
    "regex": "^Enter\\s+a\\s+prompt\\s+for\\s+the\\s+agent\\s+to\\s+run[\\.…]*$",
    "replacement": "输入供智能体执行的提示词..."
  },
  {
    "regex": "\\bProject\\s*\\+\\s*Worktree\\b",
    "replacement": "项目 + 工作树"
  },
  {
    "regex": "^Undo\\s+to\\s+(?:this\\s+point|here)[。.]?$",
    "replacement": "撤销到此处"
  },
  {
    "regex": "^Failed\\s+to\\s+revalidate\\s+slash\\s+commands:[\\s]*(.*)$",
    "replacement": "重新验证斜杠命令失败：$1"
  },
  {
    "regex": "^Failed\\s+to\\s+add\\s+plugin[。.]?\\s*(?:Please\\s+try\\s+again[。.]?)?$",
    "replacement": "添加插件失败。请重试。"
  },
  {
    "regex": "^(?:All|全部)\\s+scheduled\\s+tasks?\\s+run\\s+as\\s+(.+?)[。.]?$",
    "replacement": "所有定时任务均以 $1 模型运行。"
  },
  {
    "regex": "^(?:All|全部)\\s+plugins?\\s+run\\s+as\\s+(.+?)[。.]?$",
    "replacement": "所有插件均以 $1 模型运行。"
  },
  {
    "regex": "^(?:All|全部)\\s+automations?\\s+run\\s+as\\s+(.+?)[。.]?$",
    "replacement": "所有自动化任务均以 $1 模型运行。"
  },
  {
    "regex": "^Mark\\s+all\\s+(\\d+)\\s+conversations\\s+as\\s+read$",
    "replacement": "将全部 $1 个会话标记为已读"
  },
  {
    "regex": "^Mark\\s+(\\d+)\\s+conversations?\\s+as\\s+read$",
    "replacement": "将 $1 个会话标记为已读"
  },
  {
    "regex": "^Are\\s+you\\s+sure\\s+you\\s+want\\s+to\\s+mark\\s+all\\s+(\\d+)\\s+conversations\\s+as\\s+read\\?\\s+This\\s+action\\s+cannot\\s+be\\s+undone\\.?$",
    "replacement": "您确定要将全部 $1 个会话标记为已读吗？此操作无法撤销。"
  },
  {
    "regex": "^Are\\s+you\\s+sure\\s+you\\s+want\\s+to\\s+mark\\s+(\\d+)\\s+conversations?\\s+as\\s+read\\?\\s+This\\s+action\\s+cannot\\s+be\\s+undone\\.?$",
    "replacement": "您确定要将 $1 个会话标记为已读吗？此操作无法撤销。"
  },
  {
    "regex": "\\bWorkspace\\s*\\+\\s*Worktree\\b",
    "replacement": "工作区 + 工作树"
  },
  {
    "regex": "^(\\d+)\\s+active\\s+conversations?$",
    "replacement": "$1 个活跃会话"
  },
  {
    "regex": "^(\\d+)\\s+archived\\s+conversations?$",
    "replacement": "$1 个已归档会话"
  },
  {
    "regex": "^Try\\s+(?:远程控制|Remote Control)$",
    "replacement": "体验远程控制"
  },
  {
    "regex": "^(\\d+)\\s+tools?\\s+enabled$",
    "replacement": "已启用 $1 个工具"
  },
  {
    "regex": "^Plugin:\\s*(.*)$",
    "replacement": "插件: $1"
  },
  {
    "regex": "^This plugin provides a specialized suite of skills for data engineers.*$",
    "replacement": "此插件为在 Google Cloud 上工作的数据工程师和数据库从业者提供专业技能套件。它充当专家助手，让您轻松与数据库交互、分析数据并优化数据库工作负载。"
  },
  {
    "regex": "^Build applications with the Gemini Interactions API.*$",
    "replacement": "使用 Gemini Interactions API 和 Live API 构建应用，包括文本生成、多轮对话、流式传输、函数调用、托管智能体以及实时音视频。"
  },
  {
    "regex": "^Kick off work on your computer and continue working with your agents from your phone or another device\\.\\s*Turn on (?:远程控制|Remote Control) in app settings\\.?$",
    "replacement": "在您的计算机上开启工作，并通过手机或其他设备继续与您的智能体协同。可在应用设置中开启远程控制。"
  },
  {
    "regex": "^Build with (.+) Plugins$",
    "replacement": "Build with $1 插件目录"
  },
  {
    "regex": "^Plugins are packaged collections of skills and MCPs to help the Agent in (.+?) work with Google developer products\\.\\s*You can always change your choices in Settings\\.?$",
    "replacement": "插件是技能与 MCP 的打包集合，用于辅助 $1 中的智能体协同使用 Google 开发者产品。您随时可以在“设置”中更改选择。"
  },
  {
    "regex": "^Plugins are packaged collections of skills and MCPs to help the Agent work with Google developer products\\.\\s*You can always change your choices in Settings\\.?$",
    "replacement": "插件是技能与 MCP 的打包集合，用于辅助智能体协同使用 Google 开发者产品。您随时可以在“设置”中更改选择。"
  },
  {
    "regex": "^There are currently no Build with (.+) plugins available\\.?$",
    "replacement": "当前暂无可用的 Build with $1 插件。"
  },
  {
    "regex": "^Specialized suite of skills for data engineers and database practitioners (?:working )?on Google Cloud\\.?$",
    "replacement": "专为 Google Cloud 上的数据工程师与数据库从业者打造的专业技能套件。"
  },
  {
    "regex": "^(\\d+)\\s+tools?\\s+disabled$",
    "replacement": "已禁用 $1 个工具"
  },
  {
    "regex": "^Disable\\s+(.+)\\s+tool\\s+for\\s+(.+)$",
    "replacement": "为 $2 禁用 $1 工具"
  },
  {
    "regex": "^Enable\\s+(.+)\\s+tool\\s+for\\s+(.+)$",
    "replacement": "为 $2 启用 $1 工具"
  },
  {
    "regex": "^Auth code for (.+)$",
    "replacement": "$1 的授权码"
  },
  {
    "regex": "^The (.+) MCP server requires configuration parameters before it can be started\\.?$",
    "replacement": "$1 MCP 服务需要先配置参数才能启动。"
  },
  {
    "regex": "^See more in (.+)$",
    "replacement": "在 $1 中查看更多"
  },
  {
    "regex": "^(?:See less|收起) in (.+)$",
    "replacement": "在 $1 中收起"
  },
  {
    "regex": "^(?:More actions|更多操作) for (.+)$",
    "replacement": "$1 的更多操作"
  },
  {
    "regex": "^Failed to enable plugin (.+)$",
    "replacement": "启用插件 $1 失败"
  },
  {
    "regex": "^Failed to update agent:\\s*(.+)$",
    "replacement": "更新智能体失败：$1"
  },
  {
    "regex": "^Failed to remove agent:\\s*(.+)$",
    "replacement": "移除智能体失败：$1"
  },
  {
    "regex": "^Failed to remove plugin:\\s*(.+)$",
    "replacement": "移除插件失败：$1"
  },
  {
    "regex": "^Failed to toggle plugin:\\s*(.+)$",
    "replacement": "切换插件状态失败：$1"
  },
  {
    "regex": "^Error updating agent:\\s*(.+)$",
    "replacement": "更新智能体出错：$1"
  },
  {
    "regex": "^Failed to write MCP config:\\s*(.+)$",
    "replacement": "写入 MCP 配置失败：$1"
  },
  {
    "regex": "^Unnamed [Aa]gent (\\d+)$",
    "replacement": "未命名智能体 $1"
  },
  {
    "regex": "^Unnamed [Ss]kill (\\d+)$",
    "replacement": "未命名技能 $1"
  },
  {
    "regex": "^UI Extension (\\d+)$",
    "replacement": "界面扩展 $1"
  },
  {
    "regex": "^Automation (\\d+)$",
    "replacement": "自动化任务 $1"
  },
  {
    "regex": "^Rule (\\d+)$",
    "replacement": "规则 $1"
  },
  {
    "regex": "^Show (\\d+) breakdowns?$",
    "replacement": "显示 $1 项明细"
  },
  {
    "regex": "^(.+),\\s*setup required$",
    "replacement": "$1（需要配置）"
  },
  {
    "regex": "^Your\\s+plan's\\s+baseline\\s+quota\\s+will\\s+refresh\\s+on\\s+(.+?)\\.\\s+You\\s+can\\s+upgrade\\s+to\\s+a\\s+Google\\s+AI\\s+Ultra\\s+plan\\s+to\\s+receive\\s+higher\\s+rate\\s+limits[。.]?$",
    "replacement": "您的套餐基础配额将于 $1 重置刷新。您可以升级至 Google AI Ultra 以获取更高的请求配额与速率上限。"
  },
  {
    "regex": "^Your\\s+plan's\\s+baseline\\s+quota\\s+will\\s+refresh\\s+on\\s+(.+?)\\.\\s+To\\s+continue\\s+using\\s+this\\s+model\\s+now,\\s*enable\\s+AI\\s+Credit\\s+overages[。.]?$",
    "replacement": "您的套餐基础配额将于 $1 重置刷新。若要立即继续使用此模型，请启用超额 AI 积分计费。"
  },
  {
    "regex": "^Your\\s+plan's\\s+baseline\\s+quota\\s+will\\s+refresh\\s+on\\s+([^.。]+)[。.]?$",
    "replacement": "您的套餐基础配额将于 $1 重置刷新。"
  },
  {
    "regex": "^(?:Model|Your)\\s+quota\\s+will\\s+refresh\\s+on\\s+([^.。]+)[。.]?$",
    "replacement": "您的模型配额将于 $1 重置刷新。"
  },
  {
    "regex": "^You\\s+need\\s+at\\s+least\\s+(\\d+)\\s+AI\\s+Credits\\s+to\\s+send\\s+messages[。.]?$",
    "replacement": "您至少需要 $1 点 AI 积分才能发送消息。"
  },
  {
    "regex": "^To\\s+continue\\s+using\\s+this\\s+model\\s+now,\\s*purchase\\s+more\\s+AI\\s+Credits[。.]?$",
    "replacement": "若要立即继续使用此模型，请购买更多 AI 积分。"
  },
  {
    "regex": "^To\\s+continue\\s+using\\s+this\\s+model\\s+now,\\s*enable\\s+AI\\s+Credit\\s+overages[。.]?$",
    "replacement": "若要立即继续使用此模型，请启用超额 AI 积分计费。"
  },
  {
    "regex": "^To\\s+continue\\s+using\\s+(.+?)\\s+now,\\s*purchase\\s+more\\s+AI\\s+Credits[。.]?$",
    "replacement": "若要立即继续使用 $1，请购买更多 AI 积分。"
  },
  {
    "regex": "^To\\s+continue\\s+using\\s+(.+?)\\s+now,\\s*enable\\s+AI\\s+Credit\\s+overages[。.]?$",
    "replacement": "若要立即继续使用 $1，请启用超额 AI 积分计费。"
  },
  {
    "regex": "^Available\\s+AI\\s+Credits:\\s*(.+)$",
    "replacement": "可用 AI 积分：$1"
  },
  {
    "regex": "^Shared\\s+with:\\s*(.+)$",
    "replacement": "共享模型：$1"
  },
  {
    "regex": "^Your\\s+Plan:\\s*(.+)$",
    "replacement": "当前方案：$1"
  },
  {
    "regex": "^(\\d+)\\s+models\\s+selected$",
    "replacement": "已选择 $1 个模型"
  },
  {
    "regex": "^Select\\s+model,\\s*current:\\s*(.+)$",
    "replacement": "选择模型，当前：$1"
  },
  {
    "regex": "^You have (\\d+) conversations in progress\\. Updating will interrupt them, and they will automatically resume once the update completes\\.$",
    "replacement": "您当前有 $1 个正在进行的会话。更新将暂时中断这些会话，并在更新完成后自动恢复。"
  },
  {
    "regex": "^You have (\\d+) conversations in progress\\. Updating will cancel them and you'll need to manually restart them\\.$",
    "replacement": "您当前有 $1 个正在进行的会话。更新将取消这些会话，更新后您需要手动重新开始。"
  },
  {
    "regex": "^Set up (.+)$",
    "replacement": "设置 $1"
  },
  {
    "regex": "^Review permissions for (.+)$",
    "replacement": "审查 $1 的权限"
  },
  {
    "regex": "^(.+) needs a few details from you before it can run\\.$",
    "replacement": "$1 运行前需要您补充几项详细信息。"
  },
  {
    "regex": "^Agents created by (.+) run in a dedicated (?:project|workspace) with its own permissions, which you can change anytime in the (?:project|workspace) settings page\\. On top of those defaults, (.+) requests the access below\\.$",
    "replacement": "由 $1 创建的智能体将在专属工作区中运行并拥有独立权限，您可以随时在设置页面中更改。除默认权限外，$2 还请求以下访问权限。"
  },
  {
    "regex": "^Agents created by (.+) run in a dedicated (?:project|workspace) with its own permissions, which you can change anytime in the (?:project|workspace) settings page\\.$",
    "replacement": "由 $1 创建的智能体将在专属工作区中运行并拥有独立权限，您可以随时在设置页面中更改。"
  },
  {
    "regex": "^On top of those defaults, (.+) requests the access below\\.$",
    "replacement": "除默认权限外，$1 还请求以下访问权限。"
  },
  {
    "regex": "^Failed to load skills:\\s*(.+)$",
    "replacement": "加载技能失败：$1"
  },
  {
    "regex": "^Failed to scan skills config file:\\s*(.+)$",
    "replacement": "扫描技能配置文件失败：$1"
  },
  {
    "regex": "^Failed to load page (\\d+):\\s*(.+)$",
    "replacement": "加载第 $1 页失败：$2"
  },
  {
    "regex": "^Failed to load text layer for page (\\d+):\\s*(.+)$",
    "replacement": "加载第 $1 页的文本图层失败：$2"
  },
  {
    "regex": "^Text layer render failed:\\s*(.+)$",
    "replacement": "文本图层渲染失败：$1"
  },
  {
    "regex": "^Failed to initialize text layer:\\s*(.+)$",
    "replacement": "初始化文本图层失败：$1"
  },
  {
    "regex": "^Tool Definition:\\s*(.+)$",
    "replacement": "工具定义：$1"
  },
  {
    "regex": "^Invocation:\\s*(.+)$",
    "replacement": "调用：$1"
  },
  {
    "regex": "^Agent permissions preset selector, current:\\s*(.+)$",
    "replacement": "智能体权限预设选择器，当前：$1"
  },
  {
    "regex": "^([\\d,]+)\\s*\\/\\s*([\\d,]+)\\s*tokens\\s*\\(([\\d.]+%)\\)$",
    "replacement": "$1 / $2 个 Token ($3)"
  },
  {
    "regex": "^\\(([\\d,]+)\\s*tokens\\)\\s*([\\d.]+%)$",
    "replacement": "($1 个 Token) $2"
  },
  {
    "regex": "^\\(([\\d,]+)\\s*tokens\\)$",
    "replacement": "($1 个 Token)"
  },
  {
    "regex": "^Unused capacity:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "未用容量：$1 个 Token"
  },
  {
    "regex": "^Rules:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "规则：$1 个 Token"
  },
  {
    "regex": "^Skills:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "技能：$1 个 Token"
  },
  {
    "regex": "^Subagents:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "子智能体：$1 个 Token"
  },
  {
    "regex": "^MCP Tools:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "MCP 工具：$1 个 Token"
  },
  {
    "regex": "^MCP Servers:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "MCP 服务：$1 个 Token"
  },
  {
    "regex": "^System Prompt:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "系统提示词：$1 个 Token"
  },
  {
    "regex": "^Customizations:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "自定义扩展：$1 个 Token"
  },
  {
    "regex": "^Other Customizations:\\s*([\\d,]+)\\s*tokens$",
    "replacement": "其他自定义扩展：$1 个 Token"
  },
  {
    "regex": "^(.+):\\s*([\\d,]+)\\s*tokens$",
    "replacement": "$1：$2 个 Token"
  },
  {
    "regex": "^(\\d+)\\s+demoted$",
    "replacement": "$1 项已降级"
  },
  {
    "regex": "^(\\d+)\\s+excluded$",
    "replacement": "$1 项已排除"
  },
  {
    "regex": "^(\\d+)\\s+tools?\\s+excluded$",
    "replacement": "已排除 $1 个工具"
  },
  {
    "regex": "^(\\d+)\\s+tools$",
    "replacement": "$1 个工具"
  },
  {
    "regex": "^Show\\s+(\\d+)\\s+breakdowns?$",
    "replacement": "显示 $1 项明细"
  },
  {
    "regex": "^(\\d+)\\s+rules?\\s+exceeded the rules budget and (?:was|were) demoted from full inline content to a file-path pointer\\.$",
    "replacement": "$1 条规则超出规则预算，已从完整内联内容降级为文件路径指针。"
  },
  {
    "regex": "^(\\d+)\\s+items?\\s+in\\s+(.+?)\\s+exceeded the customization budget and (?:was|were) excluded from context\\.$",
    "replacement": "$2 中的 $1 个项目超出自定义扩展预算，已从上下文中排除。"
  },
  {
    "regex": "^Exceeded the rules token budget\\. Full rule content \\(([\\d,]+)\\s*tokens\\) was replaced with a lightweight file-path pointer in context\\.$",
    "replacement": "已超出规则 Token 预算。完整规则内容（$1 个 Token）已在上下文中替换为轻量级文件路径指针。"
  },
  {
    "regex": "^All tools in this MCP server \\(([\\d,]+)\\s*tokens\\) exceeded the customization budget and were excluded from context\\.$",
    "replacement": "此 MCP 服务中的所有工具（$1 个 Token）均超出自定义扩展预算，已从上下文中排除。"
  },
  {
    "regex": "^(\\d+)\\s+tools?\\s+in this MCP server \\(([\\d,]+)\\s*tokens\\) exceeded the customization budget and were excluded from context\\.$",
    "replacement": "此 MCP 服务中的 $1 个工具（$2 个 Token）超出自定义扩展预算，已从上下文中排除。"
  },
  {
    "regex": "^Exceeded the customization token budget \\(([\\d,]+)\\s*tokens\\) and was excluded from context\\.$",
    "replacement": "已超出自定义扩展 Token 预算（$1 个 Token），已从上下文中排除。"
  },
  {
    "regex": "^Worked\\s+for\\s+(\\d+)\\s*d\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m$",
    "replacement": "已工作 $1 天 $2 小时 $3 分钟"
  },
  {
    "regex": "^Stopped\\s+after\\s+(\\d+)\\s*d\\s+(\\d+)\\s*h\\s+(\\d+)\\s*m$",
    "replacement": "在 $1 天 $2 小时 $3 分钟后停止"
  },
  {
    "regex": "^Send\\s+feedback\\s+as\\s+(.+)$",
    "replacement": "以 $1 身份发送反馈"
  },
  {
    "regex": "^Branch\\s+([a-zA-Z0-9_\\-\\.\\/]+)$",
    "replacement": "分支 $1"
  },
  {
    "regex": "^All changes since\\s+(.+)$",
    "replacement": "自 $1 以来的全部更改"
  },
  {
    "regex": "^(\\d+)\\s+commits?\\s+to\\s+push$",
    "replacement": "$1 个待推送的提交"
  },
  {
    "regex": "^(\\d+)\\s+commits?\\s+to\\s+pull$",
    "replacement": "$1 个待拉取的提交"
  },
  {
    "regex": "^Send\\s+[mM]essage\\s+(Enter|Return|Ctrl\\+Enter|Cmd\\+Enter|↵)$",
    "replacement": "发送消息 $1"
  },
  {
    "regex": "^Send\\s+[mM]essage\\s+\\((Enter|Return|Ctrl\\+Enter|Cmd\\+Enter|↵)\\)$",
    "replacement": "发送消息 ($1)"
  },
  {
    "regex": "^e\\.g\\.,?\\s+(.+)$",
    "replacement": "例如：$1"
  },
  {
    "regex": "^main\\s+\\(or\\s+e\\.g\\.,\\s*(.+)\\)$",
    "replacement": "main（或例如：$1）"
  },
  {
    "regex": "^Setting up WSL:\\s*(.+)$",
    "replacement": "正在配置 WSL：$1"
  }
].map(p => [new RegExp(p.regex, 'i'), p.replacement]);

// ============================================================================
// 4. 局部片段替换规则 (PARTIAL_TRANSLATIONS)
// ============================================================================

const PARTIAL_TRANSLATIONS = [
  [
    "Learn more.",
    "了解更多。"
  ],
  [
    "your plan. Enable AI Credit Overages to continue using models when your quota is exhausted.",
    "您的套餐。启用 AI 点数超额使用以在额度用尽时继续使用模型。"
  ],
  [
    "Inherits from global settings.",
    "继承自全局设置。"
  ],
  [
    "Local permissions have higher priority.",
    "本地权限具有更高优先级。"
  ],
  [
    "Manage your plan, credentials, and general preferences.",
    "管理您的套餐、凭据和常规偏好。"
  ],
  [
    "Configure global allowed and denied resource permissions.",
    "配置全局允许和拒绝的资源权限。"
  ],
  [
    "Configure AI models and view your quota.",
    "配置 AI 模型并查看额度。"
  ],
  [
    "Configure default behaviors, skills, and MCP servers.",
    "配置默认行为、技能和 MCP 服务器。"
  ],
  [
    "View your available model quota and AI credits.",
    "查看您的可用模型额度和 AI 点数。"
  ],
  [
    "Model quota refreshes periodically based on",
    "模型额度会根据规则定期刷新"
  ],
  [
    "You currently don't have any MCP Servers installed.",
    "您当前尚未安装任何 MCP 服务器。"
  ],
  [
    "Add an MCP server above",
    "请在上方添加 MCP 服务器"
  ],
  [
    "Orchestrates Android development tasks including project creation, deployment, SDK management, and environment diagnostics using the `android` command-line tool.",
    "使用 `android` 命令行工具编排 Android 开发任务，包括项目创建、部署、SDK 管理和环境诊断。"
  ],
  [
    "AI Credits are used when you've exceeded your model quota. Keep track of your current AI Credits in the",
    "当您超出模型额度时会使用 AI 点数。您可以在以下位置跟踪当前 AI 点数："
  ],
  [
    "Antigravity would like to use the browser.",
    "Antigravity 想要使用浏览器。"
  ],
  [
    "Are you sure you want to delete the scheduled task",
    "确定要删除定时任务"
  ],
  [
    "by allowing Google to collect and use my Interactions data, subject to the",
    "允许 Google 收集并使用我的交互数据，受以下条款约束："
  ],
  [
    "Commands the agent can run outside the sandbox in this workspace.",
    "智能体可在此工作区的沙盒外运行的命令。"
  ],
  [
    "Commands the agent can run outside the sandbox.",
    "智能体可在沙盒外运行的命令。"
  ],
  [
    "Confirm the command is safe to run outside of the sandbox with full network and disk access.",
    "请确认该命令可在沙盒外安全运行，并拥有完整网络和磁盘访问权限。"
  ],
  [
    "Controls whether terminal commands require your approval before running.",
    "控制终端命令运行前是否需要您的批准。"
  ],
  [
    "does not collect any of your prompts, content, or model responses but will still collect general usage patterns",
    "不会收集您的任何提示词、内容或模型响应，但仍会收集一般使用模式"
  ],
  [
    "Long pages like this one will be broken down into outlines and read as needed.",
    "像这样的长页面会被拆分成大纲，并按需读取。"
  ],
  [
    "Model must be available on the Gemini API and use the gemini-api scheme.",
    "模型必须可通过 Gemini API 使用，并使用 gemini-api 协议。"
  ],
  [
    "Now that you've created a project, configure your project's agent settings or start a conversation.",
    "您已创建项目，现在可以配置项目的智能体设置或开始对话。"
  ],
  [
    "options. Agent settings and permissions can be further customized below.",
    "选项。下方可进一步自定义智能体设置和权限。"
  ],
  [
    "Pages currently open in Antigravity's Browser instance are shown below.",
    "下方显示当前在 Antigravity 浏览器实例中打开的页面。"
  ],
  [
    "Paths the agent can modify inside this workspace.",
    "智能体可在此工作区内修改的路径。"
  ],
  [
    "Paths the agent can modify.",
    "智能体可修改的路径。"
  ],
  [
    "Paths the agent can read inside this workspace.",
    "智能体可在此工作区内读取的路径。"
  ],
  [
    "Paths the agent can read.",
    "智能体可读取的路径。"
  ],
  [
    "Please describe the feature you'd like to see.",
    "请描述您希望看到的功能。"
  ],
  [
    "Please describe the issue in detail.",
    "请详细描述该问题。"
  ],
  [
    "Please list the steps to reproduce the issue",
    "请列出复现该问题的步骤"
  ],
  [
    "Please verify your account to continue using",
    "请验证您的账户以继续使用"
  ],
  [
    "The Agent attempted to interact with some sites that are not allowlisted",
    "智能体尝试与一些未加入允许列表的网站交互"
  ],
  [
    "The agent can read and edit your Google Drive documents.",
    "智能体可以读取和编辑您的 Google Drive 文档。"
  ],
  [
    "The agent was prevented from accessing some sites",
    "智能体已被阻止访问某些网站"
  ],
  [
    "The agent will wait for you to install the browser extension.",
    "智能体将等待您安装浏览器扩展。"
  ],
  [
    "There was an error with your authentication.",
    "您的身份验证出现错误。"
  ],
  [
    "This error is likely temporary.",
    "此错误可能是暂时性的。"
  ],
  [
    "To use the Google Workspace CLI",
    "要使用 Google Workspace CLI"
  ],
  [
    "URLs the agent can actuate on in this workspace.",
    "智能体可在此工作区中操作的网址。"
  ],
  [
    "URLs the agent can actuate on using the browser.",
    "智能体可使用浏览器操作的网址。"
  ],
  [
    "URLs the agent can read or open in the browser.",
    "智能体可在浏览器中读取或打开的网址。"
  ],
  [
    "URLs the agent can read or open in this workspace.",
    "智能体可在此工作区中读取或打开的网址。"
  ],
  [
    "View your available model quota and AI credits. Model quota refreshes periodically based on your plan. Enable AI Credit Overages to continue using models when your quota is exhausted.",
    "查看您的可用模型额度和 AI 点数。模型额度会根据您的套餐定期刷新。启用 AI 点数超额使用后，即使额度耗尽也可继续使用模型。"
  ],
  [
    "View your available model quota. Quota refreshes periodically based on your plan.",
    "查看您的可用模型额度。额度会根据您的套餐定期刷新。"
  ],
  [
    "We recommend attaching logs.",
    "建议附加日志。"
  ],
  [
    "When debug mode is on, you can see additional information about each steps in the conversation.",
    "开启调试模式后，您可以在对话中查看每个步骤的更多信息。"
  ],
  [
    "When enabled, Agent is given awareness of lint errors created by its edits and may fix them without explicit user prompting.",
    "启用后，智能体会感知其编辑产生的 lint 错误，并可在无需明确提示的情况下修复它们。"
  ],
  [
    "When enabled, Agent will use IDE's shell integration to detect and report terminal command execution.",
    "启用后，智能体将使用 IDE 的 Shell 集成来检测并报告终端命令执行情况。"
  ],
  [
    "When enabled, Antigravity will play a sound when Agent finishes generating a response.",
    "启用后，智能体完成响应生成时 Antigravity 会播放声音。"
  ],
  [
    "When enabled, sandboxed commands are allowed to make network requests.",
    "启用后，沙盒命令可以发起网络请求。"
  ],
  [
    "When enabled, the agent will be able to access past conversations to inform its responses.",
    "启用后，智能体可以访问过去的对话以辅助生成回答。"
  ],
  [
    "When enabled, the agent will include default customizations, including default skills.",
    "启用后，智能体将包含默认自定义项，包括默认技能。"
  ],
  [
    "Your administrator has disabled MCP servers for this workspace.",
    "您的管理员已为此工作区禁用 MCP 服务器。"
  ],
  [
    "Your AI credits balance is too low to continue.",
    "您的 AI 点数余额过低，无法继续。"
  ],
  [
    "Your model does not support this media.",
    "您的模型不支持此媒体。"
  ],
  [
    "Your quota for this model is running low.",
    "此模型的额度即将用尽。"
  ],
  [
    "Plugins are packaged collections of skills and MCPs to help the Agent in",
    "插件是技能和 MCP 的打包集合，可帮助智能体在"
  ],
  [
    "work with Google developer products. You can always change your choices in Settings.",
    "中使用 Google 开发者产品。您可以随时在“设置”中更改选择。"
  ],
  [
    "Shared conversations live in your x20 user directory, so readers need",
    "分享的对话保存在您的 x20 用户目录中，因此读者需要"
  ],
  [
    "Your feedback directly improves Gemini. See",
    "您的反馈将直接帮助改进 Gemini。请参阅"
  ],
  [
    "To write effective feedback, see our",
    "要编写有效的反馈，请参阅我们的"
  ],
  [
    "Welcome to ",
    "欢迎来到 "
  ],
  [
    ". I coordinate across the conversations in this project—keeping track of what's in flight, what's decided, and how the pieces fit together.",
    "。我负责统筹协调此项目中的所有对话——跟踪进行中的任务、已确定的决策，以及各个部分如何协同配合。"
  ],
  [
    "I coordinate across the conversations in this project—keeping track of what's in flight, what's decided, and how the pieces fit together.",
    "我负责统筹协调此项目中的所有对话——跟踪进行中的任务、已确定的决策，以及各个部分如何协同配合。"
  ],
  [
    "You can follow the conversations I create in the sidebar, and jump in anytime to steer them directly or talk to me here.",
    "您可以在侧边栏中跟进我创建的对话，并随时介入直接引导，或在此处与我交流。"
  ],
  [
    ". I coordinate the work for this project. Ask me a question or hand me a task, and I'll answer directly or start workers that run in parallel.",
    "。我负责统筹协调此项目的工作。您可以向我提问或交办任务，我会直接解答，或启动多个并行运行的工作节点 (Workers)。"
  ],
  [
    "I coordinate the work for this project. Ask me a question or hand me a task, and I'll answer directly or start workers that run in parallel.",
    "我负责统筹协调此项目的工作。您可以向我提问或交办任务，我会直接解答，或启动多个并行运行的工作节点 (Workers)。"
  ],
  [
    "You can follow the workers in the Dashboard, and I'll post an update when something finishes or needs you.",
    "您可以在仪表盘 (Dashboard) 中跟进各个工作节点的进展，当任务完成或需要您介入时，我会及时发布更新。"
  ],
  [
    "Customize your experience across the agent, plugins, and product from the settings and marketplace. We won’t show you ads or let advertisers influence what ",
    "您可以通过“设置”和插件市场全面定制智能体、插件与产品体验。我们绝不会向您展示广告，也不会让广告商影响 "
  ],
  [
    "’s agents are powerful and will help you get a lot done better and faster than before, but still make sure to verify the actions taken by the agent.",
    " 的智能体功能强大，能够帮助您比以往更快、更好地完成大量工作，但仍请务必核实智能体所执行的操作。"
  ],
  [
    "Plugins are packaged collections of skills and MCPs to help the Agent in ",
    "插件是技能 (Skills) 与 MCP 的打包集合，可帮助 "
  ],
  [
    " work with Google developer products. You can always change your choices in Settings.",
    " 中的智能体配合 Google 开发者产品协同工作。您随时可以在设置中更改您的选择。"
  ],
  [
    "To use another account, add it in the ",
    "如需使用其他账户，请在 "
  ],
  [
    "To add another account, go to the ",
    "如需添加其他账户，请前往 "
  ],
  [
    "Sign in from the ",
    "请从 "
  ],
  [
    "Your use is subject to the ",
    "您的使用受以下条款约束："
  ],
  [
    "when working in this project.",
    "（在当前项目中使用时）。"
  ],
  [
    "when working in these conversations.",
    "（在这些对话中使用时）。"
  ]
];

  // --- Antigravity 2.35.0 新增动态正则模板规则 ---
  const V4_235_REGEX_RULES = [
    [/^SSH:\s*(.+)$/i, 'SSH：$1'],
    [/^(.+),\s*showing\s+(\d+)\s+of\s+(\d+)$/i, '$1（当前显示 $2 / $3）'],
    [/^(\d+)\s+questions?$/i, '$1 个问题'],
    [/^See\s+(.+?):\s*(.+)$/i, '查看 $1：$2'],
    [/^(Allow|Ask|Deny)\s+(.+)\s+tool\s+for\s+(.+)$/i, (_, act, tool, scope) => {
      const m = { allow: '允许', ask: '询问', deny: '拒绝' };
      return `对 ${scope} ${m[act.toLowerCase()] || act} ${tool} 工具`;
    }],
    [/^The user signed in to the plugin "(.+)" \(catalog id: (.+)\) from the card in your last reply\. Retry the task with it\.$/i,
      '用户已通过上一条回复中的卡片登录插件“$1”（目录 ID：$2），正在使用该插件重试任务。'],
    [/^The user installed the (plugin|skill) "(.+)" \(catalog id: (.+)\) from the suggestion card in your last reply\.([\s\S]*)$/i,
      (_, kind, name, id) => `用户已通过推荐卡片安装${/skill/i.test(kind) ? '技能' : '插件'}“${name}”（目录 ID：${id}）。`],
    [/^Delete cookies for (.+)$/i, '删除 $1 的 Cookie'],
    [/^No sites match [“"](.+)[”"]\.?$/i, '没有匹配“$1”的站点。'],
    [/^Couldn't delete cookies for\s+(.+?)\.?$/i, '无法删除 $1 的 Cookie。'],
    [/^Revoke all:\s*(.+)$/i, '全部撤销：$1'],
    [/^Revoke:\s*(.+)$/i, '撤销：$1'],
    [/^All (.+) will be revoked\. The plugin will ask before doing this again\.$/i, '将撤销全部“$1”权限。该插件下次执行此操作前会重新向您询问。'],
    [/^Review (.+) before installing$/i, '安装前审查 $1'],
    [/^Add bundle (.+)$/i, '添加插件包 $1'],
    [/^Adding plugins from (.+)$/i, '正在从 $1 添加插件'],
    [/^This plugin in (.+) may have looser code review\. Review its contents before adding the bundle\.$/i, '$1 中的此插件可能未经严格代码审查。请在添加插件包前仔细检查其内容。'],
    [/^These plugins in (.+) may have looser code review\. Review their contents before adding the bundle\.$/i, '$1 中的这些插件可能未经严格代码审查。请在添加插件包前仔细检查其内容。'],
    [/^Plan,\s*(\d+)\s+of\s+(\d+)\s+steps?\s+done$/i, '计划进度：已完成 $1 / $2 步'],
    [/^(\d+)\.\s*(Expand|Collapse)\s+plan$/i, (_, n, act) => `${n}. ${/expand/i.test(act) ? '展开' : '折叠'}计划`],
    [/^\(Steps\s+(\d+)[–-](\d+)\)$/i, '（第 $1–$2 步）'],
    [/^\((\d+)\s+steps?\)$/i, '（$1 步）'],
    [/^Checkpoint #(\d+)$/i, '检查点 #$1'],
    [/^Retrying transcription \(attempt (\d+)\)[….]*$/i, '正在重试语音转写（第 $1 次尝试）…'],
    [/^Show (\d+) more subagents?$/i, '展开另外 $1 个子智能体'],
    [/^Move this conversation to "(.+)"\?$/i, '确认将此对话移动到“$1”吗？'],
    [/^Remove this conversation from its (workspace|project)\?$/i, (_, kind) => `确认将此对话从当前${/workspace/i.test(kind) ? '工作区' : '项目'}中移除吗？`],
    [/^Remove from (Workspace|Project)$/i, (_, kind) => `从${/workspace/i.test(kind) ? '工作区' : '项目'}移除`],
    [/^Move to (.+)$/i, '移动到 $1'],
    [/^New (.+)\.\.\.$/i, '新建 $1...'],
    [/^More options for (.+)$/i, '$1 的更多选项'],
    [/^Opens the New Conversation screen for this (.+)$/i, '为此 $1 打开新建对话界面'],
    [/^You're signing in on (.+)\. Your sign-in stays on that machine\.$/i, '您正在登录 $1，登录状态将保存在该远程机器上。'],
    [/^Relaunch (.+) to finish Screen Recording\.$/i, '重新启动 $1 以完成屏幕录制权限配置。'],
    [/^The preview did not respond on port (\d+)\.$/i, '端口 $1 上的预览服务未响应。'],
    [/^Live preview unavailable\s*·\s*(.+)$/i, '实时预览不可用 · $1'],
    [/^(\d+)\s+waiting on you$/i, '$1 项正在等待您的处理'],
    [/^(\d+)\s+Drafts?$/i, '$1 份草稿'],
    [/^(\d+)\s+tools?\s+enabled$/i, '已启用 $1 个工具'],
    [/^(\d+)\s+tools?\s+disabled$/i, '已禁用 $1 个工具'],
    [/^Reset (\d+) overrides?$/i, '重置 $1 项自定义覆盖'],
    [/^Open image (\d+) of (\d+)$/i, '打开第 $1 / $2 张图片'],
    [/^Line (\d+)\s*→\s*(\d+)$/i, '第 $1 → $2 行'],
    [/^Artifact image (\d+)$/i, '产物图片 $1'],
    [/^UI Plugin (.+)$/i, 'UI 插件：$1'],
    [/^From (.+)$/i, (_, src) => (/^[A-Za-z0-9 _.\-]+$/.test(src) && src.length < 40 ? `来自 ${src}` : `来自 ${src}`)],
    [/^Dismiss:\s*(.+)$/i, '忽略：$1'],
    [/^Stop (.+)\?$/i, '确认停止 $1 吗？'],
    [/^Couldn't (archive|unarchive|delete|rename|pin|unpin|resolve) conversation$/i, (_, act) => {
      const map = { archive: '归档', unarchive: '取消归档', delete: '删除', rename: '重命名', pin: '置顶', unpin: '取消置顶', resolve: '解决' };
      return `无法${map[act.toLowerCase()] || act}对话`;
    }],
    [/^Failed to (archive|unarchive|delete|rename|pin|unpin|resolve) conversation$/i, (_, act) => {
      const map = { archive: '归档', unarchive: '取消归档', delete: '删除', rename: '重命名', pin: '置顶', unpin: '取消置顶', resolve: '解决' };
      return `${map[act.toLowerCase()] || act}对话失败`;
    }],
    [/^(.+) archived$/i, '$1 已归档'],
    [/^(.+) deleted$/i, '$1 已删除'],
    [/^(.+) requires (.+)\.$/i, '$1 需要依赖 $2。'],
    [/^Missing Worker RPC batch result for (.+) \(id=(.+)\)$/i, '缺少 $1 的工作线程 RPC 批处理结果 (id=$2)'],
    [/^Quoted "@self" on "(.+)" compares against the literal string "@self"; use unquoted self \(e\.g\. (.+)\), is_self\((.+)\), or matches_principal\((.+), "@self"\)$/i,
      '在“$1”上使用带引号的 "@self" 会按普通字符串字面量比较；请改用不带引号的 self（例如 $2）、is_self($3) 或 matches_principal($4, "@self")'],
    [/^"(.+)" does not support standalone self matching; constrain (.+)$/i, '“$1”不支持单独匹配 self；请添加约束条件：$2'],
    [/^Negated condition on "(.+)" \("!=="?|"!=" or "!"\) cannot be indexed up front; add a positive "&&" anchor on (.+)$/i,
      '“$1”上的否定条件（"!=" 或 "!"）无法预先建立索引；请在 $2 上添加正向 "&&" 锚定条件'],
    [/^Range or zero comparison on "(.+)" cannot extract an exact index key; use "==" or "in \[\.\.\.\]" with a positive value, or add a positive "&&" anchor on (.+)$/i,
      '“$1”上的范围或零值比较无法提取精确索引键；请改用带正向值的 "==" 或 "in [...]"，或在 $2 上添加正向 "&&" 锚定条件'],
    [/^Substring or regex match on "(.+)" cannot be indexed up front; use exact "==", "in \[\.\.\.\]", or prefix matching, or add a positive "&&" anchor on (.+)$/i,
      '“$1”上的子串或正则匹配无法预先建立索引；请改用精确 "=="、"in [...]" 或前缀匹配，或在 $2 上添加正向 "&&" 锚定条件'],
    [/^Expression only constrains non-indexed fields; click a Target chip below or add a positive "&&" match on (.+)$/i,
      '当前表达式仅约束了非索引字段；请点击下方的目标标签，或在 $1 上添加正向 "&&" 匹配条件'],
  ];

  const V4_235_PARTIAL_RULES = [
    ['Finish signing in to ', '请在浏览器中完成登录：'],
    [' in your browser.', '。'],
    ['No hosts in ', '在 '],
    [' yet. Type one above.', ' 中暂无主机，请在上方直接输入。'],
    ['Messages now send immediately. Configure in ', '消息现在会立即发送。可在 '],
  ];

  return {
    REGEX_TRANSLATIONS: [...V4_235_REGEX_RULES, ...REGEX_TRANSLATIONS],
    COMMUNITY_REGEX_PATTERNS,
    PARTIAL_TRANSLATIONS: [...V4_235_PARTIAL_RULES, ...PARTIAL_TRANSLATIONS],
  };
}

module.exports = { createPatterns };
