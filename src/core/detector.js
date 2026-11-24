/**
 * Antigravity 中文汉化补丁 v4.0 - 五级智能客户端安装路径探测器
 *
 * 探测优先级：
 * 1. 命令行 --path=<dir> 或环境变量 ANTIGRAVITY_INSTALL_DIR 或本地配置 installDir
 * 2. 已持久化的 %APPDATA%\AntigravityChinesePatch\install_dir.txt
 * 3. Windows 注册表 Uninstall 项（支持用户安装到任意自定义盘符/目录，如 D:\Apps\Antigravity）
 * 4. 当前正在运行的 Antigravity.exe 进程路径与 PATH 中的 agy CLI 反推
 * 5. 各平台标准默认路径 (%LOCALAPPDATA%\Programs\Antigravity, %ProgramFiles%\Antigravity)
 * 6. 交互模式下弹出 Windows 文件夹选择框兜底并自动记住路径
 */

'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { ofs } = require('./fs-lock.js');
const {
  LOCAL_APPDATA,
  INSTALL_DIR_FILE,
  ensurePatchDataDir,
  loadMergedConfig,
  saveUserConfig,
} = require('./config.js');

function isValidAntigravityDir(dir) {
  if (!dir || typeof dir !== 'string') return false;
  try {
    const cleaned = path.resolve(dir.trim().replace(/^["']|["']$/g, ''));
    return (
      ofs.existsSync(path.join(cleaned, 'resources', 'app.asar')) ||
      ofs.existsSync(path.join(cleaned, 'Antigravity.exe'))
    );
  } catch {
    return false;
  }
}

function normalizeCandidateDir(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return null;
  let cleaned = rawPath.trim().replace(/^["']|["']$/g, '');
  // 处理 DisplayIcon 如 "D:\Antigravity\Antigravity.exe,0"
  cleaned = cleaned.replace(/,\s*-?\d+$/, '').trim();
  if (/\.exe$/i.test(cleaned)) {
    cleaned = path.dirname(cleaned);
  } else if (path.basename(cleaned).toLowerCase() === 'resources') {
    cleaned = path.dirname(cleaned);
  } else if (path.basename(cleaned).toLowerCase() === 'bin') {
    const up1 = path.dirname(cleaned);
    cleaned = path.basename(up1).toLowerCase() === 'resources' ? path.dirname(up1) : up1;
  }
  return cleaned ? path.resolve(cleaned) : null;
}

function detectFromWindowsRegistry() {
  if (process.platform !== 'win32') return null;
  try {
    const psCmd = [
      `$roots = @(`,
      `  'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',`,
      `  'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*',`,
      `  'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'`,
      `)`,
      `$items = Get-ItemProperty -Path $roots -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -and $_.DisplayName -match '^Antigravity(\\s|$)' -and $_.DisplayName -notmatch 'IDE|Tools' }`,
      `foreach ($it in $items) {`,
      `  if ($it.InstallLocation) { Write-Output $it.InstallLocation }`,
      `  if ($it.DisplayIcon) { Write-Output $it.DisplayIcon }`,
      `}`,
    ].join('; ');
    const res = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      { encoding: 'utf8', windowsHide: true, timeout: 4500 }
    );
    if (res.status === 0 && res.stdout) {
      for (const line of res.stdout.split(/\r?\n/)) {
        const dir = normalizeCandidateDir(line);
        if (dir && isValidAntigravityDir(dir)) return dir;
      }
    }
  } catch {}
  return null;
}

function detectFromRunningProcessAndPath() {
  if (process.platform !== 'win32') return null;
  try {
    const psCmd = [
      `$p = Get-Process -Name 'Antigravity' -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1`,
      `if ($p) { Write-Output $p.Path }`,
      `$cmd = Get-Command 'agy.cmd','agy.exe','antigravity.cmd' -ErrorAction SilentlyContinue | Select-Object -First 1`,
      `if ($cmd -and $cmd.Source) { Write-Output $cmd.Source }`,
    ].join('; ');
    const res = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      { encoding: 'utf8', windowsHide: true, timeout: 4000 }
    );
    if (res.status === 0 && res.stdout) {
      for (const line of res.stdout.split(/\r?\n/)) {
        const dir = normalizeCandidateDir(line);
        if (dir && isValidAntigravityDir(dir)) return dir;
      }
    }
  } catch {}
  return null;
}

function promptFolderPickerDialog() {
  if (process.platform !== 'win32') return null;
  try {
    const psCmd = [
      `Add-Type -AssemblyName System.Windows.Forms`,
      `$dlg = New-Object System.Windows.Forms.FolderBrowserDialog`,
      `$dlg.Description = '请选择 Google Antigravity 安装目录（包含 Antigravity.exe 的文件夹）'`,
      `$dlg.ShowNewFolderButton = $false`,
      `if ($dlg.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $dlg.SelectedPath }`,
    ].join('; ');
    const res = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-Sta', '-Command', psCmd],
      { encoding: 'utf8', timeout: 120000 }
    );
    if (res.status === 0 && res.stdout) {
      const picked = normalizeCandidateDir(res.stdout.trim());
      if (picked && isValidAntigravityDir(picked)) return picked;
    }
  } catch {}
  return null;
}

/**
 * 获取目录的纯 ASCII 安全路径（若含中文等非 ASCII 字符，转换为 Windows 8.3 短路径以兼容纯 ASCII VBScript）
 */
function toAsciiSafePath(targetPath) {
  if (!targetPath || /^[\x00-\x7F]+$/.test(targetPath) || process.platform !== 'win32') {
    return targetPath;
  }
  try {
    const res = spawnSync(
      'cmd.exe',
      ['/d', '/c', `for %I in ("${targetPath}") do @echo %~sI`],
      { encoding: 'utf8', windowsHide: true, timeout: 3000 }
    );
    const shortPath = (res.stdout || '').trim();
    if (shortPath && /^[\x00-\x7F]+$/.test(shortPath) && ofs.existsSync(shortPath)) {
      return shortPath;
    }
  } catch {}
  return targetPath;
}

function persistDetectedDir(dir) {
  try {
    ensurePatchDataDir();
    const asciiDir = toAsciiSafePath(dir);
    ofs.writeFileSync(INSTALL_DIR_FILE, asciiDir, 'utf8');
    saveUserConfig({ installDir: dir });
  } catch {}
}

/**
 * 解析客户端安装目录
 */
function resolveAntigravityDir(options = {}) {
  const { explicitPath = null, allowInteractivePrompt = false, persist = true } = options;

  // 1. 显式参数或环境变量
  const directCandidates = [
    explicitPath,
    process.env.ANTIGRAVITY_INSTALL_DIR,
    loadMergedConfig().installDir,
  ];
  for (const raw of directCandidates) {
    const norm = normalizeCandidateDir(raw);
    if (norm && isValidAntigravityDir(norm)) {
      if (persist) persistDetectedDir(norm);
      return norm;
    }
  }

  // 2. 标准默认目录优先检查（保持符号链接/目录联接的逻辑入口路径，如 %LOCALAPPDATA%\Programs\Antigravity）
  const standardDirs = [
    path.join(LOCAL_APPDATA, 'Programs', 'Antigravity'),
    path.join(LOCAL_APPDATA, 'Programs', 'antigravity'),
    path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'Antigravity'),
    path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'Antigravity'),
  ];
  for (const d of standardDirs) {
    if (isValidAntigravityDir(d)) {
      if (persist) persistDetectedDir(d);
      return d;
    }
  }

  // 3. 已保存的 install_dir.txt
  try {
    if (ofs.existsSync(INSTALL_DIR_FILE)) {
      const saved = normalizeCandidateDir(ofs.readFileSync(INSTALL_DIR_FILE, 'utf8'));
      if (saved && isValidAntigravityDir(saved)) {
        return saved;
      }
    }
  } catch {}

  // 4. Windows 注册表 Uninstall 探测（支持装在任意自定义盘符的用户）
  const regDir = detectFromWindowsRegistry();
  if (regDir) {
    if (persist) persistDetectedDir(regDir);
    return regDir;
  }

  // 5. 运行中进程与 CLI 反推
  const procDir = detectFromRunningProcessAndPath();
  if (procDir) {
    if (persist) persistDetectedDir(procDir);
    return procDir;
  }

  // 6. 交互模式下弹窗让用户选择一次目录
  if (allowInteractivePrompt) {
    const picked = promptFolderPickerDialog();
    if (picked) {
      if (persist) persistDetectedDir(picked);
      return picked;
    }
  }

  // 兜底返回默认路径供外层打印清晰提示
  return path.join(LOCAL_APPDATA, 'Programs', 'Antigravity');
}

module.exports = {
  isValidAntigravityDir,
  resolveAntigravityDir,
  persistDetectedDir,
  toAsciiSafePath,
};
