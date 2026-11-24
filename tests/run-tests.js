/**
 * Antigravity 中文汉化补丁 v4.1 - 全面单元测试与 Antigravity 2.35.0 架构回归测试套件
 */

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  PATCH_DICT_SIGNATURE,
  compileFrontendScript,
  createNodeTranslator,
  compileMainProcessAssets,
} = require('../src/compiler.js');
const { generateAutoHealVbs, generateUpdateRunnerVbs } = require('../src/daemon/vbs-templates.js');

const ROOT_DIR = path.resolve(__dirname, '..');

class FakeText {
  constructor(value) {
    this.nodeType = 3;
    this.nodeValue = value;
    this.parentElement = null;
    this.previousSibling = null;
    this.isConnected = true;
  }
}

class FakeElement {
  constructor(tagName = 'DIV', attributes = {}) {
    this.nodeType = 1;
    this.tagName = tagName;
    this.dataset = {};
    this.className = attributes.class || '';
    this.attributes = new Map(Object.entries(attributes));
    this.childNodes = [];
    this.children = [];
    this.parentElement = null;
    this.isConnected = true;
  }

  append(child) {
    if (this.childNodes.length > 0) {
      child.previousSibling = this.childNodes[this.childNodes.length - 1];
    }
    child.parentElement = this;
    this.childNodes.push(child);
    if (child.nodeType === 1) {
      this.children.push(child);
    }
    return child;
  }

  get textContent() {
    return this.childNodes
      .map((child) => (child.nodeType === 3 ? child.nodeValue : child.textContent))
      .join('');
  }

  getAttribute(name) {
    return this.attributes.has(name) ? this.attributes.get(name) : null;
  }

  hasAttribute(name) {
    return this.attributes.has(name);
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  closest(selector) {
    if (selector !== '[role="dialog"]') return null;
    let current = this;
    while (current) {
      if (current.getAttribute && current.getAttribute('role') === 'dialog') {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  }
}

function textElement(value, attributes) {
  const element = new FakeElement('DIV', attributes);
  const text = element.append(new FakeText(value));
  return { element, text };
}

const body = new FakeElement('BODY');
const html = new FakeElement('HTML');
html.append(body);

// 核心翻译断言（包含历史版本高频词条 + Antigravity 2.35.0 全部新增区域与用户截图位置）
const samples = [
  // === 截图 1：设置 -> 通用 (2.35.0 双布局、权限预设、网络规则、输入框) ===
  ['Knowledge Work', '知识办公'],
  ['Simplified interface for research, writing, and everyday tasks.', '面向调研、写作与日常办公任务的精简界面。'],
  ['Software Engineering', '软件工程'],
  ['Full interface for coding, developer tools, and managing agents.', '面向编码开发、开发者工具与多智能体管理的完整界面。'],
  ['Permission preset', '权限预设'],
  ['Network access rules', '网络访问规则'],
  ['Input Box', '输入框'],
  ['Choose which key sends a message in the chat composer.', '选择在对话输入框中用于发送消息的快捷键。'],

  // === 截图 2：自定义 -> 插件市场货架 (Shelves) 与新版插件描述 ===
  ['Design, Creative & Media', '设计、创意与媒体'],
  ['Design, creative, and media tools.', '设计、创意制作与多媒体工具。'],
  ['Productivity & Project Management', '效率与项目管理'],
  ['Cloud Hosting & Deployment', '云托管与部署'],
  ['Science', '科学研究'],
  ['Agent skills, databases, and interactive viewers for scientific research.', '面向科学研究的智能体技能、专业数据库与交互式可视化查看器。'],
  [
    'Build applications and shell workflows with the Gemini Interactions API, Decisions API, Live API, Genie 4 interactive worlds, and Gemini API CLI, including text, image, video, speech, and music generation, managed agents, and real-time multimodal streaming.',
    '使用 Gemini Interactions API、Decisions API、Live API、Genie 4 交互式世界与 Gemini API CLI 构建应用及 Shell 工作流，涵盖文本、图像、视频、语音与音乐生成、托管智能体以及实时多模态流式传输。',
  ],
  ['Science Overview', '科学概览 (Science Overview)'],
  ['Genomics', '基因组学 (Genomics)'],
  ['Structural Biology', '结构生物学 (Structural Biology)'],
  ['Chemistry', '化学信息学 (Chemistry)'],
  ['See more in Build with Google', '查看“使用 Google 构建”中的更多内容'],
  ['See more in Design, Creative & Media', '查看“设计、创意与媒体”中的更多内容'],
  ['See less in Science', '收起“科学研究”'],
  ['Create, edit, review, resize, and brand-check Canva designs with the Canva MCP server.', '通过 Canva MCP 服务器创建、编辑、审阅、调整尺寸并检查 Canva 设计的品牌规范。'],
  ['Resize this Canva design for Instagram and LinkedIn', '将此 Canva 设计调整为适配 Instagram 和 LinkedIn 的尺寸'],
  ['No initial state specified for compound state node', 'No initial state specified for compound state node'],

  // === 2.35.0 新增 Orchestrator 编排器、浏览器 Cookie、快捷键方案、电脑操控与收件箱 ===
  ['Orchestrator Settings', '编排器设置'],
  ['Orchestrator Model', '编排模型 (Orchestrator)'],
  ['Executor Model', '执行模型 (Executor)'],
  ['Thinking effort', '思考深度'],
  ['Browsing data', '浏览数据'],
  ['Clear Browsing Data?', '确认清除浏览数据？'],
  ['Cookies by Site', '按站点管理 Cookie'],
  ['Delete cookies for github.com', '删除 github.com 的 Cookie'],
  ['Keybinding Scheme', '快捷键方案'],
  ['VS Code Default', 'VS Code 默认方案'],
  ['Antigravity (AGY) Style', 'Antigravity (AGY) 风格'],
  ['Dictation languages', '语音听写语言'],
  ['Working Section', '“进行中”独立分组'],
  ['Auto-Resolve', '自动归入已解决'],
  ['Plugin permissions', '插件权限'],
  ['Computer', '电脑操控'],
  ['Starting preview…', '正在启动预览…'],
  ['Waiting for video…', '正在等待画面视频流…'],
  ['A password or secure field is on screen.', '当前屏幕上包含密码或受保护的安全输入框。'],
  ['Plan, 3 of 6 steps done', '计划进度：已完成 3 / 6 步'],
  ['Retrying transcription (attempt 2)…', '正在重试语音转写（第 2 次尝试）…'],
  ['Revoke all: File writes', '全部撤销：File writes'],
  ["You're signing in on prod-server. Your sign-in stays on that machine.", '您正在登录 prod-server，登录状态将保存在该远程机器上。'],

  // === 跨版本基础与动态规则回归 ===
  ['Global Permissions', '全局权限'],
  ['Tool Permissions', '工具权限'],
  ['Ran 3 commands', '已运行 3 个命令'],
  ['Explored 6 files, 1 search', '已探索 6 个文件，1 次搜索'],
  ['Worked for 5m 12s', '已工作 5分钟 12秒'],
  ['Edited 14 files (+120 -30)', '已编辑 14 个文件 (+120 -30)'],
  ['Connect to WSL', '连接到 WSL'],
  ['Ask a side question without interrupting the main conversation', '在不打断主对话的情况下提出旁路问题'],
  ['Unlock the power of agent swarms.', '释放智能体蜂群 (Agent Swarms) 的强大潜能。'],

  // === v4.1 智能体原生术语精校、去商业错译与图标名词恢复 ===
  ['Plan', '计划'],
  ['Current Plan', '当前订阅方案'],
  ['Implementation Plan', '实施方案'],
  ['Walkthrough', '执行总结'],
  ['Proceed', '继续执行'],
  ['Always Proceed', '始终自动执行'],
  ['Ask Before Proceeding', '执行前询问'],
  ['Proceed with Plan', '按计划开始执行'],
  ['Token Usage', 'Token 用量'],
  ['Hooks', '钩子'],
  ['Memory', '记忆 (Memory)'],
  ['Schedule', '定时计划'],
  ['Code', '代码'],
  ['Tree', '目录树'],
  ['PIN', 'PIN 码'],
  ['Ignored', '已忽略'],

  // === v4.1 远程插件市场 106 款扩展内部子技能简介覆盖 ===
  [
    'Call the Gemini API from the shell with gemini-api. Use for media generation (images, TTS, music, video), file and YouTube analysis, audio/video transcription, Deep Research, and sandboxed agents.',
    '通过 `gemini-api` 在命令行调用 Gemini API。适用于多媒体生成（图像、TTS 语音合成、音乐、视频）、文件与 YouTube 视频分析、音频/视频转写、深度调研 (Deep Research) 以及沙箱智能体。'.replace('音频/视频转写', '音视频转写'),
  ],
  [
    'Analyze a file for quality and security issues using SonarQube',
    '使用 SonarQube 分析指定文件的代码质量与安全缺陷',
  ],
  [
    'Auto-approve Railway API calls',
    '自动放行 Railway API 工具调用',
  ],
];

const nodes = samples.map(([source]) => {
  const sample = textElement(source);
  body.append(sample.element);
  return sample.text;
});

// 受保护元素边界测试
const monacoProtected = textElement('Settings', { class: 'monaco-editor view-line' });
body.append(monacoProtected.element);
const xtermProtected = textElement('New Conversation', { class: 'xterm-rows terminal' });
body.append(xtermProtected.element);
const modelProtected = textElement('Gemini 4 Carbon', { 'data-testid': 'model-selector-trigger' });
body.append(modelProtected.element);

// v4.1 斜杠命令芯片 (/plan) 与 @提及芯片保护 + 设置页 Plan 上下文区分测试
const slashMentionChip = new FakeElement('SPAN', { 'data-beautiful-mention': '/plan' });
slashMentionChip.append(new FakeElement('SPAN')).append(new FakeText('/'));
slashMentionChip.append(new FakeElement('SPAN')).append(new FakeText('plan'));
body.append(slashMentionChip);

const settingsModal = new FakeElement('DIV', { role: 'dialog' });
const settingsPlanLabel = textElement('Plan');
settingsModal.append(settingsPlanLabel.element);
body.append(settingsModal);

const inputSample = body.append(
  new FakeElement('INPUT', {
    placeholder: 'Search customizations...',
    'aria-label': 'Search customizations...',
  })
);

// 2.35.0 Computer Use 系统设置权限向导混合内联节点测试
const permGuideWrap = body.append(new FakeElement('DIV'));
permGuideWrap.append(new FakeText('In System Settings, click'));
permGuideWrap.append(new FakeElement('STRONG')).append(new FakeText('+'));
permGuideWrap.append(new FakeText(', choose'));
permGuideWrap.append(new FakeElement('STRONG')).append(new FakeText('Antigravity'));
permGuideWrap.append(new FakeText(', then turn it on.'));

global.document = {
  readyState: 'complete',
  documentElement: html,
  body,
  addEventListener() {},
};
global.window = global;
global.MutationObserver = class {
  observe() {}
  disconnect() {}
};
global.setInterval = () => 1;
global.clearInterval = () => {};

const runtime = createNodeTranslator();

// 1. 验证全部 DOM 样本翻译准确
samples.forEach(([source, expected], idx) => {
  assert.strictEqual(nodes[idx].nodeValue, expected, `翻译不匹配: "${source}" -> "${nodes[idx].nodeValue}"`);
});

// 2. 验证受保护区域绝对不被污染
assert.strictEqual(monacoProtected.text.nodeValue, 'Settings');
assert.strictEqual(xtermProtected.text.nodeValue, 'New Conversation');
assert.strictEqual(modelProtected.text.nodeValue, 'Gemini 4 Carbon');
assert.strictEqual(slashMentionChip.textContent, '/plan', `斜杠命令芯片被误翻: ${slashMentionChip.textContent}`);
assert.strictEqual(settingsPlanLabel.text.nodeValue, '订阅方案', `设置弹窗内 Plan 应译为订阅方案: ${settingsPlanLabel.text.nodeValue}`);
assert.strictEqual(inputSample.getAttribute('placeholder'), '搜索自定义扩展...');

// 3. 验证 2.35.0 Computer Use 混合内联向导翻译
assert.ok(
  permGuideWrap.textContent.includes('在“系统设置”中，点击') &&
    permGuideWrap.textContent.includes('Antigravity') &&
    permGuideWrap.textContent.includes('开启'),
  `Computer Use 混合权限向导未正确汉化: ${permGuideWrap.textContent}`
);

// 4. 验证智能大小写不敏感回退引擎 (Sentence case <-> Title Case 双向免疫)
assert.strictEqual(runtime.translateString('permission PRESET'), '权限预设');
assert.strictEqual(runtime.translateString('NETWORK access RULES'), '网络访问规则');
assert.strictEqual(runtime.translateString('enable browser agent'), '启用浏览器智能体');
// 短全大写缩写与单词小写命令/技能标识符不可被误翻
assert.strictEqual(runtime.translateString('API'), 'API');
assert.strictEqual(runtime.translateString('MCP'), 'MCP');
assert.strictEqual(runtime.translateString('plan'), 'plan');
assert.strictEqual(runtime.translateString('schedule'), 'schedule');
assert.strictEqual(runtime.translateString('browser'), 'browser');
assert.strictEqual(runtime.translateString('automation'), 'automation');
assert.strictEqual(runtime.translateString('research'), 'research');

// 5. 验证长描述省略号截断自适应匹配（如图 2 Gemini API 卡片截断场景）
const truncatedGeminiDesc = 'Build applications and shell workflows with the ...';
const trTruncated = runtime.translateString(truncatedGeminiDesc);
assert.ok(
  trTruncated.includes('Gemini Interactions API') && /[\u4e00-\u9fa5]/.test(trTruncated),
  `长描述截断自适应未生效: ${trTruncated}`
);

// 6. 验证内存编译器输出的浏览器端自包含包与主进程 Hook 100% 合法
const compiledBundle = compileFrontendScript();
assert.ok(compiledBundle.includes(PATCH_DICT_SIGNATURE));
assert.doesNotThrow(() => new Function(compiledBundle));

const mainAssets = compileMainProcessAssets();
assert.ok(mainAssets.mainHookCode.includes('/* __AGY_ZH_MAIN_HOOK_START__ */'));
assert.ok(mainAssets.mainHookCode.includes('update_runner.vbs'));
assert.doesNotThrow(() => new Function(mainAssets.mainHookCode));

// 7. 验证生成的 VBS 脚本 100% 纯 ASCII、动态读取 install_dir.txt（不写死 C 盘路径）、且每个过程首行均有 On Error Resume Next
for (const [scriptName, vbsContent] of [
  ['auto_heal.vbs', generateAutoHealVbs()],
  ['update_runner.vbs', generateUpdateRunnerVbs()],
]) {
  assert.ok(/^[\x00-\x7F]+$/.test(vbsContent), `${scriptName} 必须为 100% 纯 ASCII`);
  assert.ok(vbsContent.includes('install_dir.txt'), `${scriptName} 必须支持从 install_dir.txt 动态读取安装路径`);
  assert.ok(vbsContent.includes('src\\cli.js'), `${scriptName} 必须调用模块化入口 src\\cli.js`);
  const procRegex = /^(Sub|Function)\s+([A-Za-z0-9_]+)\([^)]*\)([\s\S]*?)^End\s+\1/gm;
  let match;
  let procCount = 0;
  while ((match = procRegex.exec(vbsContent)) !== null) {
    procCount++;
    const bodyLines = match[3]
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("'"));
    assert.strictEqual(bodyLines[0], 'On Error Resume Next', `${scriptName} 的 ${match[2]} 首行必须声明 On Error Resume Next`);
  }
  assert.ok(procCount >= 10, `${scriptName} 过程数异常 (${procCount})`);
}

// 8. 验证 install.bat 与 uninstall.bat 100% 纯 ASCII 且包含注册表探测与退出码 77 自动提权
for (const bat of ['install.bat', 'uninstall.bat']) {
  const batText = fs.readFileSync(path.join(ROOT_DIR, bat), 'utf8');
  assert.ok(/^[\x00-\x7F]+$/.test(batText), `${bat} 必须为 100% 纯 ASCII`);
  assert.ok(batText.includes('Verb RunAs'), `${bat} 必须支持系统目录自动 UAC 提权`);
}

// 9. 验证 src/ 与 locales/ 中零本机个人路径硬编码泄漏
function assertNoPersonalHardcoding(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) assertNoPersonalHardcoding(full);
    else {
      const txt = fs.readFileSync(full, 'utf8');
      assert.ok(!/AntigravityData/i.test(txt), `发现本机路径硬编码泄漏: ${full}`);
      assert.ok(!/reneryi/i.test(txt), `发现个人用户名泄漏: ${full}`);
    }
  }
}
assertNoPersonalHardcoding(path.join(ROOT_DIR, 'src'));
assertNoPersonalHardcoding(path.join(ROOT_DIR, 'locales'));

console.log(
  `✓ v4.1 全部单元测试与 2.35.0 架构回归校验通过！（签名: ${PATCH_DICT_SIGNATURE}，精确词条: ${Object.keys(runtime.EXACT_TRANSLATIONS).length}，动态正则: ${runtime.REGEX_TRANSLATIONS.length}）`
);
