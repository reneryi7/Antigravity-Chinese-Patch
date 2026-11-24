/**
 * Antigravity 中文汉化补丁 v4.0 - 进程状态探测与按需软链接保护模块
 *
 * 安全设计原则（面向开源用户）：
 * - 绝不主动扫描其他盘符或猜测跨盘路径；普通文件夹安装用户 100% 不触发任何目录迁移或软链接创建。
 * - 仅当当前安装目录本身已是用户自己建立的有效 NTFS Junction/Symlink，或用户在本地私有配置中显式设置了
 *   junctionTarget 时，才在官方安装包覆盖重置目录后自动保护并恢复该软链接。
 */

'use strict';

const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { ofs, sleepSync, isFileLocked, withPatchTxnLock } = require('../core/fs-lock.js');
const {
  LOCAL_APPDATA,
  PATCH_DATA_DIR,
  JUNCTION_TARGET_FILE,
  ensurePatchDataDir,
  appendLog,
  loadMergedConfig,
  saveUserConfig,
  getClientPaths,
} = require('../core/config.js');
const { toAsciiSafePath } = require('../core/detector.js');

const LIVE_EVICT_PREFIX = 'ag-zh-live-evict-';

function isAntigravityRunning(antigravityDir) {
  const p = getClientPaths(antigravityDir);
  return isFileLocked(p.antigravityExe) || isFileLocked(p.lsExeV2) || isFileLocked(p.lsExeV1);
}

/**
 * 区分真正运行中的主程序/语言服务器与 Antigravity 2.32+ 退出后遗留的孤儿 sidecar_sdk 进程
 */
function inspectSidecarProcessState(antigravityDir) {
  if (process.platform !== 'win32') {
    return { supported: false, mainAlive: false, orphanSidecars: [] };
  }
  try {
    const agDirLower = path.resolve(antigravityDir).toLowerCase().replace(/'/g, "''");
    const psCmd = [
      `$agDir = '${agDirLower}'`,
      `$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue`,
      `$byPid = @{}; foreach ($x in $procs) { $byPid[[int]$x.ProcessId] = $x }`,
      `$mainAlive = $false`,
      `$rootPids = @{}`,
      `$sidecars = @()`,
      `foreach ($p in $procs) {`,
      `  if ($p.ProcessId -eq ${process.pid}) { continue }`,
      `  $nm = ([string]$p.Name).ToLower()`,
      `  $ep = ([string]$p.ExecutablePath).ToLower()`,
      `  $cmd = ([string]$p.CommandLine).ToLower()`,
      `  if ($nm -eq 'language_server.exe' -or $nm -eq 'language_server_windows_x64.exe') {`,
      `    if (-not $ep -or $ep.Contains($agDir)) { $mainAlive = $true; $rootPids[[int]$p.ProcessId] = $true }`,
      `  } elseif ($nm -eq 'antigravity.exe') {`,
      `    if ($cmd.Contains('sidecar_sdk')) {`,
      `      $sidecars += $p`,
      `    } elseif (-not $cmd.Contains('cli.js') -and -not $cmd.Contains('auto_heal_daemon.js') -and -not $cmd.Contains('auto-heal-daemon.js') -and -not $cmd.Contains('install_patch.js') -and -not $cmd.Contains('uninstall_patch.js') -and -not $cmd.Contains('doctor.js') -and -not $cmd.Contains('install.js')) {`,
      `      $mainAlive = $true; $rootPids[[int]$p.ProcessId] = $true`,
      `    }`,
      `  } elseif ($nm -eq 'cmd.exe') {`,
      `    if ($cmd.Contains('agy-node.cmd') -and $cmd.Contains('sidecar_sdk')) {`,
      `      $sidecars += $p`,
      `    }`,
      `  }`,
      `}`,
      `$orphans = @()`,
      `foreach ($sc in $sidecars) {`,
      `  $cur = $sc; $hasLiveRoot = $false`,
      `  for ($h = 0; $h -lt 3; $h++) {`,
      `    $pp = [int]$cur.ParentProcessId`,
      `    if ($rootPids.ContainsKey($pp)) { $hasLiveRoot = $true; break }`,
      `    if (-not $byPid.ContainsKey($pp)) { break }`,
      `    $cur = $byPid[$pp]`,
      `  }`,
      `  if (-not $hasLiveRoot) { $orphans += [int]$sc.ProcessId }`,
      `}`,
      `[PSCustomObject]@{ mainAlive = $mainAlive; orphanSidecars = @($orphans) } | ConvertTo-Json -Compress`,
    ].join('; ');
    const out = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-WindowStyle', 'Hidden', '-Command', psCmd],
      { encoding: 'utf8', windowsHide: true, timeout: 6000 }
    );
    if (out.status === 0 && out.stdout) {
      const parsed = JSON.parse(out.stdout.trim());
      return {
        supported: true,
        mainAlive: Boolean(parsed.mainAlive),
        orphanSidecars: Array.isArray(parsed.orphanSidecars)
          ? parsed.orphanSidecars.filter((n) => Number.isInteger(n) && n > 0)
          : parsed.orphanSidecars
            ? [Number(parsed.orphanSidecars)].filter((n) => Number.isInteger(n) && n > 0)
            : [],
      };
    }
  } catch {}
  return { supported: false, mainAlive: isAntigravityRunning(antigravityDir), orphanSidecars: [] };
}

function cleanupOrphanedSidecarsIfMainExited(antigravityDir) {
  if (process.platform !== 'win32') return { cleaned: 0, mainAlive: false };
  const exe = path.join(antigravityDir, 'Antigravity.exe');
  if (!isFileLocked(exe)) return { cleaned: 0, mainAlive: false };
  const state = inspectSidecarProcessState(antigravityDir);
  if (!state.supported || state.mainAlive || state.orphanSidecars.length === 0) {
    return { cleaned: 0, mainAlive: state.mainAlive };
  }
  try {
    const idList = state.orphanSidecars.join(',');
    spawnSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-Command',
        `foreach ($id in @(${idList})) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }`,
      ],
      { stdio: 'ignore', windowsHide: true, timeout: 5000 }
    );
    for (let i = 0; i < 12; i++) {
      if (!isAntigravityRunning(antigravityDir)) break;
      sleepSync(50);
    }
    if (!isAntigravityRunning(antigravityDir)) {
      appendLog(`已清理 ${state.orphanSidecars.length} 个孤儿 sidecar 进程，释放可执行文件锁`);
      return { cleaned: state.orphanSidecars.length, mainAlive: false };
    }
  } catch {}
  return { cleaned: 0, mainAlive: state.mainAlive };
}

function getDirectoryLinkInfo(dirPath) {
  const info = {
    path: dirPath,
    exists: false,
    isLink: false,
    linkType: null,
    target: null,
    targetExists: false,
  };
  try {
    const lstat = ofs.lstatSync(dirPath);
    info.exists = true;
    if (lstat.isSymbolicLink()) {
      info.isLink = true;
      info.linkType = 'Junction/SymbolicLink';
      try {
        info.target = ofs.readlinkSync(dirPath).replace(/^\\\\\?\\/, '');
      } catch {}
    }
    try {
      const real = ofs.realpathSync(dirPath).replace(/^\\\\\?\\/, '');
      if (path.resolve(real).toLowerCase() !== path.resolve(dirPath).toLowerCase()) {
        info.isLink = true;
        if (!info.linkType) info.linkType = 'Junction';
        info.target = real;
      }
      info.targetExists = ofs.existsSync(info.target || real);
    } catch {
      info.targetExists = info.target ? ofs.existsSync(info.target) : false;
    }
  } catch {}
  return info;
}

function isDirectoryJunction(dirPath) {
  return getDirectoryLinkInfo(dirPath).isLink;
}

/**
 * 解析软链接保护目标（零猜测：仅读取显式参数、当前目录真实软链接目标、或用户已保存的本地配置）
 */
function detectAndSaveJunctionTarget(antigravityDir, explicitTarget = null) {
  if (process.platform !== 'win32') return null;
  try {
    let target = null;
    const cfg = loadMergedConfig();
    if (cfg.junctionEnabled === false) {
      return null;
    }

    // 1. 显式命令行传入
    if (explicitTarget && typeof explicitTarget === 'string') {
      const cleaned = path.resolve(explicitTarget.trim());
      if (cleaned.toLowerCase() !== path.resolve(antigravityDir).toLowerCase()) {
        target = cleaned;
      }
    }

    // 2. 本地 config.local.json / config.json 显式配置
    if (!target && cfg.junctionTarget && typeof cfg.junctionTarget === 'string') {
      const cleaned = path.resolve(cfg.junctionTarget.trim());
      if (cleaned.toLowerCase() !== path.resolve(antigravityDir).toLowerCase()) {
        target = cleaned;
      }
    }

    // 3. 当前安装目录本身已经是一个有效的 NTFS Junction/Symlink -> 被动保护该真实目标
    if (!target) {
      const linkInfo = getDirectoryLinkInfo(antigravityDir);
      if (linkInfo.isLink && linkInfo.target) {
        const resolved = path.resolve(linkInfo.target);
        if (resolved.toLowerCase() !== path.resolve(antigravityDir).toLowerCase()) {
          target = resolved;
        }
      }
    }

    // 4. 读取已持久化的本地 junction_target.txt
    if (!target && ofs.existsSync(JUNCTION_TARGET_FILE)) {
      const saved = ofs.readFileSync(JUNCTION_TARGET_FILE, 'utf8').trim();
      if (saved && path.resolve(saved).toLowerCase() !== path.resolve(antigravityDir).toLowerCase()) {
        target = path.resolve(saved);
      }
    }

    if (target && path.resolve(target).toLowerCase() !== path.resolve(antigravityDir).toLowerCase()) {
      ensurePatchDataDir();
      ofs.writeFileSync(JUNCTION_TARGET_FILE, toAsciiSafePath(target), 'utf8');
      saveUserConfig({ junctionTarget: target });
      return target;
    }
  } catch {}
  return null;
}

function cleanupStaleLiveEvictDirs() {
  if (process.platform !== 'win32') return;
  const bases = new Set([path.resolve(os.tmpdir()), path.join(LOCAL_APPDATA, 'Temp')]);
  for (const base of bases) {
    try {
      if (!ofs.existsSync(base)) continue;
      for (const entry of ofs.readdirSync(base, { withFileTypes: true })) {
        if (!entry.isDirectory() || (!entry.name.startsWith(LIVE_EVICT_PREFIX) && !entry.name.startsWith('agy-live-evict-'))) {
          continue;
        }
        try {
          ofs.rmSync(path.join(base, entry.name), { recursive: true, force: true });
        } catch {}
      }
    } catch {}
  }
}

function tryLiveEvictDirectoryOnSameVolume(srcDir) {
  const srcRoot = path.parse(path.resolve(srcDir)).root.toLowerCase();
  const tempBase = path.join(LOCAL_APPDATA, 'Temp');
  const tempRoot = path.parse(path.resolve(tempBase)).root.toLowerCase();
  if (srcRoot !== tempRoot) {
    return { ok: false, reason: 'cross_volume_temp' };
  }

  const asarFile = path.join(srcDir, 'resources', 'app.asar');
  if (ofs.existsSync(asarFile)) {
    const probePath = path.join(srcDir, 'resources', `app.asar.evictprobe-${process.pid}`);
    try {
      ofs.renameSync(asarFile, probePath);
      ofs.renameSync(probePath, asarFile);
    } catch {
      return { ok: false, reason: 'app_asar_locked_by_running_electron' };
    }
  }

  const evictDir = path.join(tempBase, `${LIVE_EVICT_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  const movedPairs = [];

  function moveAllFiles(curSrc, curDst) {
    if (!ofs.existsSync(curDst)) ofs.mkdirSync(curDst, { recursive: true });
    for (const ent of ofs.readdirSync(curSrc, { withFileTypes: true })) {
      const sPath = path.join(curSrc, ent.name);
      const dPath = path.join(curDst, ent.name);
      if (ent.isDirectory() && !ent.isSymbolicLink()) {
        moveAllFiles(sPath, dPath);
      } else {
        ofs.renameSync(sPath, dPath);
        movedPairs.push({ from: sPath, to: dPath });
      }
    }
  }

  function removeEmptyTree(curDir) {
    for (const ent of ofs.readdirSync(curDir, { withFileTypes: true })) {
      const sub = path.join(curDir, ent.name);
      if (ent.isDirectory() && !ent.isSymbolicLink()) removeEmptyTree(sub);
    }
    ofs.rmdirSync(curDir);
  }

  try {
    moveAllFiles(srcDir, evictDir);
    removeEmptyTree(srcDir);
    return { ok: true, evictDir, movedCount: movedPairs.length };
  } catch (err) {
    for (let i = movedPairs.length - 1; i >= 0; i--) {
      const { from, to } = movedPairs[i];
      try {
        const parent = path.dirname(from);
        if (!ofs.existsSync(parent)) ofs.mkdirSync(parent, { recursive: true });
        if (ofs.existsSync(to) && !ofs.existsSync(from)) ofs.renameSync(to, from);
      } catch {}
    }
    try { ofs.rmSync(evictDir, { recursive: true, force: true }); } catch {}
    return { ok: false, reason: err.message };
  }
}

function syncDirectoryToJunctionTarget(antigravityDir, explicitTarget = null) {
  try {
    const target = detectAndSaveJunctionTarget(antigravityDir, explicitTarget);
    if (!target || isDirectoryJunction(antigravityDir) || !ofs.existsSync(antigravityDir)) {
      return false;
    }
    const srcExe = path.join(antigravityDir, 'Antigravity.exe');
    const srcAsar = path.join(antigravityDir, 'resources', 'app.asar');
    if (!ofs.existsSync(srcExe) || !ofs.existsSync(srcAsar)) {
      return false;
    }
    if (!ofs.existsSync(target)) {
      ofs.mkdirSync(target, { recursive: true });
    }
    spawnSync(
      'robocopy.exe',
      [
        antigravityDir,
        target,
        '/MIR',
        '/XF',
        'app.asar.backup',
        'app.asar.pre-*.backup',
        'app.asar.old',
        '*.testmove',
        '/R:2',
        '/W:1',
        '/MT:8',
        '/NFL',
        '/NDL',
        '/NJH',
        '/NJS',
      ],
      { stdio: 'ignore', windowsHide: true, timeout: 120000 }
    );
    for (const extraRel of ['resources\\app.asar.backup', 'resources\\ag-zh-i18n.js']) {
      const srcExtra = path.join(antigravityDir, extraRel);
      const dstExtra = path.join(target, extraRel);
      if (ofs.existsSync(srcExtra)) {
        try {
          if (!ofs.existsSync(path.dirname(dstExtra))) ofs.mkdirSync(path.dirname(dstExtra), { recursive: true });
          ofs.copyFileSync(srcExtra, dstExtra);
        } catch {}
      }
    }
    return true;
  } catch {
    return false;
  }
}

function ensureDirectoryJunction(antigravityDir, explicitTarget = null, options = {}) {
  const { allowLiveEvict = true, skipSyncIfAsarMatches = false } = options;
  cleanupStaleLiveEvictDirs();

  const target = detectAndSaveJunctionTarget(antigravityDir, explicitTarget);
  if (!target) {
    return { status: 'unconfigured', target: null };
  }

  if (isDirectoryJunction(antigravityDir)) {
    return { status: 'already_junction', target };
  }

  const uninstallExe = path.join(antigravityDir, 'Uninstall Antigravity.exe');
  if (isFileLocked(uninstallExe)) {
    return { status: 'deferred_to_daemon', target, reason: 'installer_busy' };
  }

  return withPatchTxnLock(() => {
    try {
      if (isDirectoryJunction(antigravityDir)) {
        return { status: 'already_junction', target };
      }

      if (!ofs.existsSync(target)) {
        ofs.mkdirSync(target, { recursive: true });
      }

      if (!ofs.existsSync(antigravityDir)) {
        spawnSync('cmd.exe', ['/d', '/c', `mklink /J "${antigravityDir}" "${target}"`], {
          stdio: 'ignore',
          windowsHide: true,
        });
        if (isDirectoryJunction(antigravityDir)) {
          appendLog(`已恢复缺失的目录软链接: ${antigravityDir} -> ${target}`);
          return { status: 'repaired', target, mode: 'missing' };
        }
        return { status: 'failed', target, error: '无法创建 mklink /J' };
      }

      const targetExe = path.join(target, 'Antigravity.exe');
      const targetAsar = path.join(target, 'resources', 'app.asar');
      const localExe = path.join(antigravityDir, 'Antigravity.exe');
      const localAsar = path.join(antigravityDir, 'resources', 'app.asar');

      if ((!ofs.existsSync(localExe) || !ofs.existsSync(localAsar)) && ofs.existsSync(targetExe) && ofs.existsSync(targetAsar)) {
        let localRunning = isAntigravityRunning(antigravityDir);
        if (localRunning) {
          cleanupOrphanedSidecarsIfMainExited(antigravityDir);
          localRunning = isAntigravityRunning(antigravityDir);
        }
        if (!localRunning) {
          spawnSync(
            'robocopy.exe',
            [
              antigravityDir,
              target,
              '/E',
              '/MOVE',
              '/XF',
              'app.asar.backup',
              'app.asar.pre-*.backup',
              'app.asar.old',
              '*.evictprobe*',
              '*.testmove',
              '/R:1',
              '/W:1',
              '/MT:4',
              '/NFL',
              '/NDL',
              '/NJH',
              '/NJS',
            ],
            { stdio: 'ignore', windowsHide: true, timeout: 30000 }
          );
          spawnSync('cmd.exe', ['/d', '/c', `rd /s /q "${antigravityDir}"`], { stdio: 'ignore', windowsHide: true });
          if (!ofs.existsSync(antigravityDir)) {
            spawnSync('cmd.exe', ['/d', '/c', `mklink /J "${antigravityDir}" "${target}"`], {
              stdio: 'ignore',
              windowsHide: true,
            });
          }
          if (isDirectoryJunction(antigravityDir)) {
            appendLog(`已清理残余空壳并恢复目录软链接: ${antigravityDir} -> ${target}`);
            return { status: 'repaired', target, mode: 'partial_cleanup' };
          }
        }
      }

      let needMirrorSync = true;
      if (skipSyncIfAsarMatches && ofs.existsSync(targetExe) && ofs.existsSync(targetAsar) && ofs.existsSync(localAsar)) {
        try {
          if (ofs.statSync(targetAsar).size === ofs.statSync(localAsar).size) {
            needMirrorSync = false;
          }
        } catch {}
      }

      if (needMirrorSync) {
        syncDirectoryToJunctionTarget(antigravityDir, target);
      }

      if (!ofs.existsSync(targetExe) || !ofs.existsSync(targetAsar)) {
        return { status: 'failed', target, error: '目标目录核心文件同步未完成' };
      }

      const execInAgDir = path
        .resolve(process.execPath)
        .toLowerCase()
        .startsWith(path.resolve(antigravityDir).toLowerCase());
      let appRunning = isAntigravityRunning(antigravityDir);
      if (appRunning && !skipSyncIfAsarMatches) {
        cleanupOrphanedSidecarsIfMainExited(antigravityDir);
        appRunning = isAntigravityRunning(antigravityDir);
      }

      if (!appRunning && !execInAgDir) {
        spawnSync('cmd.exe', ['/d', '/c', `rd /s /q "${antigravityDir}"`], { stdio: 'ignore', windowsHide: true });
        if (ofs.existsSync(antigravityDir) && !isDirectoryJunction(antigravityDir)) {
          const orphanShell = `${antigravityDir}.orphaned_${Date.now()}`;
          try {
            ofs.renameSync(antigravityDir, orphanShell);
            spawnSync('cmd.exe', ['/d', '/c', `rd /s /q "${orphanShell}"`], { stdio: 'ignore', windowsHide: true });
          } catch {}
        }
        if (!ofs.existsSync(antigravityDir)) {
          spawnSync('cmd.exe', ['/d', '/c', `mklink /J "${antigravityDir}" "${target}"`], {
            stdio: 'ignore',
            windowsHide: true,
          });
        }
        if (isDirectoryJunction(antigravityDir)) {
          appendLog(`已离线恢复目录软链接: ${antigravityDir} -> ${target}`);
          return { status: 'repaired', target, mode: 'offline' };
        }
      }

      if (allowLiveEvict) {
        const evictRes = tryLiveEvictDirectoryOnSameVolume(antigravityDir);
        if (evictRes.ok && !ofs.existsSync(antigravityDir)) {
          spawnSync('cmd.exe', ['/d', '/c', `mklink /J "${antigravityDir}" "${target}"`], {
            stdio: 'ignore',
            windowsHide: true,
          });
          if (isDirectoryJunction(antigravityDir)) {
            appendLog(`已在运行态恢复目录软链接: ${antigravityDir} -> ${target}`);
            return { status: 'repaired', target, mode: 'live' };
          }
        }
        return {
          status: 'deferred_to_daemon',
          target,
          reason: evictRes.reason || 'handle_busy',
        };
      }

      return { status: 'deferred_to_daemon', target };
    } catch (err) {
      return { status: 'failed', target, error: err.message };
    }
  });
}

module.exports = {
  isAntigravityRunning,
  inspectSidecarProcessState,
  cleanupOrphanedSidecarsIfMainExited,
  getDirectoryLinkInfo,
  isDirectoryJunction,
  detectAndSaveJunctionTarget,
  syncDirectoryToJunctionTarget,
  ensureDirectoryJunction,
};
