/**
 * Antigravity 中文汉化补丁 v4.0 - 后台自愈守护服务生命周期与单次自愈控制器
 */

'use strict';

const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');
const { ofs, sleepSync, isFileLocked } = require('../core/fs-lock.js');
const {
  PROJECT_ROOT,
  PATCH_DATA_DIR,
  SOURCE_DIR_FILE,
  JUNCTION_TARGET_FILE,
  ACTIVE_INSTALLER_FILE,
  RELAUNCH_FLAG_FILE,
  UPDATE_TASK_FILE,
  DAEMON_LOCK_FILE,
  RUNNER_LOCK_FILE,
  VBS_FILE_PATH,
  UPDATE_RUNNER_VBS_PATH,
  CACHED_FRONTEND_SCRIPT_PATH,
  REG_RUN_KEY,
  REG_APPROVED_KEY,
  REG_VALUE_NAME,
  STATE_FILE_PATH,
  GUARDIAN_STATE_FILE_PATH,
  ensurePatchDataDir,
  appendLog,
  getClientPaths,
} = require('../core/config.js');
const { resolveAntigravityDir, persistDetectedDir } = require('../core/detector.js');
const { isAsarPatchedRaw } = require('../core/asar.js');
const { hotInjectZhToRunningWindows, clearVerifiedCdpState } = require('../core/cdp.js');
const { compileFrontendScript } = require('../compiler.js');
const {
  isAntigravityRunning,
  detectAndSaveJunctionTarget,
  ensureDirectoryJunction,
} = require('./junction.js');
const { generateAutoHealVbs, generateUpdateRunnerVbs } = require('./vbs-templates.js');

/**
 * 递归复制模块化源码 (src/ 与 locales/) 到 %APPDATA%\AntigravityChinesePatch，
 * 确保用户安装后即使删除了下载文件夹，后台更新自愈依然 100% 独立可用。
 */
function copyDirectoryRecursive(srcDir, dstDir) {
  if (!ofs.existsSync(srcDir)) return;
  if (!ofs.existsSync(dstDir)) {
    ofs.mkdirSync(dstDir, { recursive: true });
  }
  for (const ent of ofs.readdirSync(srcDir, { withFileTypes: true })) {
    const s = path.join(srcDir, ent.name);
    const d = path.join(dstDir, ent.name);
    if (ent.isDirectory()) {
      copyDirectoryRecursive(s, d);
    } else if (ent.isFile()) {
      const sStat = ofs.statSync(s);
      const dStat = ofs.existsSync(d) ? ofs.statSync(d) : null;
      if (!dStat || sStat.mtimeMs > dStat.mtimeMs || sStat.size !== dStat.size) {
        ofs.copyFileSync(s, d);
      }
    }
  }
}

function syncRuntimeTreeToAppData(rootDir = PROJECT_ROOT) {
  try {
    if (path.resolve(rootDir).toLowerCase() === path.resolve(PATCH_DATA_DIR).toLowerCase()) {
      return;
    }
    copyDirectoryRecursive(path.join(rootDir, 'src'), path.join(PATCH_DATA_DIR, 'src'));
    copyDirectoryRecursive(path.join(rootDir, 'locales'), path.join(PATCH_DATA_DIR, 'locales'));
  } catch {}
}

function syncFromSourceDirIfAvailable() {
  try {
    if (!ofs.existsSync(SOURCE_DIR_FILE)) return;
    const srcRoot = ofs.readFileSync(SOURCE_DIR_FILE, 'utf8').trim();
    if (!srcRoot || !ofs.existsSync(path.join(srcRoot, 'src', 'compiler.js'))) return;
    syncRuntimeTreeToAppData(srcRoot);
  } catch {}
}

/**
 * 优化桌面、开始菜单及任务栏快捷方式的“起始位置 (WorkingDirectory)”为 %USERPROFILE%，
 * 防止快捷方式启动时锁定客户端安装目录句柄。
 */
function optimizeShortcutsWorkingDir(antigravityDir) {
  if (process.platform !== 'win32') return;
  try {
    let savedTarget = '';
    if (ofs.existsSync(JUNCTION_TARGET_FILE)) {
      try { savedTarget = ofs.readFileSync(JUNCTION_TARGET_FILE, 'utf8').trim(); } catch {}
    }
    const psCmd = [
      `$agDir = '${antigravityDir.replace(/'/g, "''")}'`,
      `$jTarget = '${savedTarget.replace(/'/g, "''")}'`,
      `$homeDir = $env:USERPROFILE`,
      `$dirs = @([Environment]::GetFolderPath('Desktop'), (Join-Path $env:USERPROFILE 'Desktop'), (Join-Path $env:USERPROFILE 'OneDrive\\Desktop'), (Join-Path $env:USERPROFILE 'OneDrive\\桌面'), (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs'), (Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\Antigravity'), (Join-Path $env:APPDATA 'Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar'))`,
      `$wsh = New-Object -ComObject WScript.Shell`,
      `foreach ($d in $dirs) {`,
      `  if (Test-Path $d) {`,
      `    Get-ChildItem -Path $d -Filter '*Antigravity*.lnk' -ErrorAction SilentlyContinue | ForEach-Object {`,
      `      try {`,
      `        $sc = $wsh.CreateShortcut($_.FullName)`,
      `        if ($sc.TargetPath -and $sc.TargetPath.ToLower().EndsWith('antigravity.exe')) {`,
      `          $wd = if ($sc.WorkingDirectory) { $sc.WorkingDirectory.TrimEnd('\\').ToLower() } else { '' }`,
      `          if (-not $wd -or $wd -eq $agDir.TrimEnd('\\').ToLower() -or ($jTarget -and $wd -eq $jTarget.TrimEnd('\\').ToLower())) {`,
      `            $sc.WorkingDirectory = $homeDir`,
      `            $sc.Save()`,
      `          }`,
      `        }`,
      `      } catch {}`,
      `    }`,
      `  }`,
      `}`,
    ].join('; ');
    spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      { stdio: 'ignore', windowsHide: true, timeout: 8000 }
    );
  } catch {}
}

function stopRunningAutoHealDaemon(includeRunner = false) {
  if (process.platform !== 'win32') return;
  try {
    const pattern = includeRunner ? '*AntigravityChinesePatch*' : '*AntigravityChinesePatch*auto_heal.vbs*';
    const psCmd = `Get-CimInstance Win32_Process -Filter "Name='wscript.exe' OR Name='cscript.exe'" | Where-Object { $_.CommandLine -like '${pattern}' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`;
    spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      { stdio: 'ignore', windowsHide: true, timeout: 5000 }
    );
  } catch {}
}

function isAutoHealDaemonRunning() {
  return isFileLocked(DAEMON_LOCK_FILE);
}

function isVbScriptAvailable() {
  if (process.platform !== 'win32') return false;
  try {
    const sysRoot = process.env.SystemRoot || 'C:\\Windows';
    const hasHost = ofs.existsSync(path.join(sysRoot, 'System32', 'wscript.exe'));
    const hasDll =
      ofs.existsSync(path.join(sysRoot, 'System32', 'vbscript.dll')) ||
      ofs.existsSync(path.join(sysRoot, 'SysWOW64', 'vbscript.dll'));
    if (!hasHost || !hasDll) return false;
    for (const hive of ['HKLM', 'HKCU']) {
      const wshReg = spawnSync(
        'reg.exe',
        ['query', `${hive}\\SOFTWARE\\Microsoft\\Windows Script Host\\Settings`, '/v', 'Enabled'],
        { encoding: 'utf8', windowsHide: true, timeout: 2500 }
      );
      if (wshReg.status === 0 && /REG_DWORD\s+0x0\b/i.test(wshReg.stdout || '')) {
        return false;
      }
    }
    const clsidReg = spawnSync('reg.exe', ['query', 'HKCR\\VBScript\\CLSID'], {
      stdio: 'ignore',
      windowsHide: true,
      timeout: 2500,
    });
    return clsidReg.status === 0;
  } catch {
    return false;
  }
}

function startAutoHealDaemonProcess() {
  if (process.platform !== 'win32' || !ofs.existsSync(VBS_FILE_PATH) || !isVbScriptAvailable()) return false;
  if (isAutoHealDaemonRunning()) return true;

  try {
    const escapedVbs = VBS_FILE_PATH.replace(/'/g, "''");
    const escapedDir = PATCH_DATA_DIR.replace(/'/g, "''");
    const psCmd = [
      `$vbs = '${escapedVbs}'`,
      `$dir = '${escapedDir}'`,
      `$cmd = 'wscript.exe //B "' + $vbs + '"'`,
      `$res = Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd; CurrentDirectory = $dir }`,
      `if (-not $res -or $res.ReturnValue -ne 0) { Start-Process -FilePath 'wscript.exe' -ArgumentList '//B', $vbs -WorkingDirectory $dir -WindowStyle Hidden }`,
    ].join('; ');
    spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      { stdio: 'ignore', windowsHide: true, timeout: 6000 }
    );
  } catch {}

  for (let i = 0; i < 8; i++) {
    if (isAutoHealDaemonRunning()) return true;
    sleepSync(100);
  }

  try {
    const child = spawn('wscript.exe', ['//B', VBS_FILE_PATH], {
      cwd: PATCH_DATA_DIR,
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    if (child && typeof child.unref === 'function') child.unref();
  } catch {}

  for (let i = 0; i < 6; i++) {
    if (isAutoHealDaemonRunning()) return true;
    sleepSync(100);
  }

  return isAutoHealDaemonRunning();
}

function installAutoHealService(antigravityDir, projectRoot = PROJECT_ROOT) {
  if (process.platform !== 'win32') return false;
  try {
    ensurePatchDataDir();
    persistDetectedDir(antigravityDir);

    if (projectRoot && path.resolve(projectRoot).toLowerCase() !== path.resolve(PATCH_DATA_DIR).toLowerCase()) {
      ofs.writeFileSync(SOURCE_DIR_FILE, path.resolve(projectRoot), 'utf8');
    }

    detectAndSaveJunctionTarget(antigravityDir);
    optimizeShortcutsWorkingDir(antigravityDir);
    syncRuntimeTreeToAppData(projectRoot);

    const frontendCode = compileFrontendScript();
    ofs.writeFileSync(CACHED_FRONTEND_SCRIPT_PATH, frontendCode, 'utf8');

    const paths = getClientPaths(antigravityDir);
    if (ofs.existsSync(paths.asarPath)) {
      const sizeStr = `${ofs.statSync(paths.asarPath).size}`;
      ofs.writeFileSync(STATE_FILE_PATH, sizeStr, 'utf8');
      ofs.writeFileSync(GUARDIAN_STATE_FILE_PATH, sizeStr, 'utf8');
    }

    if (!isFileLocked(RUNNER_LOCK_FILE)) {
      for (const staleFile of [ACTIVE_INSTALLER_FILE, RELAUNCH_FLAG_FILE, UPDATE_TASK_FILE]) {
        if (ofs.existsSync(staleFile)) {
          try { ofs.unlinkSync(staleFile); } catch {}
        }
      }
    }

    if (!isVbScriptAvailable()) {
      for (const staleVbs of [UPDATE_RUNNER_VBS_PATH, VBS_FILE_PATH]) {
        try {
          if (ofs.existsSync(staleVbs)) ofs.unlinkSync(staleVbs);
        } catch {}
      }
      appendLog('检测到当前系统未启用 VBScript 引擎 (vbscript.dll/WSH)，已自动降级为纯 ASAR 静态注入模式');
      return false;
    }

    stopRunningAutoHealDaemon(false);
    // 清理 v3.x 历史版本在 %APPDATA% 遗留的旧版顶层巨石脚本，保持守护目录整洁
    for (const legacyFile of ['install_patch.js', 'translations.js', 'i18n_inject.js', 'auto_heal_daemon.js', 'delay_restart.vbs']) {
      const lp = path.join(PATCH_DATA_DIR, legacyFile);
      if (ofs.existsSync(lp)) {
        try { ofs.unlinkSync(lp); } catch {}
      }
    }
    ofs.writeFileSync(UPDATE_RUNNER_VBS_PATH, generateUpdateRunnerVbs(), 'ascii');
    ofs.writeFileSync(VBS_FILE_PATH, generateAutoHealVbs(), 'ascii');

    try {
      execSync(
        `reg add "${REG_RUN_KEY}" /v "${REG_VALUE_NAME}" /t REG_SZ /d "wscript.exe //B \\"${VBS_FILE_PATH}\\"" /f`,
        { stdio: 'ignore', windowsHide: true }
      );
      execSync(
        `reg add "${REG_APPROVED_KEY}" /v "${REG_VALUE_NAME}" /t REG_BINARY /d 020000000000000000000000 /f`,
        { stdio: 'ignore', windowsHide: true }
      );
    } catch {}

    try {
      execSync(
        `schtasks /Create /TN "${REG_VALUE_NAME}" /TR "wscript.exe //B \\"${VBS_FILE_PATH}\\"" /SC MINUTE /MO 10 /F`,
        { stdio: 'ignore', windowsHide: true }
      );
      spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-Command',
          `Set-ScheduledTask -TaskName '${REG_VALUE_NAME}' -Settings (New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew) | Out-Null`,
        ],
        { stdio: 'ignore', windowsHide: true, timeout: 6000 }
      );
    } catch {}

    const started = startAutoHealDaemonProcess();
    appendLog(`已部署 v4.0 同步更新代理与常驻守护服务 (daemonRunning=${started})`);
    return true;
  } catch (err) {
    appendLog(`安装守护服务失败: ${err.message}`);
    return false;
  }
}

function uninstallAutoHealService(clientPaths = null) {
  if (process.platform !== 'win32') return;
  try { stopRunningAutoHealDaemon(true); } catch {}
  try { execSync(`reg delete "${REG_RUN_KEY}" /v "${REG_VALUE_NAME}" /f`, { stdio: 'ignore', windowsHide: true }); } catch {}
  try { execSync(`reg delete "${REG_APPROVED_KEY}" /v "${REG_VALUE_NAME}" /f`, { stdio: 'ignore', windowsHide: true }); } catch {}
  try { execSync(`schtasks /Delete /TN "${REG_VALUE_NAME}" /F`, { stdio: 'ignore', windowsHide: true }); } catch {}

  if (clientPaths && clientPaths.deployedZhScriptPath && ofs.existsSync(clientPaths.deployedZhScriptPath)) {
    try { ofs.unlinkSync(clientPaths.deployedZhScriptPath); } catch {}
  }

  // 清理守护执行体与运行态锁文件，但保留用户本地 config.json / junction_target.txt 避免丢失自定义路径配置
  for (const target of [
    VBS_FILE_PATH,
    UPDATE_RUNNER_VBS_PATH,
    STATE_FILE_PATH,
    GUARDIAN_STATE_FILE_PATH,
    CACHED_FRONTEND_SCRIPT_PATH,
    ACTIVE_INSTALLER_FILE,
    RELAUNCH_FLAG_FILE,
    UPDATE_TASK_FILE,
    path.join(PATCH_DATA_DIR, 'src'),
    path.join(PATCH_DATA_DIR, 'locales'),
  ]) {
    try {
      if (ofs.existsSync(target)) {
        ofs.rmSync(target, { recursive: true, force: true });
      }
    } catch {}
  }
}

/**
 * 执行后台单次自愈检查（由 auto_heal.vbs 或 update_runner.vbs 触发）
 */
async function checkAndHealOnce(options = {}) {
  const { allowLiveHotInject = true, verifyLiveOnly = false } = options;
  syncFromSourceDirIfAvailable();

  const antigravityDir = resolveAntigravityDir({ allowInteractivePrompt: false, persist: false });
  const paths = getClientPaths(antigravityDir);

  const juncRes = ensureDirectoryJunction(antigravityDir, null, {
    allowLiveEvict: !verifyLiveOnly,
    skipSyncIfAsarMatches: verifyLiveOnly,
  });
  if (juncRes.status === 'repaired') {
    appendLog(`目录软链接已自动恢复 (${juncRes.mode || 'auto'}): ${antigravityDir} -> ${juncRes.target}`);
  }

  if (!ofs.existsSync(paths.asarPath)) {
    return false;
  }

  if (!globalThis.__agShortcutsChecked || juncRes.status === 'repaired') {
    optimizeShortcutsWorkingDir(antigravityDir);
    globalThis.__agShortcutsChecked = true;
  }

  const i18nSource = compileFrontendScript();
  let updatedDeployJs = false;
  if (i18nSource) {
    try {
      const curDeploy = ofs.existsSync(paths.deployedZhScriptPath)
        ? ofs.readFileSync(paths.deployedZhScriptPath, 'utf8')
        : '';
      if (curDeploy !== i18nSource) {
        ofs.writeFileSync(paths.deployedZhScriptPath, i18nSource, 'utf8');
        ofs.writeFileSync(CACHED_FRONTEND_SCRIPT_PATH, i18nSource, 'utf8');
        updatedDeployJs = true;
      }
    } catch {}
  }

  let healedAsar = false;
  if (isAsarPatchedRaw(paths.asarPath)) {
    try {
      const sizeStr = `${ofs.statSync(paths.asarPath).size}`;
      ofs.writeFileSync(STATE_FILE_PATH, sizeStr, 'utf8');
      ofs.writeFileSync(GUARDIAN_STATE_FILE_PATH, sizeStr, 'utf8');
    } catch {}
  } else {
    appendLog('检测到 resources/app.asar 被更新重置，正在自动重新注入 v4.0 中文汉化补丁...');
    // 延迟加载避免循环依赖
    const { installPatch } = require('../core/patcher.js');
    const res = await installPatch({
      autoHealMode: true,
      explicitPath: antigravityDir,
    });
    if (res && res.ok && isAsarPatchedRaw(paths.asarPath)) {
      healedAsar = true;
      optimizeShortcutsWorkingDir(antigravityDir);
      appendLog('自动重汉化 app.asar 完成！');
    } else {
      appendLog('自动重汉化未成功完成');
      return false;
    }
  }

  if (!allowLiveHotInject) {
    clearVerifiedCdpState();
  }

  if (allowLiveHotInject && isAntigravityRunning(antigravityDir)) {
    const cdpRes = await hotInjectZhToRunningWindows({
      maxAttempts: verifyLiveOnly ? 10 : 15,
      retryDelayMs: 650,
      verifyOnly: verifyLiveOnly && !healedAsar && !updatedDeployJs,
      frontendScript: i18nSource,
    });
    if (cdpRes.injected > 0) {
      appendLog(`已通过本地 CDP (端口 ${cdpRes.port}) 实时热汉化 ${cdpRes.injected} 个活动窗口`);
    }
  }

  return healedAsar;
}

module.exports = {
  installAutoHealService,
  uninstallAutoHealService,
  isAutoHealDaemonRunning,
  optimizeShortcutsWorkingDir,
  checkAndHealOnce,
};
