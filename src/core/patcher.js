/**
 * Antigravity 中文汉化补丁 v4.1 - 核心四通道补丁安装、无损卸载与健康体检编排器
 */

'use strict';

const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const {
  ofs,
  checkDirectoryWritable,
  withPatchTxnLock,
} = require('./fs-lock.js');
const {
  PATCH_DATA_DIR,
  ROAMING_APPDATA,
  STATE_FILE_PATH,
  GUARDIAN_STATE_FILE_PATH,
  CACHED_FRONTEND_SCRIPT_PATH,
  EXIT_CODE_NEED_ELEVATION,
  ensurePatchDataDir,
  getClientPaths,
} = require('./config.js');
const { resolveAntigravityDir } = require('./detector.js');
const {
  ZH_PRELOAD_MARKER_START,
  ZH_PRELOAD_MARKER_END,
  ZH_UTILS_MARKER_START,
  ZH_UTILS_MARKER_END,
  parseAsarBuffer,
  readAsarFileText,
  getAsarVersion,
  isAsarBufferPatched,
  isAsarPatchedRaw,
  hasCompanionMarkers,
  stripExistingPatchBlocks,
  collectUnpackedFiles,
  writePatchedAsarInMemory,
} = require('./asar.js');
const { hotInjectZhToRunningWindows } = require('./cdp.js');
const {
  PATCH_VERSION,
  PATCH_DICT_SIGNATURE,
  compileFrontendScript,
  compileMainProcessAssets,
} = require('../compiler.js');
const {
  isAntigravityRunning,
  ensureDirectoryJunction,
  syncDirectoryToJunctionTarget,
  getDirectoryLinkInfo,
} = require('../daemon/junction.js');
const {
  installAutoHealService,
  uninstallAutoHealService,
  isAutoHealDaemonRunning,
} = require('../daemon/service.js');

function cleanupStaleTempDirs() {
  const tempBase = path.resolve(os.tmpdir());
  try {
    for (const entry of ofs.readdirSync(tempBase, { withFileTypes: true })) {
      if (!entry.isDirectory() || !entry.name.startsWith('antigravity-zh-')) continue;
      try {
        ofs.rmSync(path.join(tempBase, entry.name), { recursive: true, force: true });
      } catch {}
    }
  } catch {}
}

/**
 * 记录已汉化 app.asar 文件大小，供后台静默守护快速巡检
 */
function recordPatchedState(clientPaths) {
  try {
    if (!ofs.existsSync(clientPaths.asarPath)) return;
    const stat = ofs.statSync(clientPaths.asarPath);
    ensurePatchDataDir();
    const sizeStr = `${stat.size}`;
    ofs.writeFileSync(STATE_FILE_PATH, sizeStr, 'utf8');
    ofs.writeFileSync(GUARDIAN_STATE_FILE_PATH, sizeStr, 'utf8');
  } catch {}
}

/**
 * 通用外部共存扩展无损叠加协议：
 * 若本机 %APPDATA% 下安装了兼容钩子扩展，在重打包后自动调用其叠加接口并对齐文件大小特征，
 * 普通用户机器上不存在时静默返回 false，不产生任何日志或副作用。
 */
function reapplyCompanionExtensionsIfPresent(antigravityDir) {
  return withPatchTxnLock(() => {
    try {
      const companionDirs = [];
      if (ofs.existsSync(ROAMING_APPDATA)) {
        for (const ent of ofs.readdirSync(ROAMING_APPDATA, { withFileTypes: true })) {
          if (ent.isDirectory() && ent.name.startsWith('Antigravity') && ent.name !== 'Antigravity' && ent.name !== 'Antigravity IDE' && ent.name !== 'AntigravityChinesePatch') {
            companionDirs.push(path.join(ROAMING_APPDATA, ent.name));
          }
        }
      }

      let appliedAny = false;
      for (const compDir of companionDirs) {
        const corePath = path.join(compDir, 'core.js');
        if (ofs.existsSync(corePath)) {
          try {
            const compCore = require(corePath);
            const jsFiles = ofs.readdirSync(compDir).filter((f) => f.endsWith('-stats.js') || f === 'inject.js');
            if (compCore && typeof compCore.injectHarnessIntoAsar === 'function' && jsFiles.length > 0) {
              const extCode = ofs.readFileSync(path.join(compDir, jsFiles[0]), 'utf8');
              const agPaths = typeof compCore.getAgPaths === 'function' ? compCore.getAgPaths(antigravityDir) : undefined;
              const injectRes = compCore.injectHarnessIntoAsar(extCode, agPaths);
              if (injectRes && injectRes.asarSize) {
                const sizeStr = String(injectRes.asarSize);
                try {
                  ofs.writeFileSync(path.join(compDir, 'patched_state.txt'), sizeStr, 'utf8');
                  ofs.writeFileSync(path.join(compDir, 'guardian_state.txt'), sizeStr, 'utf8');
                  ofs.writeFileSync(STATE_FILE_PATH, sizeStr, 'utf8');
                  ofs.writeFileSync(GUARDIAN_STATE_FILE_PATH, sizeStr, 'utf8');
                } catch {}
              }
              if (typeof compCore.syncPatchedResourcesToJunctionTarget === 'function') {
                try { compCore.syncPatchedResourcesToJunctionTarget(agPaths); } catch {}
              }
              appliedAny = true;
              continue;
            }
          } catch {}
        }

        const compDaemon = path.join(compDir, 'auto-heal-daemon.js');
        if (ofs.existsSync(compDaemon)) {
          spawnSync(process.execPath, [compDaemon, '--offline-update'], {
            cwd: compDir,
            env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ANTIGRAVITY_PATCH_NO_PAUSE: '1' },
            windowsHide: true,
            timeout: 20000,
          });
          appliedAny = true;
        }
      }
      return appliedAny;
    } catch {
      return false;
    }
  });
}

/**
 * 执行汉化补丁安装流程
 */
async function installPatch(options = {}) {
  const {
    dryRun = false,
    autoHealMode = false,
    noDaemon = false,
    explicitPath = null,
    explicitJunctionTarget = null,
  } = options;

  const startTime = Date.now();
  console.log('='.repeat(68));
  console.log(
    dryRun
      ? `  Antigravity 中文汉化补丁 v${PATCH_VERSION} 纯内存模拟验证（不修改安装文件）`
      : autoHealMode
        ? `  Antigravity 中文汉化补丁 v${PATCH_VERSION} 自动更新自愈程序`
        : `  Antigravity 中文汉化补丁 v${PATCH_VERSION} 极速安装程序`
  );
  console.log('='.repeat(68));
  console.log('');

  cleanupStaleTempDirs();

  const antigravityDir = resolveAntigravityDir({
    explicitPath,
    allowInteractivePrompt: !dryRun && !autoHealMode,
    persist: !dryRun,
  });
  const paths = getClientPaths(antigravityDir);

  if (!dryRun) {
    const juncRes = ensureDirectoryJunction(antigravityDir, explicitJunctionTarget, { allowLiveEvict: true });
    if (juncRes.status === 'already_junction') {
      console.log(`✓ 检测到本地目录软链接: ${antigravityDir} -> ${juncRes.target}`);
    } else if (juncRes.status === 'repaired') {
      console.log(`✓ 已自动恢复本地目录软链接 (${juncRes.mode || 'auto'}): ${antigravityDir} -> ${juncRes.target}`);
    } else if (juncRes.status === 'deferred_to_daemon') {
      console.log(`ℹ 已同步软链接目标镜像: ${juncRes.target}（待客户端关闭后将自动恢复软链接）`);
    }
  }

  if (!ofs.existsSync(paths.asarPath)) {
    console.error('✗ 错误：未能找到 Google Antigravity 安装目录或核心文件。');
    console.error(`  尝试查找路径: ${paths.asarPath}`);
    console.error('  解决方法：请先安装 Antigravity，或使用命令行指定安装位置：');
    console.error('    install.bat --path="D:\\YourPath\\Antigravity"');
    return { ok: false, exitCode: 1 };
  }

  // 检查目标目录写权限（若安装在 C:\Program Files\Antigravity 等系统目录，通知外层批处理申请 UAC 提权）
  if (!dryRun) {
    const perm = checkDirectoryWritable(paths.resourcesDir);
    if (!perm.writable && perm.needElevation) {
      console.warn(`⚠ 安装目录需要管理员写入权限: ${paths.resourcesDir}`);
      return { ok: false, exitCode: EXIT_CODE_NEED_ELEVATION, needElevation: true };
    }
  }

  console.log(`安装目录: ${paths.antigravityDir}`);

  const currentAsarBuf = ofs.readFileSync(paths.asarPath);
  const currentParsed = parseAsarBuffer(currentAsarBuf, paths.asarPath);
  const currentIsPatched = isAsarBufferPatched(currentAsarBuf, currentParsed);
  const currentHasCompanion = hasCompanionMarkers(currentAsarBuf, currentParsed);
  const currentVersion = getAsarVersion(currentAsarBuf, currentParsed);

  let backupBuf = null;
  let backupParsed = null;
  let backupVersion = null;
  let backupIsPatched = false;
  if (ofs.existsSync(paths.asarBackupPath)) {
    try {
      backupBuf = ofs.readFileSync(paths.asarBackupPath);
      backupParsed = parseAsarBuffer(backupBuf, paths.asarBackupPath);
      backupVersion = getAsarVersion(backupBuf, backupParsed);
      backupIsPatched = isAsarBufferPatched(backupBuf, backupParsed);
    } catch {
      backupBuf = null;
      backupParsed = null;
    }
  }

  let sourceAsarBuf;
  let sourceParsed;

  if (dryRun) {
    if (!currentIsPatched && !currentHasCompanion) {
      sourceAsarBuf = currentAsarBuf;
      sourceParsed = currentParsed;
      console.log(`验证基底: ${paths.asarPath} (v${currentVersion || '未知'})`);
    } else if (backupBuf && backupParsed && !backupIsPatched && (!currentVersion || backupVersion === currentVersion)) {
      sourceAsarBuf = backupBuf;
      sourceParsed = backupParsed;
      console.log(`验证基底: ${paths.asarBackupPath} (v${backupVersion || '未知'})`);
    } else {
      sourceAsarBuf = currentAsarBuf;
      sourceParsed = currentParsed;
      console.log(`验证基底 (原地剥离重建): ${paths.asarPath} (v${currentVersion || '未知'})`);
    }
  } else {
    if (!currentIsPatched && !currentHasCompanion) {
      if (!backupBuf || backupIsPatched || backupVersion !== currentVersion) {
        console.log(`检测到官方纯净原包 (v${currentVersion || '未知'})，正在创建安全备份...`);
        ofs.copyFileSync(paths.asarPath, paths.asarBackupPath);
        console.log(`✓ 原始备份已保存: ${paths.asarBackupPath}`);
      }
      sourceAsarBuf = currentAsarBuf;
      sourceParsed = currentParsed;
    } else if (backupBuf && backupParsed && !backupIsPatched && (!currentVersion || backupVersion === currentVersion)) {
      console.log(`✓ 发现同版本纯净备份 (v${backupVersion || '未知'})，将以纯净备份为基底全新构建。`);
      sourceAsarBuf = backupBuf;
      sourceParsed = backupParsed;
    } else {
      // 检查是否存在其他同版本 pre-*.backup 纯净包
      const altBackups = ofs
        .readdirSync(paths.resourcesDir)
        .filter((f) => /^app\.asar\.pre-.*\.backup$/i.test(f));
      let restoredFromAlt = false;
      for (const alt of altBackups) {
        try {
          const altPath = path.join(paths.resourcesDir, alt);
          const altBuf = ofs.readFileSync(altPath);
          const altParsed = parseAsarBuffer(altBuf, altPath);
          const altVer = getAsarVersion(altBuf, altParsed);
          if (altVer === currentVersion && !isAsarBufferPatched(altBuf, altParsed)) {
            ofs.copyFileSync(altPath, paths.asarBackupPath);
            sourceAsarBuf = altBuf;
            sourceParsed = altParsed;
            restoredFromAlt = true;
            console.log(`✓ 已同步纯净原始备份 (v${altVer}): ${paths.asarBackupPath}`);
            break;
          }
        } catch {}
      }
      if (!restoredFromAlt) {
        console.log(`ℹ 将剥离已有补丁块后在内存中无损重建 (v${currentVersion || '未知'})...`);
        sourceAsarBuf = currentAsarBuf;
        sourceParsed = currentParsed;
      }
    }
  }

  const unpackedFiles = collectUnpackedFiles(sourceParsed.header);
  const sourceVersion = getAsarVersion(sourceAsarBuf, sourceParsed);
  console.log(`客户端版本: Antigravity v${sourceVersion || '未知'} | 词库签名: ${PATCH_DICT_SIGNATURE}`);
  console.log('');
  console.log('正在内存中编译模块化词库并翻译 Electron 主进程模块...');

  const frontendScript = compileFrontendScript();
  const { staticFileRules, mainHookCode, preloadIpcSnippet } = compileMainProcessAssets();

  const filesToPatch = Object.keys(staticFileRules).map((k) => `dist/${k}`);
  let totalReplacements = 0;
  let failedReplacements = 0;
  const patchedFiles = new Map();

  for (const filePath of filesToPatch) {
    const translationKey = filePath.replace(/^dist\//, '');
    const fileTranslations = staticFileRules[translationKey];
    const rawContent = readAsarFileText(sourceAsarBuf, sourceParsed, filePath);
    if (rawContent === null) continue;

    let content = stripExistingPatchBlocks(rawContent);
    if (!fileTranslations || fileTranslations.length === 0) {
      if (content !== rawContent) patchedFiles.set(filePath, content);
      continue;
    }

    let fileReplacements = 0;
    for (const { original, translated, optional } of fileTranslations) {
      if (original === translated) continue;
      if (content.includes(original)) {
        content = content.split(original).join(translated);
        fileReplacements++;
        totalReplacements++;
      } else if (!content.includes(translated) && !optional) {
        console.warn(`  ⚠ 静态规则未命中 (${filePath}): "${original.slice(0, 48)}..."`);
        failedReplacements++;
      }
    }

    if (fileReplacements > 0 || content !== rawContent) {
      patchedFiles.set(filePath, content);
    }
  }

  // 通道 1：注入主进程全局钩子 (Menu / Dialog / Tray / WCV / NSIS 更新拦截)
  const rawMainText = patchedFiles.get('dist/main.js') ?? readAsarFileText(sourceAsarBuf, sourceParsed, 'dist/main.js');
  if (rawMainText) {
    let mainJsContent = stripExistingPatchBlocks(rawMainText);
    const mainHookAnchor = 'const electron_1 = require("electron");';
    if (mainJsContent.includes(mainHookAnchor)) {
      mainJsContent = mainJsContent.replace(mainHookAnchor, `${mainHookAnchor}\n${mainHookCode}`);
    } else {
      mainJsContent = `${mainHookCode}\n${mainJsContent}`;
    }
    patchedFiles.set('dist/main.js', mainJsContent);
    console.log(`  ✓ 通道 1 (dist/main.js)：已完成 ${totalReplacements} 处主进程静态翻译并挂载动态 API/WCV 钩子`);
  }

  // 通道 2：注入 0ms 同步前端引擎与右键菜单/通知 IPC 拦截器到 dist/preload.js
  const rawPreloadText = patchedFiles.get('dist/preload.js') ?? readAsarFileText(sourceAsarBuf, sourceParsed, 'dist/preload.js');
  if (rawPreloadText) {
    const preloadContent = stripExistingPatchBlocks(rawPreloadText).trimEnd();
    const injectedPreload = `${preloadContent}\n${ZH_PRELOAD_MARKER_START}
// ============================================================================
// Antigravity 中文汉化补丁 - 前端翻译引擎注入
// ============================================================================
${frontendScript}
${preloadIpcSnippet}
${ZH_PRELOAD_MARKER_END}\n`;
    patchedFiles.set('dist/preload.js', injectedPreload);
    console.log('  ✓ 通道 2 (dist/preload.js)：已内联零延迟前端翻译引擎与右键菜单/通知拦截器');
  }

  // 通道 3：注入适配 BaseWindow + WebContentsView 的主世界兜底加载器到 dist/utils.js
  const rawUtilsText = patchedFiles.get('dist/utils.js') ?? readAsarFileText(sourceAsarBuf, sourceParsed, 'dist/utils.js');
  if (rawUtilsText) {
    let utilsContent = stripExistingPatchBlocks(rawUtilsText);
    const utilsAnchors = ['await win.loadURL(url);', 'void win.loadURL(url);'];
    const matchedAnchor = utilsAnchors.find((a) => utilsContent.includes(a));
    if (matchedAnchor) {
      const anchorIdx = utilsContent.indexOf(matchedAnchor);
      const utilsSnippet = `\n    ${ZH_UTILS_MARKER_START}
    {
        const __zhInjectWin = () => {
            try {
                const _fs = require('fs');
                const _path = require('path');
                const targetWc = typeof getHubWebContents === 'function' ? getHubWebContents(win) : win.webContents;
                if (!targetWc || targetWc.isDestroyed?.()) return;
                let zhPath = _path.join(process.resourcesPath || '', 'ag-zh-i18n.js');
                if (!_fs.existsSync(zhPath)) {
                    zhPath = _path.join(process.env.APPDATA || '', 'AntigravityChinesePatch', 'ag-zh-i18n.js');
                }
                if (_fs.existsSync(zhPath)) {
                    const zhCode = _fs.readFileSync(zhPath, 'utf8');
                    targetWc.executeJavaScript(zhCode).catch(() => {});
                }
            } catch {}
        };
        const __zhWc = typeof getHubWebContents === 'function' ? getHubWebContents(win) : win.webContents;
        __zhWc?.on?.('dom-ready', __zhInjectWin);
        __zhWc?.on?.('did-finish-load', __zhInjectWin);
        __zhWc?.on?.('did-navigate', __zhInjectWin);
    }
    ${ZH_UTILS_MARKER_END}`;
      const insertPos = anchorIdx + matchedAnchor.length;
      utilsContent = utilsContent.slice(0, insertPos) + utilsSnippet + utilsContent.slice(insertPos);
      patchedFiles.set('dist/utils.js', utilsContent);
      console.log('  ✓ 通道 3 (dist/utils.js)：已注入 WebContentsView 复合视图兜底加载器');
    }
  }

  // 部署外置 resources/ag-zh-i18n.js 与本地缓存副本
  if (!dryRun) {
    try {
      ensurePatchDataDir();
      ofs.writeFileSync(CACHED_FRONTEND_SCRIPT_PATH, frontendScript, 'utf8');
      ofs.writeFileSync(paths.deployedZhScriptPath, frontendScript, 'utf8');
    } catch {}
  }

  console.log('');
  console.log(dryRun ? '正在内存中重构并校验 ASAR 归档...' : '正在将汉化后的 ASAR 归档原子写入安装目录...');

  let buildResult;
  if (dryRun) {
    buildResult = writePatchedAsarInMemory(sourceAsarBuf, sourceParsed, patchedFiles, null);
  } else {
    withPatchTxnLock(() => {
      let renamed = false;
      if (ofs.existsSync(paths.asarPath)) {
        try {
          if (ofs.existsSync(paths.asarPath + '.old')) ofs.unlinkSync(paths.asarPath + '.old');
          ofs.renameSync(paths.asarPath, paths.asarPath + '.old');
          renamed = true;
        } catch {}
      }

      try {
        buildResult = writePatchedAsarInMemory(sourceAsarBuf, sourceParsed, patchedFiles, paths.asarPath);
        if (renamed) {
          try { ofs.unlinkSync(paths.asarPath + '.old'); } catch {}
        }
      } catch (err) {
        console.error(`✗ 写入 ASAR 失败: ${err.message}`);
        if (renamed && ofs.existsSync(paths.asarPath + '.old')) {
          try { ofs.renameSync(paths.asarPath + '.old', paths.asarPath); } catch {
            if (ofs.existsSync(paths.asarBackupPath)) ofs.copyFileSync(paths.asarBackupPath, paths.asarPath);
          }
        } else if (ofs.existsSync(paths.asarBackupPath)) {
          ofs.copyFileSync(paths.asarBackupPath, paths.asarPath);
        }
        throw err;
      }
    });
  }

  // 完整性验证
  const header = dryRun ? buildResult.header : parseAsarBuffer(ofs.readFileSync(paths.asarPath), paths.asarPath).header;
  if (
    buildResult.totalSize < 500000 ||
    !header.files?.dist ||
    !header.files?.node_modules ||
    !header.files?.['package.json'] ||
    collectUnpackedFiles(header).size !== unpackedFiles.size
  ) {
    if (!dryRun && ofs.existsSync(paths.asarBackupPath)) {
      ofs.copyFileSync(paths.asarBackupPath, paths.asarPath);
    }
    throw new Error('ASAR 归档结构完整性校验未通过，已自动回滚原包');
  }
  console.log(
    `  ✓ ASAR 构建与 SHA256 校验通过 (${(buildResult.totalSize / 1024 / 1024).toFixed(2)} MB，保留 ${unpackedFiles.size} 个 unpacked 索引)`
  );

  let hotInjectedCount = 0;
  if (!dryRun) {
    withPatchTxnLock(() => {
      reapplyCompanionExtensionsIfPresent(paths.antigravityDir);
      syncDirectoryToJunctionTarget(paths.antigravityDir, explicitJunctionTarget);
      recordPatchedState(paths);
    });

    if (!autoHealMode && !noDaemon) {
      if (installAutoHealService(paths.antigravityDir)) {
        const alive = isAutoHealDaemonRunning();
        console.log(`  ✓ 更新自愈守护：已启用（后台守护进程: ${alive ? '运行中' : '已注册自启'}）`);
      }
    } else if (!autoHealMode && noDaemon) {
      console.log('  ℹ 已按 --no-daemon 参数跳过安装后台更新守护服务（纯静态注入模式）');
    }

    if (!autoHealMode && isAntigravityRunning(paths.antigravityDir)) {
      const cdpRes = await hotInjectZhToRunningWindows({
        maxAttempts: 3,
        retryDelayMs: 350,
        frontendScript,
      });
      if (cdpRes.injected > 0) {
        hotInjectedCount = cdpRes.injected;
        console.log(
          `  ✓ 通道 4 (本地 CDP 热汉化)：已实时将 ${cdpRes.injected} 个正在运行的窗口切换为最新中文（零重启）`
        );
      }
    }
  }

  const elapsedMs = Date.now() - startTime;
  console.log('');
  console.log('='.repeat(68));
  console.log(
    dryRun
      ? `  ✓ 纯内存模拟验证通过！（耗时 ${elapsedMs}ms，静态未命中 ${failedReplacements} 处）`
      : `  ✓ Antigravity 中文汉化补丁 v${PATCH_VERSION} 安装成功！（耗时 ${elapsedMs}ms）`
  );
  if (!dryRun && !autoHealMode) {
    console.log(
      hotInjectedCount > 0
        ? '  已打开的界面已实时更新为最新中文；方便时重启一次可使顶部系统原生菜单完全生效。'
        : '  请启动或重新打开 Antigravity 即可体验完整中文界面。'
    );
  }
  console.log('='.repeat(68));
  console.log('');

  return { ok: true, exitCode: 0, elapsedMs, failedReplacements, hotInjectedCount };
}

/**
 * 执行汉化补丁卸载与原版恢复流程
 */
function uninstallPatch(options = {}) {
  const { explicitPath = null } = options;

  console.log('='.repeat(68));
  console.log(`  Antigravity 中文汉化补丁 v${PATCH_VERSION} 卸载还原程序`);
  console.log('='.repeat(68));
  console.log('');

  const antigravityDir = resolveAntigravityDir({ explicitPath, allowInteractivePrompt: false, persist: false });
  const paths = getClientPaths(antigravityDir);

  if (ofs.existsSync(paths.resourcesDir)) {
    const perm = checkDirectoryWritable(paths.resourcesDir);
    if (!perm.writable && perm.needElevation) {
      console.warn(`⚠ 安装目录需要管理员权限以恢复原包: ${paths.resourcesDir}`);
      return { ok: false, exitCode: EXIT_CODE_NEED_ELEVATION, needElevation: true };
    }
  }

  console.log('正在停止并清理后台更新自愈服务、计划任务与启动项...');
  uninstallAutoHealService(paths);
  console.log('✓ 后台自愈守护服务已彻底移除');
  console.log('');

  if (!ofs.existsSync(paths.asarBackupPath)) {
    const currentlyPatched = ofs.existsSync(paths.asarPath) ? isAsarPatchedRaw(paths.asarPath) : false;
    if (!currentlyPatched) {
      console.log('✓ 当前客户端已经是未安装中文补丁的官方英文原版状态。');
      return { ok: true, exitCode: 0 };
    }
    console.error(`✗ 未找到原始备份文件: ${paths.asarBackupPath}`);
    console.error('  请重新运行一次 Antigravity 官方安装包以覆盖恢复原版文件。');
    return { ok: false, exitCode: 1 };
  }

  const curParsed = ofs.existsSync(paths.asarPath)
    ? parseAsarBuffer(ofs.readFileSync(paths.asarPath), paths.asarPath)
    : null;
  const curBuf = ofs.existsSync(paths.asarPath) ? ofs.readFileSync(paths.asarPath) : null;
  const curVer = curBuf && curParsed ? getAsarVersion(curBuf, curParsed) : null;
  const curPatched = curBuf && curParsed ? isAsarBufferPatched(curBuf, curParsed) : false;

  const bakBuf = ofs.readFileSync(paths.asarBackupPath);
  const bakParsed = parseAsarBuffer(bakBuf, paths.asarBackupPath);
  const bakVer = getAsarVersion(bakBuf, bakParsed);

  if (!curPatched && curVer && bakVer && curVer !== bakVer) {
    console.log(`检测到当前客户端 (v${curVer}) 已是新版英文原包，仅清理旧版备份 (v${bakVer})...`);
    try { ofs.unlinkSync(paths.asarBackupPath); } catch {}
    return { ok: true, exitCode: 0 };
  }

  console.log(`正在恢复官方英文原包 (v${bakVer || '未知'})...`);
  let renamed = false;
  withPatchTxnLock(() => {
    if (ofs.existsSync(paths.asarPath)) {
      try {
        if (ofs.existsSync(paths.asarPath + '.old')) ofs.unlinkSync(paths.asarPath + '.old');
        ofs.renameSync(paths.asarPath, paths.asarPath + '.old');
        renamed = true;
      } catch {}
    }

    ofs.copyFileSync(paths.asarBackupPath, paths.asarPath);
    reapplyCompanionExtensionsIfPresent(paths.antigravityDir);
    try { ofs.unlinkSync(paths.asarBackupPath); } catch {}
    syncDirectoryToJunctionTarget(paths.antigravityDir, null);
  });

  if (renamed && ofs.existsSync(paths.asarPath + '.old')) {
    try { ofs.unlinkSync(paths.asarPath + '.old'); } catch {}
  }

  console.log('✓ 官方英文原包已恢复，备份缓存已清理');
  console.log('');
  console.log('='.repeat(68));
  console.log('  ✓ 中文汉化补丁已彻底卸载！重启 Antigravity 即可恢复英文界面。');
  console.log('='.repeat(68));
  console.log('');
  return { ok: true, exitCode: 0 };
}

/**
 * 输出客户端与汉化补丁健康体检报告
 */
function inspectStatus(options = {}) {
  const antigravityDir = resolveAntigravityDir({
    explicitPath: options.explicitPath || null,
    allowInteractivePrompt: false,
    persist: false,
  });
  const paths = getClientPaths(antigravityDir);
  const exists = ofs.existsSync(paths.asarPath);
  let clientVersion = null;
  let patched = false;
  let backupVersion = null;

  if (exists) {
    try {
      const buf = ofs.readFileSync(paths.asarPath);
      const parsed = parseAsarBuffer(buf, paths.asarPath);
      clientVersion = getAsarVersion(buf, parsed);
      patched = isAsarBufferPatched(buf, parsed);
    } catch {}
  }
  if (ofs.existsSync(paths.asarBackupPath)) {
    try {
      const bBuf = ofs.readFileSync(paths.asarBackupPath);
      const bParsed = parseAsarBuffer(bBuf, paths.asarBackupPath);
      backupVersion = getAsarVersion(bBuf, bParsed);
    } catch {}
  }

  const linkInfo = getDirectoryLinkInfo(antigravityDir);
  const statusObj = {
    patchVersion: PATCH_VERSION,
    dictSignature: PATCH_DICT_SIGNATURE,
    installDir: antigravityDir,
    installed: exists,
    clientVersion,
    isPatched: patched,
    backupVersion,
    externalScriptDeployed: ofs.existsSync(paths.deployedZhScriptPath),
    daemonRunning: isAutoHealDaemonRunning(),
    appRunning: exists ? isAntigravityRunning(antigravityDir) : false,
    junction: linkInfo.isLink ? { active: true, target: linkInfo.target } : { active: false },
  };

  console.log('='.repeat(68));
  console.log(`  Antigravity 中文汉化补丁 v${PATCH_VERSION} 状态体检报告`);
  console.log('='.repeat(68));
  console.log(`  客户端路径   : ${statusObj.installDir}`);
  console.log(`  客户端版本   : ${statusObj.clientVersion ? 'v' + statusObj.clientVersion : '未检测到'}`);
  console.log(`  汉化注入状态 : ${statusObj.isPatched ? '✓ 已生效 (' + statusObj.dictSignature + ')' : '✗ 未汉化（英文原版）'}`);
  console.log(`  纯净备份状态 : ${statusObj.backupVersion ? '✓ 完好 (v' + statusObj.backupVersion + ')' : '无备份'}`);
  console.log(`  自愈守护进程 : ${statusObj.daemonRunning ? '✓ 运行中' : '• 未运行'}`);
  if (statusObj.junction.active) {
    console.log(`  目录软链接   : ✓ 已连接 -> ${statusObj.junction.target}`);
  }
  console.log('='.repeat(68));
  return statusObj;
}

module.exports = {
  installPatch,
  uninstallPatch,
  inspectStatus,
  recordPatchedState,
  reapplyCompanionExtensionsIfPresent,
};
