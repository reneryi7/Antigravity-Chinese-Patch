/**
 * Antigravity 中文汉化补丁 v4.1 - 词库格式、去重排序、纯 ASCII 脚本与无个人痕迹静态检查器
 */

'use strict';

const fs = require('fs');
const path = require('path');
const {
  DEFAULT_LOCALES_DIR,
  EXACT_JSON_FILES,
  compileFrontendScript,
  compileMainProcessAssets,
} = require('../src/compiler.js');
const { generateAutoHealVbs, generateUpdateRunnerVbs } = require('../src/daemon/vbs-templates.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const FIX_MODE = process.argv.includes('--fix');

function main() {
  let errors = 0;
  const seenKeys = new Map();
  let totalExact = 0;

  for (const fname of [...EXACT_JSON_FILES, 'settings-context.json']) {
    const fpath = path.join(DEFAULT_LOCALES_DIR, fname);
    if (!fs.existsSync(fpath)) {
      console.error(`✗ 缺少词库文件: ${fname}`);
      errors++;
      continue;
    }

    const raw = fs.readFileSync(fpath, 'utf8');
    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      console.error(`✗ JSON 语法错误 (${fname}): ${e.message}`);
      errors++;
      continue;
    }

    const keys = Object.keys(obj);
    if (fname !== 'settings-context.json') {
      totalExact += keys.length;
      for (const k of keys) {
        if (seenKeys.has(k)) {
          console.error(`✗ 跨文件重复词条 "${k}": 同时存在于 ${seenKeys.get(k)} 与 ${fname}`);
          errors++;
        } else {
          seenKeys.set(k, fname);
        }
        if (typeof obj[k] !== 'string' || !obj[k].trim()) {
          console.error(`✗ 空译文或非字符串值 (${fname}): "${k}"`);
          errors++;
        }
      }
    }

    const sortedKeys = [...keys].sort((a, b) => a.localeCompare(b));
    if (FIX_MODE) {
      const sortedObj = {};
      for (const k of sortedKeys) sortedObj[k] = obj[k];
      fs.writeFileSync(fpath, JSON.stringify(sortedObj, null, 2) + '\n', 'utf8');
    }
  }

  // 编译校验前端载荷与主进程 Hook 语法
  const feCode = compileFrontendScript();
  const mainAssets = compileMainProcessAssets();

  // 纯 ASCII 批处理与 VBS 模板校验
  for (const bat of ['install.bat', 'uninstall.bat']) {
    const batPath = path.join(ROOT_DIR, bat);
    const content = fs.readFileSync(batPath, 'utf8');
    if (!/^[\x00-\x7F]+$/.test(content)) {
      console.error(`✗ 批处理文件包含非 ASCII 字符（会导致中文 CMD 乱码）: ${bat}`);
      errors++;
    }
  }

  for (const [name, vbs] of [
    ['auto_heal.vbs', generateAutoHealVbs()],
    ['update_runner.vbs', generateUpdateRunnerVbs()],
  ]) {
    if (!/^[\x00-\x7F]+$/.test(vbs)) {
      console.error(`✗ 生成的 ${name} 包含非 ASCII 字符`);
      errors++;
    }
  }

  if (errors > 0) {
    console.error(`\n静态检查未通过，共发现 ${errors} 处问题。`);
    process.exit(1);
  }

  console.log(
    `✓ 词库与编译静态检查全部通过！（共 ${totalExact} 条精确词条，前端编译体积 ${(feCode.length / 1024).toFixed(1)} KB，主进程静态覆盖 ${Object.keys(mainAssets.staticFileRules).length} 个模块）`
  );
}

main();
