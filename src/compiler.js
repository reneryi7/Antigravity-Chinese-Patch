/**
 * Antigravity 中文汉化补丁 v4.0 - 零外部依赖内存级词库编译器
 *
 * 职责：
 * 1. 读取 locales/zh-CN/ 下的分类 JSON 词库与动态规则模块；
 * 2. 在内存中实时组装单文件前端注入载荷（耗时 < 25ms）并通过 V8 Function 语法自检；
 * 3. 提供 Node.js 原生翻译实例与 Electron 主进程静态/动态资产导出。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { initAntigravityZhRuntime } = require('./runtime/engine-template.js');
const { buildMainProcessHookCode } = require('./runtime/main-hook-template.js');
const { PRELOAD_IPC_SNIPPET } = require('./runtime/preload-ipc-snippet.js');

const PATCH_VERSION = '4.0.0';
const TARGET_AGY_VERSION = '2.35.0';
const PATCH_DICT_SIGNATURE = `v${PATCH_VERSION}-${TARGET_AGY_VERSION}`;

const DEFAULT_LOCALES_DIR = path.resolve(__dirname, '..', 'locales', 'zh-CN');

const EXACT_JSON_FILES = [
  'ui-core.json',
  'settings.json',
  'marketplace.json',
  'skills-agents.json',
  'remote-computer.json',
];

let _cachedFrontendBundle = null;
let _cachedMainAssets = null;

function loadLocaleData(localesDir = DEFAULT_LOCALES_DIR) {
  const exact = {};
  const fileStats = {};
  for (const fname of EXACT_JSON_FILES) {
    const fpath = path.join(localesDir, fname);
    const parsed = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    fileStats[fname] = Object.keys(parsed).length;
    Object.assign(exact, parsed);
  }

  const settingsContext = JSON.parse(
    fs.readFileSync(path.join(localesDir, 'settings-context.json'), 'utf8')
  );
  const { createPatterns } = require(path.join(localesDir, 'patterns.js'));
  const mainProcess = require(path.join(localesDir, 'main-process.js'));

  return {
    exact,
    fileStats,
    settingsContext,
    createPatterns,
    mainProcess,
  };
}

/**
 * 编译生成注入到浏览器渲染进程 / Preload / CDP 的自包含单文件 JS 代码
 */
function compileFrontendScript(localesDir = DEFAULT_LOCALES_DIR) {
  if (_cachedFrontendBundle && localesDir === DEFAULT_LOCALES_DIR) {
    return _cachedFrontendBundle;
  }

  const { exact, settingsContext, createPatterns } = loadLocaleData(localesDir);

  const code = `/**
 * Antigravity 中文汉化补丁 - 编译态前端注入载荷 (${PATCH_DICT_SIGNATURE})
 * 自动由 src/compiler.js 从 locales/zh-CN/ 内存编译生成
 */
(() => {
'use strict';
// Antigravity 中文汉化补丁 - 前端翻译引擎注入
const __AGY_CREATE_PATTERNS__ = ${createPatterns.toString()};
const __AGY_INIT_RUNTIME__ = ${initAntigravityZhRuntime.toString()};
const __AGY_EXPORTS__ = __AGY_INIT_RUNTIME__({
  signature: ${JSON.stringify(PATCH_DICT_SIGNATURE)},
  exact: ${JSON.stringify(exact)},
  settingsContext: ${JSON.stringify(settingsContext)},
  createPatterns: __AGY_CREATE_PATTERNS__,
});
if (typeof module !== 'undefined' && module.exports && __AGY_EXPORTS__) {
  module.exports = __AGY_EXPORTS__;
}
})();
`;

  // V8 编译期语法校验（零执行开销，100% 阻断转义错误进入 app.asar）
  new Function(code);

  if (localesDir === DEFAULT_LOCALES_DIR) {
    _cachedFrontendBundle = code;
  }
  return code;
}

/**
 * 在 Node.js 环境中直接创建运行时翻译器（供单元测试与英文覆盖率审计使用）
 */
function createNodeTranslator(localesDir = DEFAULT_LOCALES_DIR) {
  const { exact, settingsContext, createPatterns } = loadLocaleData(localesDir);
  return initAntigravityZhRuntime({
    signature: PATCH_DICT_SIGNATURE,
    exact,
    settingsContext,
    createPatterns,
  });
}

/**
 * 编译生成 Electron 主进程静态规则、动态 Hook 与 Preload IPC 片段
 */
function compileMainProcessAssets(localesDir = DEFAULT_LOCALES_DIR) {
  if (_cachedMainAssets && localesDir === DEFAULT_LOCALES_DIR) {
    return _cachedMainAssets;
  }
  const { mainProcess } = loadLocaleData(localesDir);
  const mainHookCode = buildMainProcessHookCode({
    mainDynamicExact: mainProcess.MAIN_DYNAMIC_EXACT,
    roleLabels: mainProcess.ROLE_LABELS,
  });

  // V8 编译期语法校验
  new Function(mainHookCode);
  new Function(PRELOAD_IPC_SNIPPET);

  const result = {
    staticFileRules: mainProcess.STATIC_FILE_RULES,
    mainDynamicExact: mainProcess.MAIN_DYNAMIC_EXACT,
    roleLabels: mainProcess.ROLE_LABELS,
    mainHookCode,
    preloadIpcSnippet: PRELOAD_IPC_SNIPPET,
  };

  if (localesDir === DEFAULT_LOCALES_DIR) {
    _cachedMainAssets = result;
  }
  return result;
}

module.exports = {
  PATCH_VERSION,
  TARGET_AGY_VERSION,
  PATCH_DICT_SIGNATURE,
  DEFAULT_LOCALES_DIR,
  EXACT_JSON_FILES,
  loadLocaleData,
  compileFrontendScript,
  createNodeTranslator,
  compileMainProcessAssets,
};
