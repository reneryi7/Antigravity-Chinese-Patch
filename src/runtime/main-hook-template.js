/**
 * Antigravity 中文汉化补丁 v4.0 - Electron 主进程原生 API 动态汉化与全局视图守护钩子生成器
 */

'use strict';

function buildMainProcessHookCode({ mainDynamicExact, roleLabels }) {
  return `/* __AGY_ZH_MAIN_HOOK_START__ */
// === Antigravity 中文汉化补丁 v4.0 - 主进程原生 API 动态汉化与全局视图守护钩子 ===
(function() {
  try {
    const _electron = require('electron');
    if (!_electron || _electron.__agyMainHookInstalled) return;
    _electron.__agyMainHookInstalled = true;

    const MENU_EXACT = ${JSON.stringify(mainDynamicExact, null, 6)};

    const ROLE_LABELS = ${JSON.stringify(roleLabels, null, 6)};

    const MENU_REGEX = [
      [/^Open (.+)$/, '打开 $1'],
      [/^(\\d+)\\s+agents?\\s+running$/i, '$1 个智能体运行中'],
      [/^No\\s+agents?\\s+running$/i, '无智能体运行'],
      [/^The WSL distro "(.+)" is no longer installed\\.$/, 'WSL 发行版“$1”已不再安装。'],
      [/^Failed to install the server into WSL distro "(.+)":\\n([\\s\\S]+)$/, '无法将服务器安装到 WSL 发行版“$1”：\\n$2'],
      [/^This folder belongs to the WSL distro "(.+)", but this window is connected to "(.+)"\\.$/, '此文件夹属于 WSL 发行版“$1”，但当前窗口连接的是“$2”。'],
      [/^This location cannot be opened in WSL: (.+)$/, '无法在 WSL 中打开此位置: $1'],
      [/^Setting up WSL: (.+)$/, '正在配置 WSL: $1'],
      [/^Installing into (.+?)[…\\.]{1,3}$/, '正在安装到 $1…'],
      [/^Downloading the Antigravity binary[…\\.]{1,3}$/, '正在下载 Antigravity 二进制文件…'],
      [/^Sign in to (.+)$/, '登录到 $1'],
      [/^Account (\\d+)$/, '账户 $1'],
      [/^(.+) wants to connect to a (HID device|USB device|serial port|HID 设备|USB 设备|串口)$/, '$1 想要连接到$2'],
      [/^Unknown device \\((.+)\\)$/, '未知设备 ($1)'],
      [/^Error: (.+)$/, '错误：$1'],
      [/^Issued to: (.+)$/, '颁发给：$1'],
      [/^Issued by: (.+)$/, '颁发者：$1'],
      [/^Valid from: (.+)$/, '有效期自：$1'],
      [/^Valid until: (.+)$/, '有效期至：$1'],
      [/^Protocol: (.+)$/, '协议：$1'],
      [/^Stop the Antigravity server on (.+)\\?$/, '确认停止 $1 上的 Antigravity 服务器吗？'],
      [/^Not connected to (.+)$/, '尚未连接到 $1'],
      [/^Sign in to your organization for (.+)\\?$/, '要为 $1 登录您的组织账户吗？'],
      [/^Finish this sign-in on (.+)\\?$/, '确认在 $1 上完成此次登录吗？'],
      [/^Allow (.+) to use your microphone\\?$/, '允许 $1 使用您的麦克风吗？'],
      [/^(.+) is running server (.+); this app is (.+)\\. Restart the server now\\?$/, '$1 正在运行服务器版本 $2（当前客户端版本为 $3）。是否立即重启远程服务器？'],
      [/^Trust (.+)\\?$/, '信任主机 $1 吗？'],
      [/^Connect to (.+) anyway\\?$/, '仍然继续连接到 $1 吗？'],
      [/^Add (.+) to ssh-agent\\?$/, '将密钥 $1 添加到 ssh-agent 吗？'],
      [/^Question from (.+)$/, '来自 $1 的确认询问'],
      [/^Verification code for (.+)$/, '$1 的验证码'],
      [/^Password for (.+)$/, '$1 的密码'],
      [/^Current password for (.+)$/, '$1 的当前密码'],
      [/^New password for (.+)$/, '$1 的新密码'],
      [/^Confirm new password for (.+)$/, '确认 $1 的新密码'],
      [/^Passphrase for (.+)$/, '密钥 $1 的口令'],
      [/^PIN for (.+)$/, '$1 的 PIN 码'],
      [/^(.+) can't be the SSH config file$/, '$1 不能作为 SSH 配置文件'],
      [/^(.+) asks:$/, '$1 请求确认：'],
      [/^SSH:\\s*(.+)$/, 'SSH：$1']
    ];

    function translateMainString(str) {
      if (typeof str !== 'string' || !str) return str;
      const trimmed = str.trim();
      if (!trimmed) return str;
      if (Object.prototype.hasOwnProperty.call(MENU_EXACT, trimmed)) {
        return str.replace(trimmed, MENU_EXACT[trimmed]);
      }
      for (let i = 0; i < MENU_REGEX.length; i++) {
        const [re, rep] = MENU_REGEX[i];
        if (re.test(trimmed)) {
          return trimmed.replace(re, rep);
        }
      }
      return str;
    }

    function translateMenuTemplate(template) {
      if (!Array.isArray(template)) return template;
      return template.map((item) => {
        if (!item || typeof item !== 'object') return item;
        if (item.constructor && item.constructor.name === 'MenuItem') return item;
        const copy = { ...item };
        if (typeof copy.label === 'string' && copy.label) {
          copy.label = translateMainString(copy.label);
        } else if (typeof copy.role === 'string' && !copy.label) {
          const roleKey = copy.role.toLowerCase();
          if (ROLE_LABELS[roleKey]) {
            copy.label = ROLE_LABELS[roleKey];
          }
        }
        if (Array.isArray(copy.submenu)) {
          copy.submenu = translateMenuTemplate(copy.submenu);
        }
        return copy;
      });
    }

    if (_electron.Menu && typeof _electron.Menu.buildFromTemplate === 'function') {
      const _origBuild = _electron.Menu.buildFromTemplate.bind(_electron.Menu);
      _electron.Menu.buildFromTemplate = function(template) {
        try {
          return _origBuild(translateMenuTemplate(template));
        } catch {
          return _origBuild(template);
        }
      };
    }

    if (_electron.dialog) {
      if (typeof _electron.dialog.showMessageBox === 'function') {
        const _origMsgBox = _electron.dialog.showMessageBox.bind(_electron.dialog);
        _electron.dialog.showMessageBox = function(winOrOpts, maybeOpts) {
          try {
            const opts = maybeOpts || winOrOpts;
            if (opts && typeof opts === 'object') {
              if (typeof opts.title === 'string') opts.title = translateMainString(opts.title);
              if (typeof opts.message === 'string') opts.message = translateMainString(opts.message);
              if (typeof opts.detail === 'string') opts.detail = translateMainString(opts.detail);
              if (Array.isArray(opts.buttons)) {
                opts.buttons = opts.buttons.map((b) => translateMainString(b));
              }
            }
          } catch {}
          return maybeOpts ? _origMsgBox(winOrOpts, maybeOpts) : _origMsgBox(winOrOpts);
        };
      }
      if (typeof _electron.dialog.showErrorBox === 'function') {
        const _origErrBox = _electron.dialog.showErrorBox.bind(_electron.dialog);
        _electron.dialog.showErrorBox = function(title, content) {
          return _origErrBox(translateMainString(title), translateMainString(content));
        };
      }
      if (typeof _electron.dialog.showOpenDialog === 'function') {
        const _origOpenDlg = _electron.dialog.showOpenDialog.bind(_electron.dialog);
        _electron.dialog.showOpenDialog = function(winOrOpts, maybeOpts) {
          try {
            const opts = maybeOpts || winOrOpts;
            if (opts && typeof opts === 'object') {
              if (typeof opts.title === 'string') opts.title = translateMainString(opts.title);
              if (typeof opts.buttonLabel === 'string') opts.buttonLabel = translateMainString(opts.buttonLabel);
            }
          } catch {}
          return maybeOpts ? _origOpenDlg(winOrOpts, maybeOpts) : _origOpenDlg(winOrOpts);
        };
      }
    }

    // 全局 WebContents 兜底注入通道（兼容传统 BrowserWindow、2.29.1+ BaseWindow/WebContentsView、新建窗口及重载）
    const _fs = require('fs');
    const _path = require('path');
    const _cp = require('child_process');
    let _cachedZhScript = null;

    function _getZhInjectScript() {
      if (_cachedZhScript) return _cachedZhScript;
      try {
        const resScript = _path.join(process.resourcesPath || '', 'ag-zh-i18n.js');
        if (resScript && _fs.existsSync(resScript)) {
          _cachedZhScript = _fs.readFileSync(resScript, 'utf8');
          return _cachedZhScript;
        }
        const patchDir = _path.join(process.env.APPDATA || '', 'AntigravityChinesePatch');
        const backupScript = _path.join(patchDir, 'ag-zh-i18n.js');
        if (_fs.existsSync(backupScript)) {
          _cachedZhScript = _fs.readFileSync(backupScript, 'utf8');
          try {
            if (process.resourcesPath) _fs.writeFileSync(resScript, _cachedZhScript, 'utf8');
          } catch {}
          return _cachedZhScript;
        }
      } catch {}
      return '';
    }

    const _boundWcs = typeof WeakSet !== 'undefined' ? new WeakSet() : null;

    function _ensureWebContentsLocalized(wc) {
      try {
        if (!wc || wc.isDestroyed?.()) return;
        if (typeof wc.getType === 'function' && wc.getType() === 'webview') return;
        const url = wc.getURL?.() || '';
        if (!/^https?:\\/\\/(127\\.0\\.0\\.1|localhost)(?::\\d+)?(?:\\/|\\?|#|$)/i.test(url)) return;
        wc.executeJavaScript(
          'Boolean(document.documentElement && document.documentElement.dataset && document.documentElement.dataset.antigravityZhI18nInitialized === "true")'
        ).then((alreadyInit) => {
          if (wc.isDestroyed?.()) return;
          if (alreadyInit) {
            wc.executeJavaScript('if (typeof globalThis.__agyForceTranslatePage === "function") globalThis.__agyForceTranslatePage();').catch(() => {});
            return;
          }
          const code = _getZhInjectScript();
          if (code) {
            wc.executeJavaScript(code).catch(() => {});
          }
        }).catch(() => {});
      } catch {}
    }

    if (_electron.app && typeof _electron.app.on === 'function') {
      _electron.app.on('web-contents-created', (_event, contents) => {
        try {
          if (!contents || (_boundWcs && _boundWcs.has(contents)) || contents.__agyZhWcBound) return;
          if (_boundWcs) _boundWcs.add(contents);
          contents.__agyZhWcBound = true;
          if (typeof contents.getMaxListeners === 'function' && typeof contents.setMaxListeners === 'function') {
            if (contents.getMaxListeners() > 0 && contents.getMaxListeners() < 30) {
              contents.setMaxListeners(30);
            }
          }
          contents.on('dom-ready', () => _ensureWebContentsLocalized(contents));
          contents.on('did-finish-load', () => _ensureWebContentsLocalized(contents));
          contents.on('did-navigate', () => _ensureWebContentsLocalized(contents));
        } catch {}
      });
    }

    // 拦截软件内自动更新安装器启动 (--updated)，移交同步串行事务代理 update_runner.vbs
    if (process.platform === 'win32' && _cp && typeof _cp.spawn === 'function' && !_cp.__agySpawnHooked) {
      _cp.__agySpawnHooked = true;
      const _origSpawn = _cp.spawn;
      _cp.spawn = function(cmd, args, options) {
        try {
          if (Array.isArray(args) && args.includes('--updated') && !/wscript\\.exe$/i.test(String(cmd || ''))) {
            const patchDir = _path.join(process.env.APPDATA || '', 'AntigravityChinesePatch');
            const runnerPath = _path.join(patchDir, 'update_runner.vbs');
            const isElevate = typeof cmd === 'string' && /elevate\\.exe$/i.test(cmd);
            const installerExe = isElevate ? String(args[0] || '') : String(cmd || '');
            const rawArgs = isElevate ? args.slice(1) : args;

            if (installerExe && _fs.existsSync(runnerPath)) {
              const shouldRelaunch = rawArgs.includes('--force-run') || !rawArgs.includes('/S');
              const extraArgs = rawArgs
                .filter((a) => a !== '--updated' && a !== '--force-run' && a !== '/S' && !String(a).startsWith('/D='))
                .map((a) => (String(a).includes(' ') && !String(a).startsWith('"') ? '"' + String(a) + '"' : String(a)))
                .join(' ');

              const taskContent = [installerExe, shouldRelaunch ? '1' : '0', extraArgs, '0', '0'].join('\\r\\n');
              _fs.writeFileSync(_path.join(patchDir, 'update_task.txt'), taskContent, 'utf8');
              _fs.writeFileSync(_path.join(patchDir, 'active_installer.txt'), installerExe, 'utf8');
              if (shouldRelaunch) {
                _fs.writeFileSync(_path.join(patchDir, 'relaunch_requested.flag'), installerExe, 'utf8');
              }
              const sizeFile = _path.join(patchDir, 'patched_state.txt');
              if (_fs.existsSync(sizeFile)) {
                try { _fs.unlinkSync(sizeFile); } catch {}
              }

              const spawnOpts = Object.assign(
                {},
                options && typeof options === 'object' ? options : {},
                {
                  cwd: patchDir,
                  detached: true,
                  stdio: 'ignore',
                  windowsHide: true,
                }
              );
              return _origSpawn.call(this, 'wscript.exe', ['//B', runnerPath], spawnOpts);
            }
          }
        } catch (hookErr) {
          console.error('[Antigravity 汉化补丁] 更新器拦截异常，回退默认更新流程:', hookErr);
        }

        return _origSpawn.call(this, cmd, args, options);
      };
    }

    // 若用户启用了后台自愈守护服务，在应用启动时自检拉起 auto_heal.vbs
    if (process.platform === 'win32') {
      setTimeout(() => {
        try {
          const patchDir = _path.join(process.env.APPDATA || '', 'AntigravityChinesePatch');
          const vbsPath = _path.join(patchDir, 'auto_heal.vbs');
          const lockPath = _path.join(patchDir, 'daemon.lock');
          const runnerLock = _path.join(patchDir, 'runner.lock');
          if (!_fs.existsSync(vbsPath)) return;

          const checkLocked = (p) => {
            if (!_fs.existsSync(p)) return false;
            try {
              const fd = _fs.openSync(p, 'r+');
              _fs.closeSync(fd);
              return false;
            } catch (err) {
              return Boolean(err && (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES'));
            }
          };

          if (!checkLocked(runnerLock) && !checkLocked(lockPath) && _cp && typeof _cp.spawn === 'function') {
            const child = _cp.spawn('wscript.exe', ['//B', vbsPath], {
              cwd: patchDir,
              detached: true,
              stdio: 'ignore',
              windowsHide: true,
            });
            if (child && typeof child.unref === 'function') child.unref();
          }
        } catch {}
      }, 2000);
    }
  } catch (e) {
    console.error('[Antigravity 汉化补丁] 主进程钩子初始化异常:', e);
  }
})();
/* __AGY_ZH_MAIN_HOOK_END__ */`;
}

module.exports = { buildMainProcessHookCode };
