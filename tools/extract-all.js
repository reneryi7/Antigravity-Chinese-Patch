/**
 * Antigravity 中文汉化补丁 v4.0 - 四源合一全自动英文提取与覆盖率审计器
 *
 * 同时扫描以下四大文本源（零硬编码本机路径）：
 * 1. Web 前端实时 Bundle：从运行中的 language_server HTTPS 端口（或本地指定 JS）执行词法级 AST 字符串扫描；
 * 2. 后端内嵌 Mendel 动态配置：自动解析 resources/bin/language_server.exe 内嵌的默认特性 JSON（含界面布局、引导角色、市场货架 Shelves）；
 * 3. Electron 主进程归档：扫描 app.asar(.backup) 内全部 dist/*.js 模块；
 * 4. 插件市场与内置技能缓存：扫描 ~/.gemini/antigravity/{builtin,cache/marketplaces,mcp} 与 ~/.gemini/config/plugins。
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { createNodeTranslator, compileMainProcessAssets } = require('../src/compiler.js');
const { resolveAntigravityDir } = require('../src/core/detector.js');
const { getClientPaths } = require('../src/core/config.js');
const { parseAsarBuffer } = require('../src/core/asar.js');

const i18n = createNodeTranslator();
const mainAssets = compileMainProcessAssets();

const UI_PROP_RE =
  /(?:label|title|placeholder|description|shortDescription|longDescription|tooltip|content|header|subtitle|emptyText|confirmText|cancelText|message|heading|subtext|caption|warning|cta|buttonText|"aria-label"|"aria-description"|"data-tooltip"|"data-title")\s*:\s*$/;
const REGEX_PREV_CH = new Set([
  '=', '(', ',', '[', '!', '&', '|', '?', ':', ';', '{', '}', '~', '^', '+', '-', '*', '%', '<', '>', '\n',
]);
const REGEX_PREV_WORDS = new Set([
  'return', 'case', 'throw', 'typeof', 'void', 'delete', 'in', 'of', 'new', 'else', 'do', 'await', 'yield', 'instanceof',
]);

function unescapeJsString(raw) {
  try {
    return raw
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
      .replace(/\\n(?![a-zA-Z])/g, ' ')
      .replace(/\\r(?![a-zA-Z])/g, '')
      .replace(/\\t(?![a-zA-Z])/g, ' ')
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'")
      .replace(/\\\\/g, '\\');
  } catch {
    return raw;
  }
}

function isValidUICandidate(s) {
  if (!s || s.length < 2 || s.length > 650) return false;
  if (!/[A-Za-z]{2,}/.test(s)) return false;
  if (/^(https?:|wss?:|data:|blob:|file:|mailto:|antigravity:|gemini-api:|plugin:|agy-favicon:|chrome-error:|\/|\.|#|--|_[a-z]|@keyframes|@property|@media)/i.test(s)) return false;
  if (/^[a-z0-9_\-./\\:@]+$/.test(s)) return false;
  if (/^[A-Z0-9_]+$/.test(s)) return false;
  if (/^[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+$/.test(s)) return false;
  if (/^[a-z]+[A-Z][a-zA-Z0-9]*$/.test(s)) return false;
  if (/^[a-z]+(?:-[a-z0-9]+)+$/.test(s)) return false;
  if (/^M[\d.\s,LlHhVvCcSsQqTtAaZz-]+$/.test(s)) return false;
  if (/[{}<>=$]/.test(s) && !s.includes(' ')) return false;
  if (/\b(flex|items-center|justify-|bg-|text-|border-|rounded-|px-|py-|mt-|mb-|ml-|mr-|gap-|w-|h-|min-|max-|overflow-|pointer-events|transition-|duration-|opacity-|z-|grid-cols-|grid-rows-|shrink-0|truncate|select-none|font-|leading-|tracking-|shadow-|hover:|focus:|group-hover:|dark:|can-hover:|linear-gradient|radial-gradient)\b/.test(s)) return false;
  if (/\b(function|return|const|var|let|typeof|instanceof|undefined|null|prototype|__esModule|Object\.defineProperty|createElement)\b/.test(s)) return false;
  if (/^(application\/|text\/|image\/|audio\/|video\/|multipart\/)/i.test(s)) return false;
  if (/^[a-z]+_[a-z_]+(?:\s+[a-z]+_[a-z_]+|\s*\()/i.test(s)) return false;
  if (/^(?:Digit\d|Key[A-Z]|Arrow(?:Up|Down|Left|Right)|Enter|Escape|Backspace|Space|Tab|Shift|Ctrl|Alt|Meta|Home|End|PageUp|PageDown)$/.test(s)) return false;
  return true;
}

function isTranslated(s, isTpl = false) {
  const norm = s.replace(/\s+/g, ' ').trim();
  if (!norm) return true;
  const probes = isTpl
    ? [norm.replace(/\$\{X\}/g, 'FOO'), norm.replace(/\$\{X\}/g, '42')]
    : [norm];
  return probes.some((probe) => {
    const res = i18n.translateString(probe);
    return Boolean(res && res !== probe && /[\u4e00-\u9fa5]/.test(res));
  });
}

function lexJsStrings(code, start = 0, end = code.length) {
  const strings = [];
  const max = Math.min(end, code.length);
  const parenStmtStack = [];

  function scanTemplate(tStart) {
    let j = tStart + 1;
    let hasExpr = false;
    const parts = [];
    let partStart = j;
    while (j < max) {
      const c = code[j];
      if (c === '\\') { j += 2; continue; }
      if (c === '$' && code[j + 1] === '{') {
        hasExpr = true;
        parts.push(code.slice(partStart, j));
        j = scanSegment(j + 2, true);
        parts.push('${X}');
        partStart = j;
        continue;
      }
      if (c === '`') {
        parts.push(code.slice(partStart, j));
        return { end: j, raw: parts.join(''), hasExpr };
      }
      j++;
    }
    return { end: max, raw: '', hasExpr: true };
  }

  function scanSegment(pos, stopAtClosingBrace) {
    let i = pos;
    let lastCh = ';';
    let lastWord = '';
    let braceDepth = stopAtClosingBrace ? 1 : 0;

    while (i < max) {
      const ch = code[i];
      if (ch === ' ' || ch === '\t' || ch === '\r') { i++; continue; }
      if (ch === '\n') { lastCh = '\n'; lastWord = ''; i++; continue; }
      if (ch === '/' && code[i + 1] === '/') {
        while (i < max && code[i] !== '\n') i++;
        continue;
      }
      if (ch === '/' && code[i + 1] === '*') {
        i += 2;
        while (i < max && !(code[i] === '*' && code[i + 1] === '/')) i++;
        i += 2;
        continue;
      }
      if (ch === '/' && (REGEX_PREV_CH.has(lastCh) || REGEX_PREV_WORDS.has(lastWord))) {
        i++;
        let inClass = false;
        while (i < max) {
          const rc = code[i];
          if (rc === '\\') { i += 2; continue; }
          if (rc === '[') { inClass = true; i++; continue; }
          if (rc === ']' && inClass) { inClass = false; i++; continue; }
          if (rc === '/' && !inClass) { i++; break; }
          if (rc === '\n') break;
          i++;
        }
        while (i < max && /[a-z]/i.test(code[i])) i++;
        lastCh = ')';
        lastWord = '';
        continue;
      }
      if (ch === '"' || ch === "'") {
        const q = ch;
        const s0 = i;
        i++;
        while (i < max) {
          if (code[i] === '\\') { i += 2; continue; }
          if (code[i] === q || code[i] === '\n') break;
          i++;
        }
        if (i < max && code[i] === q) {
          strings.push({ pos: s0, raw: code.slice(s0 + 1, i), isTpl: false });
          i++;
        }
        lastCh = q;
        lastWord = '';
        continue;
      }
      if (ch === '`') {
        const res = scanTemplate(i);
        if (res.raw) strings.push({ pos: i, raw: res.raw, isTpl: res.hasExpr });
        i = res.end + 1;
        lastCh = '`';
        lastWord = '';
        continue;
      }
      if (ch === '(') {
        parenStmtStack.push(lastWord === 'if' || lastWord === 'while' || lastWord === 'for' || lastWord === 'with');
        lastCh = '(';
        lastWord = '';
        i++;
        continue;
      }
      if (ch === ')') {
        const isStmtParen = parenStmtStack.pop();
        lastCh = isStmtParen ? ';' : ')';
        lastWord = '';
        i++;
        continue;
      }
      if (ch === '{') {
        if (stopAtClosingBrace) braceDepth++;
        lastCh = '{';
        lastWord = '';
        i++;
        continue;
      }
      if (ch === '}') {
        if (stopAtClosingBrace) {
          braceDepth--;
          if (braceDepth === 0) return i + 1;
        }
        lastCh = '}';
        lastWord = '';
        i++;
        continue;
      }
      if (/[A-Za-z_$]/.test(ch)) {
        const w0 = i;
        while (i < max && /[A-Za-z0-9_$]/.test(code[i])) i++;
        lastWord = code.slice(w0, i);
        lastCh = 'w';
        continue;
      }
      if (/[0-9]/.test(ch)) {
        while (i < max && /[0-9.xXa-fA-FeE_]/.test(code[i])) i++;
        lastCh = '0';
        lastWord = '';
        continue;
      }
      lastCh = ch;
      lastWord = '';
      i++;
    }
    return i;
  }

  scanSegment(start, false);
  return strings;
}

function parseYamlDesc(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const lines = m[1].split(/\r?\n/);
  let inDesc = false;
  const buf = [];
  for (const line of lines) {
    const km = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (km && !line.startsWith(' ') && !line.startsWith('\t')) {
      if (inDesc) break;
      if (km[1] === 'description') {
        const val = km[2].trim();
        inDesc = true;
        if (val !== '>' && val !== '>-' && val !== '|' && val !== '|-') {
          buf.push(val.replace(/^['"]|['"]$/g, ''));
        }
      }
    } else if (inDesc) {
      buf.push(line.trim());
    }
  }
  if (inDesc && buf.length) return buf.filter(Boolean).join(' ').replace(/^['"]|['"]$/g, '');
  return null;
}

// 品牌专有名词白名单（遵循译法规范：国际通用产品名保持原名，不计为漏翻）
const BRAND_PROPER_NOUNS = new Set([
  'Gmail', 'Firebase', 'Gemini API', 'Looker', 'Stripe', 'Arize AX', 'Auth0', 'Base44', 'Better Stack',
  'Browserbase', 'Canva', 'Clerk', 'ClickUp', 'Cloudflare', 'CodeRabbit', 'Context7', 'CrowdStrike Falcon',
  'Databricks', 'Datadog', 'Descrybe Legal Engine', 'Docusign', 'Dropbox', 'Dynatrace', 'Endor Labs Agent Kit',
  'Figma', 'Grafana Cloud', 'Granola', 'Harness', 'incident.io', 'Intercom', 'invideo', 'Keenable',
  'Keenable SELECT', 'Kling AI', 'Leapwork Play', 'Levels.fyi', 'Linear', 'Midpage Legal Research',
  'Mobbin', 'monday.com', 'mumo', 'Neo4j', 'Netlify', 'Notion', 'Orca Security', 'PandaDoc', 'Parallel',
  'Passim AI', 'PingOne', 'Postman', 'Qodo', 'Railway', 'Scandit SDK', 'Scriptivox', 'Semrush',
  'SentinelOne Purple AI', 'Sentry', 'Exabeam Agentic SOC', 'Spacefast', 'Supabase', 'Superpowers',
  'Tavily', 'TestMu AI', 'Trello', 'Unity', 'Vercel', 'VirusTotal', "Why Won't AI", 'Wispr Flow',
  'Wix', 'WordPress', 'Zapier', 'Bigin', 'Zoho CRM', 'Zoho Desk', 'Zoho Projects', 'Zoho Books', 'VS Code',
]);

function scanLocalSkillsAndPlugins() {
  const home = os.homedir();
  const dirs = [
    path.join(home, '.gemini', 'antigravity', 'builtin'),
    path.join(home, '.gemini', 'antigravity', 'cache', 'marketplaces'),
    path.join(home, '.gemini', 'antigravity', 'mcp'),
    path.join(home, '.gemini', 'config', 'plugins'),
  ];
  let total = 0;
  const uncovered = [];
  const seen = new Set();

  function checkField(raw) {
    if (!raw || typeof raw !== 'string') return;
    const norm = raw.replace(/\s+/g, ' ').trim();
    if (!norm || norm.length < 2 || !/[A-Za-z]{2,}/.test(norm) || seen.has(norm)) return;
    if (BRAND_PROPER_NOUNS.has(norm)) return;
    seen.add(norm);
    total++;
    if (!isTranslated(norm)) uncovered.push(norm);
  }

  function walkJson(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walkJson);
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === 'string' && /^(?:displayName|description|shortDescription|longDescription|category)$/i.test(k)) {
        checkField(v);
      } else if (typeof v === 'object') {
        walkJson(v);
      }
    }
  }

  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== 'references') walk(full);
      } else if (entry.name === 'SKILL.md') {
        const desc = parseYamlDesc(fs.readFileSync(full, 'utf8'));
        if (desc) checkField(desc);
      } else if (entry.name.endsWith('.json')) {
        if (entry.name === 'package.json' || entry.name === 'meta.json') continue;
        try {
          walkJson(JSON.parse(fs.readFileSync(full, 'utf8')));
        } catch {}
      }
    }
  }
  dirs.forEach(walk);
  return { total, uncovered };
}

/**
 * 扫描 language_server.exe 内嵌的 Mendel 默认配置 JSON（自动识别双布局、引导卡片、市场货架 Shelves）
 */
function scanLanguageServerMendel(lsPath) {
  if (!lsPath || !fs.existsSync(lsPath)) return null;
  try {
    const buf = fs.readFileSync(lsPath);
    const anchor = buf.indexOf(Buffer.from('project-4k-mode-copy', 'utf8'));
    if (anchor === -1) return null;

    let s = anchor;
    while (s > Math.max(0, anchor - 250000) && buf[s] !== 0) s--;
    let e = anchor;
    while (e < Math.min(buf.length, anchor + 250000) && buf[e] !== 0) e++;
    const block = buf.subarray(s, e).toString('utf8');
    const startIdx = block.indexOf('{\n  "');
    if (startIdx === -1) return null;

    let depth = 0, inStr = false, esc = false, endIdx = -1;
    for (let i = startIdx; i < block.length; i++) {
      const c = block[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) { endIdx = i; break; }
      }
    }
    if (endIdx === -1) return null;

    const mendel = JSON.parse(block.slice(startIdx, endIdx + 1));
    let total = 0;
    const uncovered = [];
    const seen = new Set();

    function walkBase(val) {
      if (typeof val === 'string') {
        const t = val.trim();
        if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
          try { walkBase(JSON.parse(t)); return; } catch {}
        }
        const norm = t.replace(/\s+/g, ' ');
        if (
          norm.length >= 2 &&
          /[A-Za-z]{2,}/.test(norm) &&
          !/^[a-z0-9_.\-/\\:@=]+$/i.test(norm) &&
          !BRAND_PROPER_NOUNS.has(norm) &&
          !seen.has(norm)
        ) {
          seen.add(norm);
          total++;
          if (!isTranslated(norm)) uncovered.push(norm);
        }
      } else if (Array.isArray(val)) {
        val.forEach(walkBase);
      } else if (val && typeof val === 'object') {
        for (const [k, v] of Object.entries(val)) {
          if (k === 'model_profiles' || k === 'promptSections' || k === 'systemPrompt') continue;
          walkBase(v);
        }
      }
    }
    walkBase(mendel.base || mendel);
    return { total, uncovered };
  } catch {
    return null;
  }
}

function scanFrontendStrongUi(jsContent) {
  const candidates = new Map();
  const tokens = lexJsStrings(jsContent);
  for (const t of tokens) {
    const s = unescapeJsString(t.raw).replace(/\s+/g, ' ').trim();
    const prev = jsContent.slice(Math.max(0, t.pos - 60), t.pos).replace(/\n/g, ' ');
    if (prev.includes('.describe(') || BRAND_PROPER_NOUNS.has(s)) continue;
    if (!isValidUICandidate(s)) continue;
    if (UI_PROP_RE.test(prev)) {
      if (!candidates.has(s)) candidates.set(s, t.isTpl);
    }
  }
  let covered = 0;
  const uncovered = [];
  for (const [text, isTpl] of candidates.entries()) {
    if (isTranslated(text, isTpl)) covered++;
    else uncovered.push(isTpl ? `[TPL] ${text}` : text);
  }
  return { total: candidates.size, covered, uncovered };
}

function scanMainProcessAsar(asarPath) {
  if (!asarPath || !fs.existsSync(asarPath)) return null;
  const buf = fs.readFileSync(asarPath);
  const { header, dataOffset } = parseAsarBuffer(buf, asarPath);
  const files = [];

  function walkTree(node, prefix = '') {
    for (const [name, child] of Object.entries(node.files || {})) {
      const rel = prefix ? `${prefix}/${name}` : name;
      if (child.files) walkTree(child, rel);
      else if (rel.startsWith('dist/') && rel.endsWith('.js') && !rel.includes('__mocks__') && !child.unpacked) {
        const off = dataOffset + Number(child.offset || 0);
        files.push({ rel, raw: buf.subarray(off, off + child.size).toString('utf8') });
      }
    }
  }
  walkTree(header);

  let appliedTotal = 0;
  for (const { rel, raw } of files) {
    const key = rel.replace(/^dist\//, '');
    const rules = mainAssets.staticFileRules[key] || [];
    let patched = raw;
    for (const r of rules) {
      if (r && r.original && patched.includes(r.original)) {
        patched = patched.split(r.original).join(r.translated);
        appliedTotal++;
      }
    }
  }
  return { moduleCount: files.length, appliedTotal };
}

async function fetchActiveMainJs() {
  const logsDir = path.join(process.env.APPDATA || '', 'Antigravity', 'logs');
  const ports = [];
  for (const lf of ['language_server.log', 'main.log']) {
    const p = path.join(logsDir, lf);
    if (!fs.existsSync(p)) continue;
    const txt = fs.readFileSync(p, 'utf8');
    const ms = [...txt.matchAll(/(?:listening on random port at |https:\/\/127\.0\.0\.1:)(\d+)/gi)];
    for (let i = ms.length - 1; i >= 0; i--) {
      if (!ports.includes(ms[i][1])) ports.push(ms[i][1]);
    }
  }
  for (const port of ports.slice(0, 6)) {
    const content = await new Promise((resolve) => {
      const req = https.get(`https://127.0.0.1:${port}/main.js`, { rejectUnauthorized: false, timeout: 1500 }, (res) => {
        if (res.statusCode !== 200) return resolve(null);
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
    if (content) return content;
  }
  return null;
}

async function main() {
  const agDir = resolveAntigravityDir({ allowInteractivePrompt: false, persist: false });
  const paths = getClientPaths(agDir);

  console.log('='.repeat(68));
  console.log('  Antigravity v4.0 四源合一英文词条覆盖率审计报告');
  console.log('='.repeat(68));

  const skillStats = scanLocalSkillsAndPlugins();
  console.log(
    `[1/4 插件市场 & 技能元数据] 扫描 ${skillStats.total} 项，已覆盖 ${skillStats.total - skillStats.uncovered.length} 项 (未覆盖: ${skillStats.uncovered.length})`
  );

  const mendelStats = scanLanguageServerMendel(paths.lsExeV2);
  if (mendelStats) {
    console.log(
      `[2/4 后端 Mendel 动态配置]  扫描 ${mendelStats.total} 项，已覆盖 ${mendelStats.total - mendelStats.uncovered.length} 项 (未覆盖: ${mendelStats.uncovered.length})`
    );
  }

  const jsContent = await fetchActiveMainJs();
  if (jsContent) {
    const feStats = scanFrontendStrongUi(jsContent);
    const pct = feStats.total ? ((feStats.covered / feStats.total) * 100).toFixed(1) : '100.0';
    console.log(
      `[3/4 实时前端强 UI 属性]    扫描 ${feStats.total} 项，已覆盖 ${feStats.covered} 项 (${pct}%)`
    );
  } else {
    console.log('[3/4 实时前端强 UI 属性]    客户端未运行，跳过实时 HTTPS 拉取');
  }

  const asarTarget = fs.existsSync(paths.asarBackupPath) ? paths.asarBackupPath : paths.asarPath;
  const asarStats = scanMainProcessAsar(asarTarget);
  if (asarStats) {
    console.log(
      `[4/4 Electron 主进程 ASAR]  扫描 ${asarStats.moduleCount} 个 dist/*.js 模块，命中 ${asarStats.appliedTotal} 条静态翻译`
    );
  }
  console.log('='.repeat(68));
}

if (require.main === module) {
  main();
}

module.exports = {
  lexJsStrings,
  unescapeJsString,
  isValidUICandidate,
  isTranslated,
  scanLocalSkillsAndPlugins,
  scanLanguageServerMendel,
  scanFrontendStrongUi,
  scanMainProcessAsar,
};
