/**
 * Antigravity 中文汉化补丁 v4.1 - 前端高性能 DOM 翻译引擎运行时模板
 *
 * 核心能力：
 * 1. 多级极速查表：精确匹配 -> 安全多词大小写不敏感回退 (免疫 Sentence case 改版且不污染单词指令) ->
 *    长文本省略号截断前缀匹配 -> 动态正则 -> 标点/快捷键剥离自适应 -> 多句守恒拆分 -> 局部片段替换
 * 2. 高性能防抖调度：LRU 翻译缓存 + DOM 节点 _agyOriginal O(1) 短路 + rAF 合并批处理 + 多阶段悬浮气泡拦截
 * 3. 零误伤安全边界：严格跳过 Monaco 编辑器、Xterm 终端、代码块、模型选择器与斜杠命令/@提及芯片
 */

'use strict';

function initAntigravityZhRuntime(BUNDLE_DATA) {
  const PATCH_DICT_SIGNATURE = BUNDLE_DATA.signature;
  const EXACT_TRANSLATIONS = BUNDLE_DATA.exact;
  const SETTINGS_CONTEXT_TRANSLATIONS = BUNDLE_DATA.settingsContext;

  const isBrowserEnv = typeof document !== 'undefined';
  const isHotUpgrade = Boolean(
    isBrowserEnv &&
    globalThis.__ANTIGRAVITY_ZH_PATCH_LOADED__ &&
    globalThis.__ANTIGRAVITY_ZH_PATCH_LOADED__ !== PATCH_DICT_SIGNATURE
  );

  if (isBrowserEnv && globalThis.__ANTIGRAVITY_ZH_PATCH_LOADED__ === PATCH_DICT_SIGNATURE) {
    if (typeof globalThis.__agyForceTranslatePage === 'function') {
      try { globalThis.__agyForceTranslatePage(); } catch {}
    }
    return globalThis.__agyRuntimeExports || null;
  }
  if (isBrowserEnv) {
    globalThis.__ANTIGRAVITY_ZH_PATCH_LOADED__ = PATCH_DICT_SIGNATURE;
  }

  const TRANSLATABLE_ATTRS = [
    'placeholder',
    'title',
    'aria-label',
    'alt',
    'data-tooltip',
    'data-title',
    'aria-description',
  ];

  const hasOwn = Object.prototype.hasOwnProperty;
  const translationCache = typeof Map !== 'undefined' ? new Map() : null;
  const MAX_CACHE_SIZE = 12000;

  const translatedValuesSet = typeof Set !== 'undefined' ? new Set(Object.values(EXACT_TRANSLATIONS)) : null;

  // 构建安全大小写不敏感回退索引（免疫 Title Case <-> Sentence case 官方改版）
  // 仅收录长度 >= 4、含字母且非纯大写常量/缩写的词条，避免短缩写误翻
  const lowercaseFallbackMap = typeof Map !== 'undefined' ? new Map() : null;
  // 构建长描述省略号截断自适应索引（按前 24 个小写字符分桶）
  const truncatedPrefixBuckets = typeof Map !== 'undefined' ? new Map() : null;

  if (lowercaseFallbackMap) {
    const keys = Object.keys(EXACT_TRANSLATIONS);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      const v = EXACT_TRANSLATIONS[k];
      if (k.length >= 5 && k.indexOf(' ') !== -1 && /[a-zA-Z]/.test(k) && !/^[A-Z0-9_.\-/]+$/.test(k)) {
        const lk = k.toLowerCase();
        if (!lowercaseFallbackMap.has(lk)) {
          lowercaseFallbackMap.set(lk, v);
        }
      }
      if (truncatedPrefixBuckets && k.length >= 42) {
        const prefixKey = k.slice(0, 24).toLowerCase();
        let bucket = truncatedPrefixBuckets.get(prefixKey);
        if (!bucket) {
          bucket = [];
          truncatedPrefixBuckets.set(prefixKey, bucket);
        }
        bucket.push([k.toLowerCase(), v]);
      }
    }
  }

  function lookupCaseInsensitive(trimmed) {
    if (!lowercaseFallbackMap || trimmed.length < 5 || trimmed.indexOf(' ') === -1) return null;
    if (!/[a-zA-Z]/.test(trimmed) || /^[A-Z0-9_.\-/]+$/.test(trimmed)) return null;
    const hit = lowercaseFallbackMap.get(trimmed.toLowerCase());
    return hit !== undefined ? hit : null;
  }

  function lookupTruncatedEllipsis(trimmed) {
    if (!truncatedPrefixBuckets || trimmed.length < 26) return null;
    const m = trimmed.match(/^([\s\S]{24,}?)(?:\.\.\.|…)$/);
    if (!m) return null;
    const stem = m[1].trimEnd();
    if (stem.length < 24) return null;
    const stemLower = stem.toLowerCase();
    const bucket = truncatedPrefixBuckets.get(stemLower.slice(0, 24));
    if (!bucket) return null;
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i][0].indexOf(stemLower) === 0) {
        return bucket[i][1];
      }
    }
    return null;
  }

  function cacheGet(key) {
    return translationCache && translationCache.has(key) ? translationCache.get(key) : undefined;
  }

  function cacheSet(key, val) {
    if (!translationCache) return val;
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const iter = translationCache.keys();
      for (let i = 0; i < 1200; i++) {
        const k = iter.next().value;
        if (k !== undefined) translationCache.delete(k);
        else break;
      }
    }
    translationCache.set(key, val);
    return val;
  }

  function translateDuration(value) {
    return String(value)
      .replace(/\bseconds?\b/gi, '秒')
      .replace(/\bminutes?\b/gi, '分钟')
      .replace(/\bhours?\b/gi, '小时')
      .replace(/\bdays?\b/gi, '天')
      .replace(/\bweeks?\b/gi, '周')
      .replace(/\bmonths?\b/gi, '个月')
      .replace(/\byears?\b/gi, '年')
      .replace(/(\d+(?:\.\d+)?)\s*d\b/gi, '$1天')
      .replace(/(\d+(?:\.\d+)?)\s*h\b/gi, '$1小时')
      .replace(/(\d+(?:\.\d+)?)\s*m\b/gi, '$1分钟')
      .replace(/(\d+(?:\.\d+)?)\s*s\b/gi, '$1秒')
      .replace(/(\d)\s+(秒|分钟|小时|天|周|个月|年)/g, '$1$2')
      .replace(/,\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const patternTables = BUNDLE_DATA.createPatterns({
    translateString: (s) => translateString(s),
    translateExactOrPattern: (s) => translateExactOrPattern(s),
    translateDuration,
  });
  const REGEX_TRANSLATIONS = patternTables.REGEX_TRANSLATIONS || [];
  const COMMUNITY_REGEX_PATTERNS = patternTables.COMMUNITY_REGEX_PATTERNS || [];
  const PARTIAL_TRANSLATIONS = patternTables.PARTIAL_TRANSLATIONS || [];

  const IGNORED_TAGS = {
    SCRIPT: 1, STYLE: 1, CODE: 1, PRE: 1, NOSCRIPT: 1,
    SVG: 1, PATH: 1, CANVAS: 1,
    IFRAME: 1, VIDEO: 1, AUDIO: 1,
  };

  const IGNORED_CLASSES = [
    'monaco-editor',
    'view-lines',
    'view-line',
    'monaco-mouse-cursor-text',
    'xterm',
    'terminal',
    'hljs',
    'code-block',
    'editor-instance',
  ];

  function isProtectedBoundary(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.dataset && el.dataset.i18nTranslated === 'skip') return true;
    const upperTag = el.tagName ? (IGNORED_TAGS[el.tagName] ? el.tagName : el.tagName.toUpperCase()) : '';
    if (upperTag && IGNORED_TAGS[upperTag]) return true;
    if (el.isContentEditable) return true;
    if (el.getAttribute) {
      if (el.getAttribute('translate') === 'no' || el.getAttribute('data-i18n-translated') === 'skip') {
        return true;
      }
      const testId = el.getAttribute('data-testid');
      if (
        testId &&
        (testId === 'model-selector-trigger' ||
          testId === 'model-selector-item' ||
          testId === 'model-selector-effort-option' ||
          testId === 'model-selector-effort-group' ||
          testId === 'model-selector-list')
      ) {
        return true;
      }
    }
    if (
      el.hasAttribute &&
      (el.hasAttribute('data-effort') ||
        el.hasAttribute('data-beautiful-mention') ||
        el.hasAttribute('data-lexical-beautiful-mention'))
    ) {
      return true;
    }
    const cls = typeof el.className === 'string' ? el.className : '';
    if (cls) {
      if (cls.indexOf('notranslate') !== -1) return true;
      for (let i = 0; i < IGNORED_CLASSES.length; i++) {
        if (cls.indexOf(IGNORED_CLASSES[i]) !== -1) return true;
      }
    }
    return false;
  }

  function shouldSkipElement(el) {
    if (!el || el.nodeType !== 1) return false;
    let cur = el;
    for (let d = 0; cur && d < 24; d++) {
      if (cur.tagName === 'BODY' || cur.tagName === 'HTML') break;
      if (isProtectedBoundary(cur)) return true;
      cur = cur.parentElement;
    }
    return false;
  }

  function findContextElement(node, marker, matcher) {
    let element = node && node.parentElement;
    let depth = 0;

    while (element && depth < 8) {
      if (element.dataset && element.dataset[marker] === 'true') {
        return element;
      }
      const normalizedText = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      if (matcher.test(normalizedText)) {
        matcher.lastIndex = 0;
        if (element.dataset) {
          element.dataset[marker] = 'true';
        }
        return element;
      }
      matcher.lastIndex = 0;
      if (element.getAttribute && element.getAttribute('role') === 'dialog') {
        break;
      }
      element = element.parentElement;
      depth++;
    }
    return null;
  }

  function hasSettingsSidebarDescendant(container, depth = 0) {
    if (!container || depth > 3) return false;
    if (container.querySelector) {
      return Boolean(container.querySelector('[data-testid="settings-sidebar"]'));
    }
    const kids = container.children;
    if (!kids) return false;
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i];
      if (k.getAttribute && k.getAttribute('data-testid') === 'settings-sidebar') return true;
      if (hasSettingsSidebarDescendant(k, depth + 1)) return true;
    }
    return false;
  }

  const settingsContextCache = typeof WeakMap !== 'undefined' ? new WeakMap() : null;

  function isSettingsContext(el) {
    if (!el || el.nodeType !== 1) return false;
    if (settingsContextCache && settingsContextCache.has(el)) {
      return settingsContextCache.get(el);
    }
    let cur = el;
    let depth = 0;
    let matched = false;
    while (cur && depth < 12) {
      if (cur.tagName === 'BODY' || cur.tagName === 'HTML') break;
      if (settingsContextCache && cur !== el && settingsContextCache.has(cur)) {
        matched = settingsContextCache.get(cur);
        break;
      }
      if (cur.getAttribute) {
        if (
          cur.getAttribute('role') === 'dialog' ||
          (cur.hasAttribute && (cur.hasAttribute('data-screen') || cur.hasAttribute('data-settings-root')))
        ) {
          matched = true;
          break;
        }
        const tid = cur.getAttribute('data-testid') || '';
        if (tid === 'settings-sidebar' || tid.indexOf('settings-nav-item-') === 0) {
          matched = true;
          break;
        }
      }
      const cls = typeof cur.className === 'string' ? cur.className : '';
      if (cls && (cls.indexOf('settings-modal') !== -1 || cls.indexOf('settings-standalone') !== -1)) {
        matched = true;
        break;
      }
      if (depth >= 1 && depth <= 4 && hasSettingsSidebarDescendant(cur)) {
        matched = true;
        break;
      }
      cur = cur.parentElement;
      depth++;
    }
    if (!matched && el.closest && el.closest('[role="dialog"]')) {
      matched = true;
    }
    if (settingsContextCache) {
      settingsContextCache.set(el, matched);
    }
    return matched;
  }

  // O(1) 触发词集合：仅当文本命中极少数上下文内联碎片时才向上探测祖先上下文，彻底避免设置弹窗内对全部普通文本做 9 轮祖先 textContent 拼接
  const CTX_PROJECT_DELETE_TRIGGERS = new Set(['Permanently delete', 'including', 'and', '.']);
  const CTX_LOCAL_PERM_TRIGGERS = new Set([
    'This project was created for',
    'This project was created for the',
    'This project was created for an',
    'the',
    'an',
    'automation.',
    'automation. Also includes',
    'Also includes',
    'Global Permissions',
    'global settings',
    'when working',
    'in this project',
    'in these conversations',
    'when working in this project.',
    'when working in these conversations.',
    'Learn more',
    '.',
  ]);
  const CTX_PLUGINS_INTRO_TRIGGERS = new Set([
    'Plugins are packaged collections of skills and MCPs to help the Agent in',
    'work with Google developer products. You can always change your choices in Settings.',
  ]);
  const CTX_NO_ADS_TRIGGERS = new Set([
    'Customize your experience across the agent, plugins, and product from the settings and marketplace. We won’t show you ads or let advertisers influence what',
    "Customize your experience across the agent, plugins, and product from the settings and marketplace. We won't show you ads or let advertisers influence what",
    'says.',
  ]);
  const CTX_ACCOUNT_SWITCH_TRIGGERS = new Set([
    'Signed in as',
    '. To use another account, add it in the',
    '. To add another account, go to the',
    'tab.',
    'Sign in again',
    'to use Voice.',
    'Click',
    'to open macOS Privacy & Security.',
  ]);
  const CTX_COMPUTER_PERM_TRIGGERS = new Set([
    'In System Settings, turn on',
    'In System Settings, click',
    ', choose',
    ', then turn it on.',
    'Already on? Select',
    ', click',
    ', then',
    'drag it back in from the small window.',
    'click',
    'and add it again.',
  ]);
  const CTX_AGENT_MODEL_TRIGGERS = new Set(['Agent:', '. Change it in the model menu.']);

  function applyContextualMap(node, text, contextElement, map, cleanLeadingWhitespaceKey) {
    if (!contextElement || !hasOwn.call(map, text)) return false;
    if (cleanLeadingWhitespaceKey && text === cleanLeadingWhitespaceKey) {
      for (const child of contextElement.childNodes) {
        if (child.nodeType === 3 && child.nodeValue && !child.nodeValue.trim()) {
          child.nodeValue = '';
        }
      }
    }
    node.nodeValue = map[text];
    return true;
  }

  function translateContextualTextNode(node, text) {
    if (
      CTX_PROJECT_DELETE_TRIGGERS.has(text) ||
      /^\d+ (?:active|archived) conversations?$/i.test(text)
    ) {
      const projectDeleteContext = findContextElement(
        node,
        'i18nProjectDeleteSummary',
        /^Permanently delete .+ including \d+ active conversations? and \d+ archived conversations?\.$/i
      );
      if (projectDeleteContext) {
        if (text === 'Permanently delete') { node.nodeValue = '永久删除'; return true; }
        if (text === 'including') { node.nodeValue = '，包括'; return true; }
        if (text === 'and') { node.nodeValue = '和'; return true; }
        const activeMatch = text.match(/^(\d+) active conversations?$/i);
        if (activeMatch) { node.nodeValue = `${activeMatch[1]} 个活跃对话`; return true; }
        const archivedMatch = text.match(/^(\d+) archived conversations?$/i);
        if (archivedMatch) { node.nodeValue = `${archivedMatch[1]} 个已归档对话`; return true; }
        if (text === '.') { node.nodeValue = '。'; return true; }
      }
    }

    if (CTX_LOCAL_PERM_TRIGGERS.has(text)) {
      const localPermissionsContext = findContextElement(
        node,
        'i18nLocalPermissionsSummary',
        /(?:Also includes (?:Global Permissions|global settings) when working|This project was created for (?:the .+ |an )automation\.)/i
      );
      if (
        applyContextualMap(
          node,
          text,
          localPermissionsContext,
          {
            'This project was created for': '此项目专为',
            'This project was created for the': '此项目专为 ',
            'This project was created for an': '此项目专为一项',
            'the': ' ',
            'an': '一项',
            'automation.': '自动化创建。',
            'automation. Also includes': '自动化创建。还会应用',
            'Also includes': '还会应用',
            'Global Permissions': '全局权限',
            'global settings': '全局设置',
            'when working': '（适用于',
            'in this project': '当前项目）',
            'in these conversations': '这些对话）',
            'when working in this project.': '（适用于当前项目）。',
            'when working in these conversations.': '（适用于这些对话）。',
            'Learn more': '了解更多',
            '.': '。',
          },
          'Also includes'
        )
      ) {
        return true;
      }
    }

    if (text === 'Learn more about') {
      const presetLearnMoreContext = findContextElement(
        node,
        'i18nPresetLearnMore',
        /^Learn more about\s+(?:Default|Full machine|Turbo mode|Inherit Global|Custom)$/i
      );
      if (presetLearnMoreContext) {
        node.nodeValue = '详细了解';
        return true;
      }
    }

    if (CTX_PLUGINS_INTRO_TRIGGERS.has(text)) {
      const pluginsIntroContext = findContextElement(
        node,
        'i18nPluginsIntro',
        /^Plugins are packaged collections of skills and MCPs to help the Agent in .+ work with Google developer products/i
      );
      if (
        applyContextualMap(node, text, pluginsIntroContext, {
          'Plugins are packaged collections of skills and MCPs to help the Agent in':
            '插件是技能 (Skills) 与 MCP 的打包集合，可帮助',
          'work with Google developer products. You can always change your choices in Settings.':
            '中的智能体配合 Google 开发者产品协同工作。您随时可以在设置中更改您的选择。',
        })
      ) {
        return true;
      }
    }

    if (CTX_NO_ADS_TRIGGERS.has(text)) {
      const noAdsContext = findContextElement(
        node,
        'i18nNoAdsDisclaimer',
        /let advertisers influence what .+ says\.$/i
      );
      if (
        applyContextualMap(node, text, noAdsContext, {
          'Customize your experience across the agent, plugins, and product from the settings and marketplace. We won’t show you ads or let advertisers influence what':
            '您可以通过设置和插件市场定制智能体、插件与产品的体验。我们不会向您展示广告，也不会让广告商影响',
          "Customize your experience across the agent, plugins, and product from the settings and marketplace. We won't show you ads or let advertisers influence what":
            '您可以通过设置和插件市场定制智能体、插件与产品的体验。我们不会向您展示广告，也不会让广告商影响',
          'says.': '所生成的内容。',
        })
      ) {
        return true;
      }
    }

    if (CTX_ACCOUNT_SWITCH_TRIGGERS.has(text)) {
      const accountSwitchContext = findContextElement(
        node,
        'i18nAccountSwitchHint',
        /(?:To use another account, add it in the|To add another account, go to the|Sign in again to use Voice\.|open macOS Privacy & Security\.)/i
      );
      if (
        applyContextualMap(node, text, accountSwitchContext, {
          'Signed in as': '当前已登录为',
          '. To use another account, add it in the': '。如需使用其他账户，请在',
          '. To add another account, go to the': '。如需添加其他账户，请前往',
          'tab.': '选项卡中添加。',
          'Sign in again': '重新登录',
          'to use Voice.': '以使用语音功能。',
          'Click': '点击',
          'to open macOS Privacy & Security.': '以打开 macOS 隐私与安全性设置。',
        })
      ) {
        return true;
      }
    }

    // 2.35.0 Computer Use 系统设置权限向导混合内联文本
    if (CTX_COMPUTER_PERM_TRIGGERS.has(text)) {
      const computerPermGuideCtx = findContextElement(
        node,
        'i18nComputerPermGuide',
        /(?:In System Settings,\s*(?:turn on|click\s*\+)|在“系统设置”中，)/i
      );
      if (
        applyContextualMap(node, text, computerPermGuideCtx, {
          'In System Settings, turn on': '在“系统设置”中，开启 ',
          'In System Settings, click': '在“系统设置”中，点击 ',
          ', choose': '，选择 ',
          ', then turn it on.': '，然后将其开启。',
          'Already on? Select': '已经开启？请选中 ',
          ', click': '，点击 ',
          ', then': '，然后',
          'drag it back in from the small window.': '从提示小窗将其拖回列表。',
          'click': '点击 ',
          'and add it again.': ' 并重新添加。',
        })
      ) {
        return true;
      }
    }

    if (CTX_AGENT_MODEL_TRIGGERS.has(text)) {
      const agentModelHintContext = findContextElement(
        node,
        'i18nAgentModelHint',
        /^Agent:\s*.+\.\s*Change it in the model menu\.$/i
      );
      if (
        applyContextualMap(node, text, agentModelHintContext, {
          'Agent:': '智能体：',
          '. Change it in the model menu.': '。可在模型菜单中更改。',
        })
      ) {
        return true;
      }
    }

    if (
      text === 'Controls the actions the agent can take.' ||
      /^Modified in\s*$/i.test(text) ||
      /^projects?$/i.test(text)
    ) {
      const globalPermissionsContext = findContextElement(
        node,
        'i18nGlobalPermissionsSummary',
        /Controls the actions the agent can take\.\s*Modified in\s+\d+\s+projects?/i
      );
      if (globalPermissionsContext) {
        if (text === 'Controls the actions the agent can take.') { node.nodeValue = '控制智能体可以执行的操作。'; return true; }
        if (/^Modified in\s*$/i.test(text)) { node.nodeValue = '已在 '; return true; }
        if (/^projects?$/i.test(text)) { node.nodeValue = ' 个项目中修改'; return true; }
      }
    }

    if (hasOwn.call(SETTINGS_CONTEXT_TRANSLATIONS, text) && node.parentElement && isSettingsContext(node.parentElement)) {
      node.nodeValue = node.nodeValue.replace(text, SETTINGS_CONTEXT_TRANSLATIONS[text]);
      return true;
    }

    if ((text === 'and' || text === 'or') && node.parentElement) {
      const hasInlineSib = node.parentElement.querySelector && node.parentElement.querySelector('a, code, kbd, strong');
      const hasChineseSib = /[\u4e00-\u9fa5]/.test(node.parentElement.textContent || '');
      if (hasInlineSib && hasChineseSib) {
        node.nodeValue = node.nodeValue.replace(text, text === 'and' ? '和' : '或');
        return true;
      }
    }

    return false;
  }

  let exactPatternDepth = 0;

  function translateExactOrPattern(trimmed) {
    if (!trimmed || exactPatternDepth > 3) return null;
    if (hasOwn.call(EXACT_TRANSLATIONS, trimmed)) {
      return EXACT_TRANSLATIONS[trimmed];
    }
    const ciHit = lookupCaseInsensitive(trimmed);
    if (ciHit) {
      return ciHit;
    }
    const truncHit = lookupTruncatedEllipsis(trimmed);
    if (truncHit) {
      return truncHit;
    }
    exactPatternDepth++;
    try {
      for (let i = 0; i < REGEX_TRANSLATIONS.length; i++) {
        const [pattern, replacement] = REGEX_TRANSLATIONS[i];
        if (pattern.test(trimmed)) {
          pattern.lastIndex = 0;
          return trimmed.replace(pattern, replacement);
        }
      }
      for (let i = 0; i < COMMUNITY_REGEX_PATTERNS.length; i++) {
        const [pattern, replacement] = COMMUNITY_REGEX_PATTERNS[i];
        if (pattern.test(trimmed)) {
          pattern.lastIndex = 0;
          let res = trimmed.replace(pattern, replacement);
          for (let j = 0; j < COMMUNITY_REGEX_PATTERNS.length; j++) {
            const [p2, r2] = COMMUNITY_REGEX_PATTERNS[j];
            if (p2.test(res)) {
              p2.lastIndex = 0;
              res = res.replace(p2, r2);
            }
          }
          return res;
        }
      }
    } catch {} finally {
      exactPatternDepth--;
    }
    return null;
  }

  function translateString(text) {
    if (!text) return text;
    const trimmed = String(text).replace(/\s+/g, ' ').trim();
    if (!trimmed) return text;

    const cached = cacheGet(trimmed);
    if (cached !== undefined) {
      return cached === null ? text : cached;
    }

    // 1. 精确匹配
    if (hasOwn.call(EXACT_TRANSLATIONS, trimmed)) {
      return cacheSet(trimmed, EXACT_TRANSLATIONS[trimmed]);
    }

    if (!/[a-zA-Z]/.test(trimmed) || (translatedValuesSet && translatedValuesSet.has(trimmed))) {
      cacheSet(trimmed, null);
      return text;
    }

    // 2. 大小写不敏感回退 + 截断前缀 + 正则匹配
    const directPatternRes = translateExactOrPattern(trimmed);
    if (directPatternRes && directPatternRes !== trimmed) {
      return cacheSet(trimmed, directPatternRes);
    }

    // 3. 尾部标点剥离自适应
    const puncMatch = trimmed.match(/^([\w\s\-\/()'"]+?)([:：…\.？?!！]+)$/);
    if (puncMatch) {
      const base = puncMatch[1].trim();
      const punc = puncMatch[2];
      const baseHit = hasOwn.call(EXACT_TRANSLATIONS, base)
        ? EXACT_TRANSLATIONS[base]
        : lookupCaseInsensitive(base);
      if (baseHit) {
        const mappedPunc = punc === ':' ? '：' : punc === '.' ? '。' : punc === '?' ? '？' : punc === '!' ? '！' : punc;
        return cacheSet(trimmed, baseHit + mappedPunc);
      }
    }

    // 4. 快捷键后缀剥离自适应
    const hotkeyMatch = trimmed.match(
      /^([\w\s\-\/]+?)\s*(\(?(?:Ctrl|Cmd|Alt|Shift|Esc|Enter|Tab|Backspace|Delete|F\d+)(?:\+[^\s)]+)*\)?)$/i
    );
    if (hotkeyMatch) {
      const cmdBase = hotkeyMatch[1].trim();
      const hotkey = hotkeyMatch[2].trim();
      const cmdHit = hasOwn.call(EXACT_TRANSLATIONS, cmdBase)
        ? EXACT_TRANSLATIONS[cmdBase]
        : lookupCaseInsensitive(cmdBase);
      if (cmdHit) {
        return cacheSet(trimmed, `${cmdHit} ${hotkey}`);
      }
    }

    // 5. 多句全句守恒拆分
    if (trimmed.indexOf('. ') !== -1 || trimmed.indexOf('! ') !== -1 || trimmed.indexOf('? ') !== -1) {
      const parts = trimmed.split(/([.!?]\s+)/);
      let anyTrans = false;
      let allTrans = true;
      const out = [];
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const tPart = part.trim();
        if (!tPart || /^[.!?\s]+$/.test(part)) {
          out.push(part.replace(/\.\s*/g, '。'));
          continue;
        }
        const tr = translateExactOrPattern(tPart) || translateExactOrPattern(tPart + '.');
        if (tr) {
          anyTrans = true;
          out.push(tr);
        } else {
          allTrans = false;
          break;
        }
      }
      if (anyTrans && allTrans) {
        const joined = out.join('').replace(/([。！？])[。！？.]*\s*/g, '$1').trim();
        return cacheSet(trimmed, joined);
      }
    }

    // 6. 局部片段替换
    let result = trimmed;
    for (let i = 0; i < PARTIAL_TRANSLATIONS.length; i++) {
      const [source, target] = PARTIAL_TRANSLATIONS[i];
      if (result.includes(source)) {
        result = result.split(source).join(target);
      }
    }

    if (result !== trimmed) {
      return cacheSet(trimmed, result);
    }

    cacheSet(trimmed, null);
    return text;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== 3) return;
    const original = node.nodeValue;
    if (!original) return;

    if (node._agyOriginal === original) return;

    const parent = node.parentElement || node.parentNode;
    if (parent && (parent.tagName === 'TEXTAREA' || parent.tagName === 'INPUT' || shouldSkipElement(parent))) {
      node._agyOriginal = original;
      return;
    }

    const text = original.trim();
    if (!text) {
      node._agyOriginal = original;
      return;
    }

    if (text === '.' && node.previousSibling && /[\u4e00-\u9fa5]/.test(node.previousSibling.textContent || '')) {
      node.nodeValue = original.replace('.', '。');
      node._agyOriginal = node.nodeValue;
      return;
    }

    if (translateContextualTextNode(node, text)) {
      node._agyOriginal = node.nodeValue;
      return;
    }

    if (hasOwn.call(EXACT_TRANSLATIONS, text)) {
      node.nodeValue = original.replace(text, EXACT_TRANSLATIONS[text]);
      node._agyOriginal = node.nodeValue;
      return;
    }

    const translated = translateString(text);
    if (translated && translated !== text) {
      node.nodeValue = original.replace(text, translated);
      node._agyOriginal = node.nodeValue;
    } else {
      node._agyOriginal = original;
    }
  }

  function translateAttributes(element) {
    if (!element || !element.getAttribute) return;

    for (let i = 0; i < TRANSLATABLE_ATTRS.length; i++) {
      const attr = TRANSLATABLE_ATTRS[i];
      const value = element.getAttribute(attr);
      if (!value) continue;

      const cacheProp = '_agyAttr_' + attr;
      if (element[cacheProp] === value) continue;

      if (hasOwn.call(EXACT_TRANSLATIONS, value)) {
        const target = EXACT_TRANSLATIONS[value];
        element.setAttribute(attr, target);
        element[cacheProp] = target;
      } else {
        const translated = translateString(value);
        if (translated && translated !== value) {
          element.setAttribute(attr, translated);
          element[cacheProp] = translated;
        } else {
          element[cacheProp] = value;
        }
      }
    }
  }

  function translateElementOwnText(element) {
    if (!element || !element.childNodes || !element.textContent) return;
    const tagName = element.tagName;
    if (!tagName || IGNORED_TAGS[tagName] || tagName === 'TEXTAREA' || tagName === 'INPUT') return;

    if (tagName === 'P' && element.parentElement && element.parentElement.dataset && element.parentElement.dataset.testid === 'coordinator-welcome') {
      const fullText = element.textContent.replace(/\s+/g, ' ').trim();
      const strongEl = element.querySelector('strong');
      const spans = Array.from(element.querySelectorAll('span'));
      if (strongEl && spans.length > 2 && /^Welcome to\s+/i.test(fullText)) {
        const isSwarmWording = /coordinate the work for this project/i.test(fullText);
        const afterStrongText = isSwarmWording
          ? '。我负责统筹协调此项目的工作。您可以向我提问或交办任务，我会直接解答，或启动多个并行运行的工作节点 (Workers)。'
          : '。我负责统筹协调此项目中的所有对话——跟踪进行中的任务、已确定的决策，以及各个部分如何协同配合。';
        let seenStrong = false;
        let firstAfterStrong = true;
        for (const ch of Array.from(element.children)) {
          if (ch === strongEl) {
            seenStrong = true;
            continue;
          }
          if (ch.tagName === 'SPAN' && ch.firstChild && ch.firstChild.nodeType === 3) {
            if (!seenStrong) {
              ch.firstChild.nodeValue = '欢迎来到 ';
              ch.firstChild._agyOriginal = ch.firstChild.nodeValue;
            } else if (firstAfterStrong) {
              ch.firstChild.nodeValue = afterStrongText;
              ch.firstChild._agyOriginal = ch.firstChild.nodeValue;
              firstAfterStrong = false;
            } else {
              ch.firstChild.nodeValue = '';
              ch.firstChild._agyOriginal = '';
            }
          }
        }
        return;
      } else if (!strongEl && spans.length > 2 && /^You can follow the (conversations|workers)/i.test(fullText)) {
        const isSwarmFollow = /^You can follow the workers/i.test(fullText);
        const followText = isSwarmFollow
          ? '您可以在仪表盘 (Dashboard) 中跟进各个工作节点的进展，当任务完成或需要您介入时，我会及时发布更新。'
          : '您可以在侧边栏中跟进我创建的对话，并随时介入直接引导，或在此处与我交流。';
        spans.forEach((sp, idx) => {
          if (sp.firstChild && sp.firstChild.nodeType === 3) {
            const val = idx === 0 ? followText : '';
            sp.firstChild.nodeValue = val;
            sp.firstChild._agyOriginal = val;
          }
        });
        return;
      }
    }

    const rawNodes = element.childNodes;
    const rawLen = rawNodes ? rawNodes.length : 0;
    // 仅当存在 >= 2 个相邻非空文本节点时才合并检查，彻底避免对大容器元素反复拼接整棵子树 textContent 造成卡顿
    let hasAdjacentNonEmptyText = false;
    let consecText = 0;
    for (let i = 0; i < rawLen; i++) {
      const ch = rawNodes[i];
      if (ch.nodeType === 3) {
        if (ch.nodeValue && ch.nodeValue.trim()) {
          consecText++;
          if (consecText >= 2) {
            hasAdjacentNonEmptyText = true;
            break;
          }
        }
      } else {
        consecText = 0;
      }
    }

    if (hasAdjacentNonEmptyText) {
      const fullNormalized = String(element.textContent || '').replace(/\s+/g, ' ').trim();
      const skipAdjacentRunMerge =
        fullNormalized &&
        /(?:Permanently delete .+ including \d+ active|Also includes (?:Global Permissions|global settings) when working|This project was created for (?:the .+ |an )automation\.|Learn more about\s+(?:Default|Full machine|Turbo mode|Inherit Global|Custom)|Plugins are packaged collections of skills|let advertisers influence what .+ says\.|To use another account, add it in the|To add another account, go to the|open macOS Privacy & Security\.|In System Settings,\s*(?:turn on|click \+)|Controls the actions the agent can take\.\s*Modified in\s+\d+\s+projects?)/i.test(
          fullNormalized
        );
      if (!skipAdjacentRunMerge) {
        let run = [];
        const flushRun = () => {
          const nonEmpty = run.filter((n) => n.nodeValue && n.nodeValue.trim());
          if (nonEmpty.length >= 2) {
            const combined = nonEmpty.map((n) => n.nodeValue).join('').replace(/\s+/g, ' ').trim();
            if (combined && combined.length <= 2000) {
              const tr = translateString(combined);
              if (tr && tr !== combined) {
                const leadMatch = nonEmpty[0].nodeValue.match(/^\s+/);
                const prefix = leadMatch ? leadMatch[0] : '';
                nonEmpty[0].nodeValue = prefix + tr;
                nonEmpty[0]._agyOriginal = nonEmpty[0].nodeValue;
                for (let k = 1; k < nonEmpty.length; k++) {
                  nonEmpty[k].nodeValue = '';
                  nonEmpty[k]._agyOriginal = '';
                }
              }
            }
          }
          run = [];
        };
        for (let i = 0; i < rawLen; i++) {
          if (rawNodes[i].nodeType === 3) {
            run.push(rawNodes[i]);
          } else if (run.length > 0) {
            flushRun();
          }
        }
        if (run.length > 0) flushRun();
      }
    }

    const childElements = element.children;
    const childElLen = childElements ? childElements.length : 0;
    if (childElLen > 2) return;
    for (let i = 0; i < childElLen; i++) {
      if (childElements[i].textContent && childElements[i].textContent.trim()) return;
    }

    const textNodes = [];
    for (let i = 0; i < rawLen; i++) {
      const ch = rawNodes[i];
      if (ch.nodeType === 3 && ch.nodeValue && ch.nodeValue.trim()) {
        textNodes.push(ch);
      }
    }
    if (textNodes.length === 0) return;

    const text = element.textContent.trim();
    if (!text || text.length > 2000) return;

    const translated =
      hasOwn.call(SETTINGS_CONTEXT_TRANSLATIONS, text) && isSettingsContext(element)
        ? SETTINGS_CONTEXT_TRANSLATIONS[text]
        : translateString(text);
    if (translated && translated !== text) {
      textNodes[0].nodeValue = textNodes[0].nodeValue.replace(textNodes[0].nodeValue.trim(), translated);
      textNodes[0]._agyOriginal = textNodes[0].nodeValue;
      for (let i = 1; i < textNodes.length; i++) {
        textNodes[i].nodeValue = '';
        textNodes[i]._agyOriginal = '';
      }
    }
  }

  function translateNode(node, ancestorChecked = false) {
    if (!node) return;

    try {
      if (node.nodeType === 1) {
        if (ancestorChecked ? isProtectedBoundary(node) : shouldSkipElement(node)) return;

        translateAttributes(node);
        if (node.tagName === 'TEXTAREA' || node.tagName === 'INPUT') return;

        translateElementOwnText(node);

        const children = node.childNodes;
        if (children) {
          for (let i = 0; i < children.length; i++) {
            translateNode(children[i], true);
          }
        }
      } else if (node.nodeType === 3) {
        if (!ancestorChecked && node.parentElement && shouldSkipElement(node.parentElement)) return;
        translateTextNode(node);
      }
    } catch {}
  }

  let activeObserver = null;
  let isObserving = false;
  let observedRootEl = null;
  let translateTimer = null;
  const pendingNodes = new Set();

  function enqueueMutationRecords(mutations) {
    if (!mutations || mutations.length === 0) return;
    for (let i = 0; i < mutations.length; i++) {
      const mutation = mutations[i];
      if (mutation.type === 'childList') {
        if (mutation.target && mutation.target.nodeType === 1 && shouldSkipElement(mutation.target)) {
          continue;
        }
        const added = mutation.addedNodes;
        for (let j = 0; j < added.length; j++) {
          const node = added[j];
          if (node.nodeType === 1) {
            if (!isProtectedBoundary(node)) {
              pendingNodes.add(node);
            }
          } else if (node.nodeType === 3) {
            pendingNodes.add(node);
          }
        }
      } else if (mutation.type === 'characterData') {
        if (mutation.target) {
          if (mutation.target.parentElement && shouldSkipElement(mutation.target.parentElement)) {
            continue;
          }
          mutation.target._agyOriginal = undefined;
          pendingNodes.add(mutation.target);
        }
      } else if (mutation.type === 'attributes') {
        if (
          mutation.target &&
          TRANSLATABLE_ATTRS.includes(mutation.attributeName) &&
          !shouldSkipElement(mutation.target)
        ) {
          pendingNodes.add(mutation.target);
        }
      }
    }
  }

  function disconnectObserver() {
    if (activeObserver && isObserving) {
      try {
        if (typeof activeObserver.takeRecords === 'function') {
          const leftover = activeObserver.takeRecords();
          if (leftover && leftover.length > 0) {
            enqueueMutationRecords(leftover);
          }
        }
      } catch {}
      try { activeObserver.disconnect(); } catch {}
      isObserving = false;
    }
  }

  function reconnectObserver() {
    if (activeObserver && typeof document !== 'undefined' && document.documentElement) {
      if (!isObserving || observedRootEl !== document.documentElement) {
        try { activeObserver.disconnect(); } catch {}
        try {
          activeObserver.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: TRANSLATABLE_ATTRS,
          });
          observedRootEl = document.documentElement;
          isObserving = true;
        } catch {}
      }
      if (pendingNodes.size > 0) {
        processPendingTranslations();
      }
    }
  }

  function translatePage() {
    if (typeof document === 'undefined' || !document.body) return;
    if (!activeObserver) {
      setupObserver();
    }
    disconnectObserver();
    try {
      if (document.documentElement && document.documentElement.dataset) {
        document.documentElement.dataset.antigravityZhI18nInitialized = 'true';
      }
      translateNode(document.body);
    } finally {
      reconnectObserver();
    }
  }

  function processPendingTranslations() {
    if (translateTimer) return;
    const schedule =
      typeof window !== 'undefined' && window.requestAnimationFrame
        ? window.requestAnimationFrame
        : (fn) => setTimeout(fn, 16);

    translateTimer = schedule(() => {
      translateTimer = null;
      if (pendingNodes.size === 0) return;

      disconnectObserver();
      try {
        for (const node of pendingNodes) {
          if (node && node.isConnected !== false) {
            translateNode(node);
          }
        }
        pendingNodes.clear();
      } finally {
        reconnectObserver();
      }
    });
  }

  function setupObserver() {
    if (typeof MutationObserver === 'undefined') return null;

    activeObserver = new MutationObserver((mutations) => {
      enqueueMutationRecords(mutations);
      if (pendingNodes.size > 0) {
        processPendingTranslations();
      }
    });

    reconnectObserver();
    return activeObserver;
  }

  // 注意：刻意不包含 [role="dialog"] / [role="alertdialog"]（模态窗口已由 MutationObserver 增量翻译，
  // 避免在设置窗口内每移动一次鼠标就触发 4 遍全弹窗递归重扫导致明显卡顿！）
  const HOVER_PORTAL_SELECTOR = [
    '[role="tooltip"]',
    '[role="menu"]',
    '[role="listbox"]',
    '[data-floating-ui-portal]',
    '[data-radix-popper-content-wrapper]',
    '[data-base-ui-portal]',
    '[data-popover-popup]',
    '[data-hover-card-popup]',
    '[data-select-popup]',
    '[data-slot$="-content"]',
    '.compact-tooltip',
    '.popover',
    '.tooltip',
  ].join(', ');

  function translateHoverPortals(hoveredRoot) {
    if (typeof document === 'undefined' || !document.body || !document.querySelectorAll) return;
    const portals = document.querySelectorAll(HOVER_PORTAL_SELECTOR);
    const hoverCards =
      hoveredRoot && hoveredRoot.nodeType === 1 && !shouldSkipElement(hoveredRoot) && hoveredRoot.querySelectorAll
        ? hoveredRoot.querySelectorAll('[class*="group-hover/"]')
        : null;
    if (portals.length === 0 && (!hoverCards || hoverCards.length === 0)) return;

    disconnectObserver();
    try {
      for (let i = 0; i < portals.length; i++) {
        translateNode(portals[i]);
      }
      if (hoverCards) {
        for (let j = 0; j < hoverCards.length; j++) {
          translateNode(hoverCards[j]);
        }
      }
    } catch {} finally {
      reconnectObserver();
    }
  }

  function setupHoverTooltipInterceptor() {
    if (typeof document === 'undefined' || !document.addEventListener) return;
    let lastHoverTarget = null;
    let lastHoverTime = 0;
    let hoverTimers = [];

    const clearHoverTimers = () => {
      for (let i = 0; i < hoverTimers.length; i++) {
        clearTimeout(hoverTimers[i]);
      }
      hoverTimers = [];
    };

    const onHover = (e) => {
      const target = e && e.target && e.target.nodeType === 1 ? e.target : null;
      if (!target || shouldSkipElement(target)) return;
      const now = Date.now();
      if (target === lastHoverTarget && now - lastHoverTime < 80) return;
      lastHoverTarget = target;
      lastHoverTime = now;

      let interactiveRoot = null;
      const nodesToCheckAttr = [];
      let anc = target;
      for (let d = 0; anc && d < 6; d++) {
        if (isProtectedBoundary(anc)) return;
        nodesToCheckAttr.push(anc);
        if (
          (anc.className && typeof anc.className === 'string' && anc.className.indexOf('group/') !== -1) ||
          (anc.hasAttribute &&
            (anc.hasAttribute('data-tooltip-id') ||
              anc.hasAttribute('aria-describedby') ||
              anc.hasAttribute('data-tooltip')))
        ) {
          interactiveRoot = anc;
        }
        anc = anc.parentElement;
      }

      // 仅当目标链路确有未缓存的可翻译属性时才暂停/恢复 Observer，减少鼠标滑动开销
      let hasUncachedAttr = false;
      for (let k = 0; k < nodesToCheckAttr.length && !hasUncachedAttr; k++) {
        const el = nodesToCheckAttr[k];
        if (!el.getAttribute) continue;
        for (let a = 0; a < TRANSLATABLE_ATTRS.length; a++) {
          const attr = TRANSLATABLE_ATTRS[a];
          const val = el.getAttribute(attr);
          if (val && el['_agyAttr_' + attr] !== val) {
            hasUncachedAttr = true;
            break;
          }
        }
      }
      if (hasUncachedAttr) {
        disconnectObserver();
        try {
          for (let k = 0; k < nodesToCheckAttr.length; k++) {
            translateAttributes(nodesToCheckAttr[k]);
          }
        } finally {
          reconnectObserver();
        }
      }

      clearHoverTimers();
      const scan = () => translateHoverPortals(interactiveRoot);
      if (typeof window !== 'undefined' && window.requestAnimationFrame) {
        window.requestAnimationFrame(scan);
      }
      for (const delay of [65, 240]) {
        hoverTimers.push(setTimeout(scan, delay));
      }
    };

    try {
      document.addEventListener('pointerenter', onHover, { capture: true, passive: true });
      document.addEventListener('focusin', onHover, { capture: true, passive: true });
      document.addEventListener('contextmenu', onHover, { capture: true, passive: true });
    } catch {}
  }

  function clearNegativeCache(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      if (node._agyOriginal !== undefined && /[A-Za-z]{2,}/.test(node.nodeValue || '')) {
        delete node._agyOriginal;
      }
      return;
    }
    if (node.nodeType === 1) {
      for (let i = 0; i < TRANSLATABLE_ATTRS.length; i++) {
        const cacheProp = '_agyAttr_' + TRANSLATABLE_ATTRS[i];
        if (node[cacheProp] !== undefined) delete node[cacheProp];
      }
      const children = node.childNodes;
      if (children) {
        for (let i = 0; i < children.length; i++) {
          clearNegativeCache(children[i]);
        }
      }
    }
  }

  function initTranslation() {
    if (typeof document === 'undefined' || !document.documentElement) return;
    if (isHotUpgrade) {
      if (typeof globalThis.__agyDisconnectObserver === 'function') {
        try { globalThis.__agyDisconnectObserver(); } catch {}
      }
      if (document.documentElement.dataset) {
        delete document.documentElement.dataset.antigravityZhI18nInitialized;
      }
      if (document.body) {
        clearNegativeCache(document.body);
      }
    }
    if (document.documentElement.dataset && document.documentElement.dataset.antigravityZhI18nInitialized === 'true') {
      return;
    }
    if (document.documentElement.dataset) {
      document.documentElement.dataset.antigravityZhI18nInitialized = 'true';
    }

    if (document.body) {
      translatePage();
    }

    setupObserver();
    setupHoverTooltipInterceptor();

    let retryCount = 0;
    const earlyInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      translatePage();
      retryCount++;
      if (retryCount >= 8) {
        clearInterval(earlyInterval);
        setInterval(() => {
          if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
          if (typeof window !== 'undefined' && window.requestIdleCallback) {
            window.requestIdleCallback(() => {
              if (document.visibilityState !== 'hidden') translatePage();
            }, { timeout: 5000 });
          } else {
            translatePage();
          }
        }, 30000);
      }
    }, 600);
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initTranslation);
    } else {
      initTranslation();
    }
  }

  const runtimeExports = {
    PATCH_DICT_SIGNATURE,
    EXACT_TRANSLATIONS,
    SETTINGS_CONTEXT_TRANSLATIONS,
    REGEX_TRANSLATIONS,
    PARTIAL_TRANSLATIONS,
    translateString,
    translateNode,
    translatePage,
    translateHoverPortals,
    isSettingsContext,
  };

  if (typeof globalThis !== 'undefined') {
    globalThis.__agyTranslateString = translateString;
    globalThis.__agyForceTranslatePage = translatePage;
    globalThis.__agyDisconnectObserver = disconnectObserver;
    globalThis.__agZhPatchSignature = PATCH_DICT_SIGNATURE;
    globalThis.__agyRuntimeExports = runtimeExports;
  }

  if (isBrowserEnv) {
    console.log(`[Antigravity 汉化补丁 ${PATCH_DICT_SIGNATURE}] 前端高性能翻译引擎已加载`);
  }

  return runtimeExports;
}

module.exports = { initAntigravityZhRuntime };
