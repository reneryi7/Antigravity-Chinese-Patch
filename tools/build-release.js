/**
 * Antigravity 中文汉化补丁 v4.1 - 最小化纯净 GitHub Release 构建与安全校验工具
 *
 * 输出目录：dist-release/Antigravity-Chinese-Patch-v4.1.0/ 及对应 .zip 压缩包
 * 严格校验：确保发布包中零个人文件、零原始 .asar 快照、零本机硬编码路径泄漏！
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PATCH_VERSION, TARGET_AGY_VERSION } = require('../src/compiler.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_BASE = path.join(ROOT_DIR, 'dist-release');
const PKG_NAME = `Antigravity-Chinese-Patch-v${PATCH_VERSION}`;
const STAGE_DIR = path.join(OUT_BASE, PKG_NAME);
const ZIP_PATH = path.join(OUT_BASE, `${PKG_NAME}.zip`);

const COPY_ITEMS = [
  'install.bat',
  'uninstall.bat',
  'LICENSE',
  'README.md',
  'src',
  'locales',
];

// 隐私与无个人痕迹黑名单正则（确保上传 GitHub 的代码和发布包 100% 纯净，不含任何本机路径）
const FORBIDDEN_PATTERNS = [
  /AntigravityData/i,
  /[A-Z]:\\Users\\(?!<|YourName|Public)/i,
  /pelican_bicycle/i,
  /source_original_/i,
];

function copyRecursive(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const ent of fs.readdirSync(src)) {
      copyRecursive(path.join(src, ent), path.join(dst, ent));
    }
  } else {
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
  }
}

function generateUsageTxt() {
  return `Antigravity 中文汉化补丁 v${PATCH_VERSION} 快速使用说明
======================================================

适用版本：Google Antigravity 桌面客户端（已全面适配至 v${TARGET_AGY_VERSION}+）
运行环境：Windows 10 / 11（无需安装 Node.js，零外部依赖）

一、一键安装（只需 2 步）
-------------------------
1. 将本压缩包完整解压到任意文件夹（请勿直接在压缩包预览窗口中双击）。
2. 双击运行“install.bat”。
   - 脚本会自动探测 Antigravity 安装目录（支持默认目录、Program Files 及任意自定义盘符）。
   - 若当前已打开 Antigravity 窗口，将在 1 秒内直接原地热切换为中文，无需重启关闭对话；
   - 方便时重启一次客户端即可使顶部系统原生菜单与托盘菜单完全生效。

二、更新防失效保障
------------------
默认自动启用轻量级更新自愈服务：无论是点击软件内“重启以更新”，还是手动下载新版安装包覆盖安装，均会自动保持中文界面。
（如仅需单次静态汉化而不希望启用后台更新自愈，可在命令行运行：install.bat --no-daemon）

三、一键卸载（恢复官方英文原版）
--------------------------------
1. 双击运行“uninstall.bat”。
2. 重启 Antigravity 即可完全恢复英文原版状态。
`;
}

function verifyStageCleanliness(dir) {
  const files = [];
  function walk(cur) {
    for (const ent of fs.readdirSync(cur, { withFileTypes: true })) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) walk(full);
      else files.push(full);
    }
  }
  walk(dir);

  for (const f of files) {
    const rel = path.relative(dir, f);
    if (/\.(asar|backup|old|lock|log)$/i.test(rel) || rel === 'config.local.json') {
      throw new Error(`发布包中发现禁止附带的本地文件: ${rel}`);
    }
    const content = fs.readFileSync(f, 'utf8');
    for (const re of FORBIDDEN_PATTERNS) {
      if (re.test(content)) {
        throw new Error(`发布包文件 ${rel} 触发隐私/本地路径安全拦截规则: ${re}`);
      }
    }
  }
  return files.length;
}

function main() {
  if (fs.existsSync(OUT_BASE)) {
    fs.rmSync(OUT_BASE, { recursive: true, force: true });
  }
  fs.mkdirSync(STAGE_DIR, { recursive: true });

  for (const item of COPY_ITEMS) {
    const src = path.join(ROOT_DIR, item);
    if (!fs.existsSync(src)) {
      throw new Error(`缺少构建必需文件或目录: ${item}`);
    }
    copyRecursive(src, path.join(STAGE_DIR, item));
  }

  fs.writeFileSync(path.join(STAGE_DIR, '使用说明.txt'), generateUsageTxt(), 'utf8');

  const fileCount = verifyStageCleanliness(STAGE_DIR);

  if (process.platform === 'win32') {
    const psCmd = `Compress-Archive -Path '${STAGE_DIR.replace(/'/g, "''")}\\*' -DestinationPath '${ZIP_PATH.replace(/'/g, "''")}' -Force`;
    const res = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
      encoding: 'utf8',
      windowsHide: true,
    });
    if (res.status !== 0) {
      throw new Error(`生成 ZIP 压缩包失败: ${res.stderr || res.stdout}`);
    }
  }

  const zipSizeKb = fs.existsSync(ZIP_PATH) ? (fs.statSync(ZIP_PATH).size / 1024).toFixed(1) : 'N/A';
  console.log(`✓ 最小可发布包构建并完成隐私纯净度校验！`);
  console.log(`  目录: ${STAGE_DIR} (共 ${fileCount} 个文件)`);
  console.log(`  压缩包: ${ZIP_PATH} (${zipSizeKb} KB)`);
}

main();
