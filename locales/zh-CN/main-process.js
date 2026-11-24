/**
 * Antigravity 中文汉化补丁 v4.0 - Electron 主进程静态与动态翻译词表
 * 全面适配 Antigravity 2.12.x ~ 2.35.0+
 */

'use strict';

const STATIC_FILE_RULES = {
  "main.js": [
    {
      "original": "const msg = `language_server binary not found at:\\n${languageServer_1.LS_BINARY}\\n\\nPlease build set a valid location.`",
      "translated": "const msg = `语言服务器二进制文件未找到：\\n${languageServer_1.LS_BINARY}\\n\\n请设置正确的文件路径。`"
    },
    {
      "original": "await electron_1.dialog.showErrorBox('Binary not found', msg)",
      "translated": "await electron_1.dialog.showErrorBox('文件未找到', msg)"
    },
    {
      "original": "title: 'WSL distro not found'",
      "translated": "title: '未找到 WSL 发行版'",
      "optional": true
    },
    {
      "original": "message: `The WSL distro \"${WSL_DISTRO}\" is no longer installed.`",
      "translated": "message: `WSL 发行版“${WSL_DISTRO}”已不再安装。`",
      "optional": true
    },
    {
      "original": "detail: 'Antigravity opened on Windows instead.'",
      "translated": "detail: 'Antigravity 已改为在 Windows 本地打开。'",
      "optional": true
    },
    {
      "original": "const msg = `Failed to install the server into WSL distro \"${WSL_DISTRO}\":\\n${err.message}`",
      "translated": "const msg = `无法将服务器安装到 WSL 发行版“${WSL_DISTRO}”：\\n${err.message}`",
      "optional": true
    },
    {
      "original": "await electron_1.dialog.showErrorBox('WSL setup failed', msg)",
      "translated": "await electron_1.dialog.showErrorBox('WSL 配置失败', msg)",
      "optional": true
    },
    {
      "original": "await electron_1.dialog.showErrorBox('Startup failed', msg)",
      "translated": "await electron_1.dialog.showErrorBox('启动失败', msg)"
    },
    {
      "original": "label: 'New Window',\n                    click: () => (0, utils_1.createWindow)(url, storageManager, { cascade: true })",
      "translated": "label: '新建窗口',\n                    click: () => (0, utils_1.createWindow)(url, storageManager, { cascade: true })",
      "optional": true
    },
    {
      "original": "label: 'New Window',\n                    click: () => (0, utils_1.createWindow)(url, storageManager)",
      "translated": "label: '新建窗口',\n                    click: () => (0, utils_1.createWindow)(url, storageManager)",
      "optional": true
    },
    {
      "original": "label: 'No agents running'",
      "translated": "label: '无智能体运行'"
    },
    {
      "original": "label: `Open ${electron_1.app.getName()}`",
      "translated": "label: `打开 ${electron_1.app.getName()}`"
    },
    {
      "original": "label: 'Quit',\n                click: () => {",
      "translated": "label: '退出',\n                click: () => {"
    },
    {
      "original": "buttons: ['Cancel', 'Quit']",
      "translated": "buttons: ['取消', '退出']"
    },
    {
      "original": "title: 'Confirm Quit'",
      "translated": "title: '确认退出'"
    },
    {
      "original": "message: 'Are you sure you want to quit?'",
      "translated": "message: '确定要退出吗？'"
    },
    {
      "original": "detail: 'There may be agents or background tasks running.'",
      "translated": "detail: '可能有智能体或后台任务正在运行。'"
    },
    {
      "original": "console.log('Language Server process is not running.')",
      "translated": "console.log('语言服务器进程未运行。')"
    },
    {
      "original": "console.log('-> Forwarded input to Language Server.')",
      "translated": "console.log('-> 已将输入转发至语言服务器。')"
    }
  ],
  "menu.js": [
    {
      "original": "label: 'New Window'",
      "translated": "label: '新建窗口'"
    },
    {
      "original": "label: 'Docs'",
      "translated": "label: '文档'"
    },
    {
      "original": "return { label: 'Connect to WSL', submenu };",
      "translated": "return { label: '连接到 WSL', submenu };",
      "optional": true
    },
    {
      "original": "return { label: 'Reopen Locally', click: () => relaunchWithWslDistro('') };",
      "translated": "return { label: '在本地重新打开', click: () => relaunchWithWslDistro('') };",
      "optional": true
    },
    {
      "original": "const submenuItem = appMenu.items.find((item) => item.label === submenuLabel);",
      "translated": "const submenuItem = appMenu.items.find((item) => item.label === submenuLabel || (submenuLabel === 'File' && item.label === '文件') || (submenuLabel === 'Help' && item.label === '帮助'));",
      "optional": true
    },
    {
      "original": "const viewMenuItem = appMenu.items?.find((item) => item.label === 'View');",
      "translated": "const viewMenuItem = appMenu.items?.find((item) => item.label === 'View' || item.label === '视图');",
      "optional": true
    },
    {
      "original": "label: item.label || 'Actual Size',",
      "translated": "label: item.label || '实际大小',",
      "optional": true
    },
    {
      "original": "label: item.label || 'Zoom In',",
      "translated": "label: item.label || '放大',",
      "optional": true
    },
    {
      "original": "label: 'Zoom In',",
      "translated": "label: '放大',",
      "optional": true
    },
    {
      "original": "label: item.label || 'Zoom Out',",
      "translated": "label: item.label || '缩小',",
      "optional": true
    }
  ],
  "tray.js": [
    {
      "original": "(count > 0 ? `${count}` : 'No') +\n                    ' agent' +\n                    (count === 1 ? '' : 's') +\n                    ' running'",
      "translated": "(count > 0 ? `${count} 个` : '无') +\n                    '智能体' +\n                    '' +\n                    '运行中'"
    }
  ],
  "updater.js": [
    {
      "original": "MenuUpdateStep[\"CheckForUpdates\"] = \"Check for Updates\"",
      "translated": "MenuUpdateStep[\"CheckForUpdates\"] = \"检查更新\""
    },
    {
      "original": "MenuUpdateStep[\"CheckingForUpdates\"] = \"Checking for Updates...\"",
      "translated": "MenuUpdateStep[\"CheckingForUpdates\"] = \"正在检查更新...\""
    },
    {
      "original": "MenuUpdateStep[\"DownloadingUpdate\"] = \"Downloading Update...\"",
      "translated": "MenuUpdateStep[\"DownloadingUpdate\"] = \"正在下载更新...\""
    },
    {
      "original": "MenuUpdateStep[\"RestartToUpdate\"] = \"Restart to Update\"",
      "translated": "MenuUpdateStep[\"RestartToUpdate\"] = \"重启以更新\""
    },
    {
      "original": "[MenuUpdateStep.RestartToUpdate]: () => quitAndInstall(),",
      "translated": "[MenuUpdateStep.RestartToUpdate]: () => quitAndInstall(), 'Check for Updates': () => checkForUpdates(true), 'Restart to Update': () => quitAndInstall(),",
      "optional": true
    },
    {
      "original": "title: 'Check for Updates'",
      "translated": "title: '检查更新'"
    },
    {
      "original": "message: 'No updates available'",
      "translated": "message: '当前已是最新版本'"
    },
    {
      "original": "buttons: ['OK']",
      "translated": "buttons: ['确定']"
    }
  ],
  "loadingOverlay.js": [
    {
      "original": "Loading Antigravity",
      "translated": "正在加载 Antigravity",
      "optional": true
    }
  ],
  "ipcHandlers.js": [
    {
      "original": "electron_1.dialog.showErrorBox('Cannot open folder', t.error)",
      "translated": "electron_1.dialog.showErrorBox('无法打开文件夹', t.error)",
      "optional": true
    },
    {
      "original": "message: 'Folder is on the Windows filesystem'",
      "translated": "message: '文件夹位于 Windows 文件系统中'",
      "optional": true
    },
    {
      "original": "title: 'Open workspace'",
      "translated": "title: '打开工作区'"
    },
    {
      "original": "title: 'Open workspaces'",
      "translated": "title: '打开多个工作区'",
      "optional": true
    },
    {
      "original": "title: 'Select Download Folder'",
      "translated": "title: '选择下载文件夹'",
      "optional": true
    },
    {
      "original": "return `Failed to read logs: ${String(err)}`",
      "translated": "return `读取日志失败: ${String(err)}`"
    }
  ],
  "wsl.js": [
    {
      "original": "error: `This folder belongs to the WSL distro \"${unc[1]}\", but this window is connected to \"${distro}\".`",
      "translated": "error: `此文件夹属于 WSL 发行版“${unc[1]}”，但当前窗口连接的是“${distro}”。`",
      "optional": true
    },
    {
      "original": "warning: 'This folder is on the Windows filesystem. Accessing it from WSL (via /mnt) can be slow — for best performance keep projects inside the WSL filesystem.'",
      "translated": "warning: '此文件夹位于 Windows 文件系统中。从 WSL（通过 /mnt）访问可能会较慢——为获得最佳性能，建议将项目保存在 WSL 文件系统内。'",
      "optional": true
    },
    {
      "original": "return { error: `This location cannot be opened in WSL: ${winPath}` };",
      "translated": "return { error: `无法在 WSL 中打开此位置: ${winPath}` };",
      "optional": true
    },
    {
      "original": "onStatus?.('Downloading the Antigravity binary…');",
      "translated": "onStatus?.('正在下载 Antigravity 二进制文件…');",
      "optional": true
    },
    {
      "original": "onStatus?.('Downloading the Antigravity binary\\u2026');",
      "translated": "onStatus?.('正在下载 Antigravity 二进制文件…');",
      "optional": true
    },
    {
      "original": "onStatus?.(`Installing into ${distro}…`);",
      "translated": "onStatus?.(`正在安装到 ${distro}…`);",
      "optional": true
    },
    {
      "original": "onStatus?.(`Installing into ${distro}\\u2026`);",
      "translated": "onStatus?.(`正在安装到 ${distro}…`);",
      "optional": true
    }
  ],
  "provisionSplash.js": [
    {
      "original": "<div>Setting up WSL: ${escapeHtml(distro)}</div>",
      "translated": "<div>正在配置 WSL: ${escapeHtml(distro)}</div>",
      "optional": true
    }
  ],
  "languageServer.js": [
    {
      "original": "reject(new Error(`Timeout: language server did not report its port within ${LS_STARTUP_TIMEOUT_MS / 1000}s`))",
      "translated": "reject(new Error(`超时：语言服务器未能在 ${LS_STARTUP_TIMEOUT_MS / 1000} 秒内报告端口`))"
    },
    {
      "original": "reject(new Error(`Language server exited unexpectedly (code=${code}, signal=${signal})`))",
      "translated": "reject(new Error(`语言服务器意外退出（退出码=${code}，信号=${signal}）`))"
    },
    {
      "original": "console.log('  Please visit the following URL to authorize.')",
      "translated": "console.log('  请访问以下网址进行授权。')"
    },
    {
      "original": "console.log('  After authorizing, paste the authorization code below.')",
      "translated": "console.log('  授权完成后，请在下方粘贴授权码。')"
    },
    {
      "original": "console.error(`\\nLanguage server crashed: ${summary}`)",
      "translated": "console.error(`\\n语言服务器崩溃: ${summary}`)"
    },
    {
      "original": "console.error('--- Crash Stack Trace ---')",
      "translated": "console.error('--- 崩溃堆栈跟踪 ---')"
    },
    {
      "original": "console.error('--- End Crash Stack trace ---')",
      "translated": "console.error('--- 崩溃堆栈跟踪结束 ---')"
    },
    {
      "original": "const msg = `Language server crashed ${MAX_RESTARTS} times in a row. Giving up.`",
      "translated": "const msg = `语言服务器已连续崩溃 ${MAX_RESTARTS} 次，已放弃重启。`"
    },
    {
      "original": "console.log(`Attempting restart ${_restartCount}/${MAX_RESTARTS} in ${RESTART_COOLDOWN_MS / 1000}s...`)",
      "translated": "console.log(`正在尝试重启 ${_restartCount}/${MAX_RESTARTS}，将在 ${RESTART_COOLDOWN_MS / 1000} 秒后执行...`)"
    },
    {
      "original": "console.error(`Failed to restart language server: ${err.message}`)",
      "translated": "console.error(`重启语言服务器失败: ${err.message}`)"
    },
    {
      "original": "console.log('Shutting down language server…')",
      "translated": "console.log('正在关闭语言服务器…')"
    },
    {
      "original": "console.warn(`Language server (PID ${pid}) did not exit gracefully within 5s. Sending SIGKILL.`)",
      "translated": "console.warn(`语言服务器（PID ${pid}）未能在5秒内正常退出，正在强制终止。`)"
    },
    {
      "original": "console.error('Failed to get LS stamp:', error)",
      "translated": "console.error('获取语言服务器版本标记失败:', error)"
    }
  ],
  "ideInstall/wizardHtml.js": [
    {
      "original": "<title>Welcome to Antigravity</title>",
      "translated": "<title>欢迎使用 Antigravity</title>"
    },
    {
      "original": ">Setting up…</div>",
      "translated": ">正在准备…</div>"
    },
    {
      "original": "alt=\"Antigravity Icon\"",
      "translated": "alt=\"Antigravity 图标\""
    },
    {
      "original": "<h1>Welcome to the new Antigravity!</h1>",
      "translated": "<h1>欢迎使用全新 Antigravity！</h1>"
    },
    {
      "original": "Antigravity has been redesigned to put agents first with new capabilities. If you'd still like a code editor, you can download it as a separate app named <b>Antigravity IDE</b>.",
      "translated": "Antigravity 已全新设计，以智能体为核心并带来全新功能。如果您仍需要代码编辑器，可以单独下载 <b>Antigravity IDE</b>。"
    },
    {
      "original": "<span>Download the Antigravity IDE</span>",
      "translated": "<span>下载 Antigravity IDE</span>"
    },
    {
      "original": ">Explore the new Antigravity</button>",
      "translated": ">开始探索全新 Antigravity</button>"
    }
  ],
  "ideInstall/constants.js": [
    {
      "original": "throw new Error(`Failed to fetch IDE download URL: ${response.status} ${response.statusText}`)",
      "translated": "throw new Error(`获取 IDE 下载地址失败: ${response.status} ${response.statusText}`)"
    },
    {
      "original": "throw new Error(`No download URL found in the auto-updater response for platform: ${platformKey}`)",
      "translated": "throw new Error(`在自动更新响应中未找到当前平台的下载地址: ${platformKey}`)"
    }
  ],
  "ideInstall/service.js": [
    {
      "original": "reject(new Error('Too many redirects'))",
      "translated": "reject(new Error('重定向次数过多'))"
    },
    {
      "original": "throw new Error('No .app bundle found in the downloaded archive')",
      "translated": "throw new Error('在下载的归档文件中未找到 .app 应用包')"
    },
    {
      "original": "throw new Error(`Unsupported platform: ${process.platform}`)",
      "translated": "throw new Error(`不支持的操作系统平台: ${process.platform}`)"
    }
  ],
  "storage.js": [
    {
      "original": "console.error('Error reading storage items:', e)",
      "translated": "console.error('读取存储数据出错:', e)"
    },
    {
      "original": "console.error('Error updating storage items:', e)",
      "translated": "console.error('更新存储数据出错:', e)"
    }
  ],
  "utils.js": [
    {
      "original": "console.error('Error reading theme mode:', e)",
      "translated": "console.error('读取主题模式出错:', e)"
    },
    {
      "original": "console.error(`Failed to create node wrapper: ${err}`)",
      "translated": "console.error(`创建 Node 包装器失败: ${err}`)"
    }
  ],
  "webauthn.js": [
    {
      "original": "title: 'Choose a Passkey'",
      "translated": "title: '选择通行密钥'",
      "optional": true
    },
    {
      "original": "message: `Sign in to ${rpLabel}`",
      "translated": "message: `登录到 ${rpLabel}`",
      "optional": true
    },
    {
      "original": "detail: 'Select a passkey account to continue:'",
      "translated": "detail: '选择要继续使用的通行密钥账户：'",
      "optional": true
    },
    {
      "original": "return `Account ${index + 1}`;",
      "translated": "return `账户 ${index + 1}`;",
      "optional": true
    }
  ],
  "deviceChooser.js": [
    {
      "original": "hid: 'HID device',\n    usb: 'USB device',\n    serial: 'serial port',",
      "translated": "hid: 'HID 设备',\n    usb: 'USB 设备',\n    serial: '串口',",
      "optional": true
    },
    {
      "original": "label: `${d.name?.trim() || 'Unknown device'} (${hex4(d.vendorId)}:${hex4(d.productId)})`",
      "translated": "label: `${d.name?.trim() || '未知设备'} (${hex4(d.vendorId)}:${hex4(d.productId)})`",
      "optional": true
    },
    {
      "original": "label: `${d.productName ?? 'Unknown device'} (${hex4(d.vendorId)}:${hex4(d.productId)})`",
      "translated": "label: `${d.productName ?? '未知设备'} (${hex4(d.vendorId)}:${hex4(d.productId)})`",
      "optional": true
    },
    {
      "original": "title: 'Connect a device'",
      "translated": "title: '连接设备'",
      "optional": true
    },
    {
      "original": "message: `${origin} wants to connect to a ${KIND_NOUNS[kind]}`",
      "translated": "message: `${origin} 想要连接到${KIND_NOUNS[kind]}`",
      "optional": true
    },
    {
      "original": "? 'Select a device:'\n                            : 'No compatible devices found.'",
      "translated": "? '选择设备：'\n                            : '未找到兼容的设备。'",
      "optional": true
    },
    {
      "original": "buttons: [...snapshot.map(({ label }) => label), 'Cancel']",
      "translated": "buttons: [...snapshot.map(({ label }) => label), '取消']",
      "optional": true
    }
  ],
  "webviewPopupSecurity.js": [
    {
      "original": "insecure: 'Not secure',\n    dangerous: '⚠ Not secure',",
      "translated": "insecure: '不安全',\n    dangerous: '⚠ 不安全',",
      "optional": true
    },
    {
      "original": "'Your connection to this site is not secure'",
      "translated": "'您与此网站的连接不安全'",
      "optional": true
    },
    {
      "original": "'You should not enter any sensitive information on this site (for ' +\n        'example, passwords or credit cards), because it could be stolen by ' +\n        'attackers.'",
      "translated": "'请勿在此网站上输入任何敏感信息（例如密码或信用卡信息），否则可能会被攻击者窃取。'",
      "optional": true
    },
    {
      "original": "'Connection is secure'",
      "translated": "'连接安全'",
      "optional": true
    },
    {
      "original": "'Your information (for example, passwords or credit card numbers) is ' +\n            'private when it is sent to this site.'",
      "translated": "'您的信息（例如密码或信用卡号）在发送到此网站时处于私密保护状态。'",
      "optional": true
    },
    {
      "original": "neutral: ['Connection security information is not available for this page']",
      "translated": "neutral: ['此页面的连接安全信息不可用']",
      "optional": true
    },
    {
      "original": "lines.push('', state.level === 'secure' ? 'Certificate is valid' : 'Certificate details');",
      "translated": "lines.push('', state.level === 'secure' ? '证书有效' : '证书详情');",
      "optional": true
    },
    {
      "original": "lines.push(`Error: ${state.certificateError}`);",
      "translated": "lines.push(`错误：${state.certificateError}`);",
      "optional": true
    },
    {
      "original": "lines.push(`Issued to: ${certificate.subjectName}`, `Issued by: ${certificate.issuer}`, `Valid from: ${formatDate(certificate.validFromMs)}`, `Valid until: ${formatDate(certificate.validToMs)}`);",
      "translated": "lines.push(`颁发给：${certificate.subjectName}`, `颁发者：${certificate.issuer}`, `有效期自：${formatDate(certificate.validFromMs)}`, `有效期至：${formatDate(certificate.validToMs)}`);",
      "optional": true
    },
    {
      "original": "lines.push(`Protocol: ${certificate.protocol}`);",
      "translated": "lines.push(`协议：${certificate.protocol}`);",
      "optional": true
    },
    {
      "original": "message: extractOrigin(state.url) ?? (state.url || 'This page')",
      "translated": "message: extractOrigin(state.url) ?? (state.url || '此页面')",
      "optional": true
    },
    {
      "original": "label: 'Connection info…'",
      "translated": "label: '连接信息…'",
      "optional": true
    },
    {
      "original": "title: 'Connection info'",
      "translated": "title: '连接信息'",
      "optional": true
    }
  ],
  "cablev2.js": [
    {
      "original": "<title>Passkeys</title>",
      "translated": "<title>通行密钥</title>",
      "optional": true
    },
    {
      "original": "<h1 class=\"sheet-title\">Passkeys</h1>",
      "translated": "<h1 class=\"sheet-title\">通行密钥</h1>",
      "optional": true
    },
    {
      "original": "<p class=\"mechanism-header\">Use your phone or tablet</p>",
      "translated": "<p class=\"mechanism-header\">使用您的手机或平板电脑</p>",
      "optional": true
    },
    {
      "original": "<p id=\"status\" class=\"mechanism-desc\">Scan this QR code with the camera on the device that has your passkey for ${safeRpId}</p>",
      "translated": "<p id=\"status\" class=\"mechanism-desc\">请使用存有 ${safeRpId} 通行密钥的设备相机扫描此二维码</p>",
      "optional": true
    },
    {
      "original": "<button type=\"button\" class=\"cancel-btn\" onclick=\"window.close()\">Cancel</button>",
      "translated": "<button type=\"button\" class=\"cancel-btn\" onclick=\"window.close()\">取消</button>",
      "optional": true
    },
    {
      "original": "title: 'Passkeys'",
      "translated": "title: '通行密钥'",
      "optional": true
    },
    {
      "original": "modal?.updateStatus('Connecting to your device…');",
      "translated": "modal?.updateStatus('正在连接到您的设备…');",
      "optional": true
    },
    {
      "original": "modal?.updateStatus('Verify on your device to continue…');",
      "translated": "modal?.updateStatus('请在您的设备上验证以继续…');",
      "optional": true
    }
  ],
  "preload.js": [
    {
      "original": "message: \"Couldn't connect to the SSH host. See the app log.\",",
      "translated": "message: \"无法连接到 SSH 主机，请查看应用日志。\",",
      "optional": true
    }
  ],
  "remote/disconnectedPage.js": [
    {
      "original": "const title = connecting ? 'Reconnecting…' : 'Disconnected';",
      "translated": "const title = connecting ? '正在重新连接…' : '已断开连接';",
      "optional": true
    },
    {
      "original": "? `Reconnecting to ${host}…`\n        : `Disconnected from ${host}`;",
      "translated": "? `正在重新连接到 ${host}…`\n        : `已与 ${host} 断开连接`;",
      "optional": true
    },
    {
      "original": "? `Agents keep running on ${host}.`\n        : `Agents keep running on ${host} unless its server stopped.`;",
      "translated": "? `智能体仍在 ${host} 上继续运行。`\n        : `除非远程服务器已停止，否则智能体仍在 ${host} 上继续运行。`;",
      "optional": true
    },
    {
      "original": "<a class=\"button primary\" href=\"${action('reconnect')}\">Reconnect</a>",
      "translated": "<a class=\"button primary\" href=\"${action('reconnect')}\">重新连接</a>",
      "optional": true
    },
    {
      "original": "<a class=\"button\" href=\"${action('close')}\">Close</a>",
      "translated": "<a class=\"button\" href=\"${action('close')}\">关闭</a>",
      "optional": true
    },
    {
      "original": "const BUTTON_LABELS = {\n    reconnect: 'Reconnect',\n    stop: 'Stop Server',\n    close: 'Close',\n};",
      "translated": "const BUTTON_LABELS = {\n    reconnect: '重新连接',\n    stop: '停止服务器',\n    close: '关闭',\n};",
      "optional": true
    },
    {
      "original": "const title = restarting\n        ? 'Restarting…'\n        : connecting\n            ? 'Reconnecting…'\n            : 'Disconnected';",
      "translated": "const title = restarting\n        ? '正在重启…'\n        : connecting\n            ? '正在重新连接…'\n            : '已断开连接';",
      "optional": true
    },
    {
      "original": "const heading = restarting\n        ? `Restarting the Antigravity server on ${host}…`\n        : connecting\n            ? `Reconnecting to ${host}…`\n            : `Disconnected from ${host}`;",
      "translated": "const heading = restarting\n        ? `正在重启 ${host} 上的 Antigravity 服务器…`\n        : connecting\n            ? `正在重新连接到 ${host}…`\n            : `已与 ${host} 断开连接`;",
      "optional": true
    },
    {
      "original": "const body = restarting\n        ? 'This window opens it again once it has started.'\n        : connecting\n            ? page.serverStopped\n                ? `Its server on ${host} stopped, and its agents with it.`\n                : `Agents keep running on ${host}.`\n            : page.serverStopped\n                ? `Its agents on ${host} stopped with it.`\n                : `Agents keep running on ${host} unless its server stopped.`;",
      "translated": "const body = restarting\n        ? '服务器启动完成后，此窗口将自动重新打开。'\n        : connecting\n            ? page.serverStopped\n                ? `${host} 上的服务器及其智能体均已停止。`\n                : `智能体仍在 ${host} 上继续运行。`\n            : page.serverStopped\n                ? `${host} 上的智能体已随服务器一同停止。`\n                : `除非远程服务器已停止，否则智能体仍在 ${host} 上继续运行。`;",
      "optional": true
    }
  ],
  "remote/sshPrompts.js": [
    {
      "original": "<div id=\"retry\" class=\"note\" hidden>Asked again: your last answer may not have worked.</div>",
      "translated": "<div id=\"retry\" class=\"note\" hidden>已再次提示：您上次输入的凭据可能未生效。</div>",
      "optional": true
    },
    {
      "original": "<div id=\"long\" class=\"note\" hidden>That's too long.</div>",
      "translated": "<div id=\"long\" class=\"note\" hidden>输入内容过长。</div>",
      "optional": true
    },
    {
      "original": "<div class=\"buttons\"><button id=\"cancel\">Cancel</button><button id=\"continue\">Continue</button></div>",
      "translated": "<div class=\"buttons\"><button id=\"cancel\">取消</button><button id=\"continue\">继续</button></div>",
      "optional": true
    },
    {
      "original": "message: confirm ? `${label} asks:` : 'Touch your security key',",
      "translated": "message: confirm ? `${label} 请求确认：` : '请轻触您的安全密钥',",
      "optional": true
    },
    {
      "original": "buttons: confirm ? ['Yes', 'No'] : ['Cancel'],",
      "translated": "buttons: confirm ? ['是', '否'] : ['取消'],",
      "optional": true
    },
    {
      "original": "const TOUCH_TITLE = 'Touch your security key';",
      "translated": "const TOUCH_TITLE = '请轻触您的安全密钥';",
      "optional": true
    },
    {
      "original": "<p class=\"context\">Connecting to <span id=\"label\"></span></p>",
      "translated": "<p class=\"context\">正在连接到 <span id=\"label\"></span></p>",
      "optional": true
    },
    {
      "original": "<div id=\"long\" class=\"note\" role=\"alert\" hidden>That's too long.</div>",
      "translated": "<div id=\"long\" class=\"note\" role=\"alert\" hidden>输入内容过长。</div>",
      "optional": true
    },
    {
      "original": "<div class=\"buttons\"><button id=\"cancel\" class=\"secondary\">Cancel</button><button id=\"continue\" class=\"primary\">Continue</button></div>",
      "translated": "<div class=\"buttons\"><button id=\"cancel\" class=\"secondary\">取消</button><button id=\"continue\" class=\"primary\">继续</button></div>",
      "optional": true
    }
  ],
  "remote/sshPromptPreload.js": [
    {
      "original": "asks.textContent = `${label} asks:`;",
      "translated": "asks.textContent = `${label} 请求输入：`;",
      "optional": true
    }
  ],
  "remote/sshErrorText.js": [
    {
      "original": "return `Error code: ${err.code}\\nLogs: ${logPath()}`;",
      "translated": "return `错误代码：${err.code}\\n日志：${logPath()}`;",
      "optional": true
    },
    {
      "original": "return err.reportedByRemote ? `${label} reported: ${text}` : text;",
      "translated": "return err.reportedByRemote ? `${label} 返回错误：${text}` : text;",
      "optional": true
    },
    {
      "original": ": 'The connection was closed before it finished.';",
      "translated": ": '连接在完成前已被关闭。';",
      "optional": true
    },
    {
      "original": "return `${what}\\nFile: ${note} on ${label}`;",
      "translated": "return `${what}\\n文件：${label} 上的 ${note}`;",
      "optional": true
    },
    {
      "original": "return err.code === 'UNKNOWN' ? `${text}\\nLogs: ${logPath()}` : text;",
      "translated": "return err.code === 'UNKNOWN' ? `${text}\\n日志：${logPath()}` : text;",
      "optional": true
    },
    {
      "original": "return pointsToLog ? `${text}\\nLogs: ${logPath()}` : text;",
      "translated": "return pointsToLog ? `${text}\\n日志：${logPath()}` : text;",
      "optional": true
    },
    {
      "original": "return `Windows SSH hosts aren't supported yet. ${sshArgs_1.LINUX_HOST_NEEDED}`;",
      "translated": "return `暂不支持连接 Windows SSH 主机。${sshArgs_1.LINUX_HOST_NEEDED}`;",
      "optional": true
    }
  ],
  "remote/remoteManager.js": [
    {
      "original": "title: 'Choose an SSH config file',",
      "translated": "title: '选择 SSH 配置文件',",
      "optional": true
    },
    {
      "original": "title: 'SSH connection failed',",
      "translated": "title: 'SSH 连接失败',",
      "optional": true
    },
    {
      "original": "buttons: ['Stop Server', 'Cancel'],",
      "translated": "buttons: ['停止服务器', '取消'],",
      "optional": true
    },
    {
      "original": "title: 'Stop SSH server',",
      "translated": "title: '停止 SSH 服务器',",
      "optional": true
    },
    {
      "original": "message: `Stop the Antigravity server on ${entry.label}?`,",
      "translated": "message: `确认停止 ${entry.label} 上的 Antigravity 服务器吗？`,",
      "optional": true
    },
    {
      "original": "detail: 'Agents running on this host will stop and its window will close. ' +\n                    'The server starts again the next time you connect.',",
      "translated": "detail: '此主机上正在运行的智能体将停止，其窗口也将关闭。' +\n                    '下次连接时服务器会自动重新启动。',",
      "optional": true
    },
    {
      "original": "this.reportError(err, entry.label, 'Could not stop the SSH server', win);",
      "translated": "this.reportError(err, entry.label, '无法停止 SSH 服务器', win);",
      "optional": true
    },
    {
      "original": "message: `Not connected to ${label}`,",
      "translated": "message: `尚未连接到 ${label}`,",
      "optional": true
    },
    {
      "original": "detail: 'Reconnect first, then stop its server.',",
      "translated": "detail: '请先重新连接，然后再停止其服务器。',",
      "optional": true
    },
    {
      "original": "buttons: ['Sign In', 'Cancel'],",
      "translated": "buttons: ['登录', '取消'],",
      "optional": true
    },
    {
      "original": "title: 'Sign in',",
      "translated": "title: '登录',",
      "optional": true
    },
    {
      "original": "message: `Sign in to your organization for ${entry.label}?`,",
      "translated": "message: `要为 ${entry.label} 登录您的组织账户吗？`,",
      "optional": true
    },
    {
      "original": "detail: 'Continue only if you just chose to sign in with your organization ' +\n                `in this window. ${entry.label} will get access to your ` +\n                \"organization's Google Cloud account.\\n\" +",
      "translated": "detail: '仅在您刚刚确实选择在此窗口中登录组织账户时才继续。' +\n                `继续后，${entry.label} 将获得您组织的 Google Cloud 账户访问权限。\\n` +",
      "optional": true
    },
    {
      "original": "title: 'Microphone access',",
      "translated": "title: '麦克风访问权限',",
      "optional": true
    },
    {
      "original": "buttons: ['Allow', \"Don't Allow\"],",
      "translated": "buttons: ['允许', '不允许'],",
      "optional": true
    },
    {
      "original": "message: `Allow ${entry.label} to use your microphone?`,",
      "translated": "message: `允许 ${entry.label} 使用您的麦克风吗？`,",
      "optional": true
    },
    {
      "original": "title: 'Shared home directory',",
      "translated": "title: '检测到共享主目录',",
      "optional": true
    },
    {
      "original": "buttons: ['Take Over', 'Cancel'],",
      "translated": "buttons: ['接管服务', '取消'],",
      "optional": true
    },
    {
      "original": "title: 'Restart SSH server',",
      "translated": "title: '重启 SSH 服务器',",
      "optional": true
    },
    {
      "original": "buttons: ['Restart', 'Later'],",
      "translated": "buttons: ['立即重启', '稍后'],",
      "optional": true
    }
  ],
  "remote/sshArgs.js": [
    {
      "original": "throw new types_1.RemoteError('INVALID_DESTINATION', 'Invalid SSH config file.');",
      "translated": "throw new types_1.RemoteError('INVALID_DESTINATION', '无效的 SSH 配置文件。');",
      "optional": true
    },
    {
      "original": "no: \"SSH authentication failed. Antigravity can't answer password or code prompts on Windows yet: set up key-based login with ssh-agent, then try again.\",",
      "translated": "no: \"SSH 身份验证失败。Antigravity 在 Windows 上暂不支持交互式密码或验证码输入：请先使用 ssh-agent 配置密钥免密登录，然后重试。\",",
      "optional": true
    },
    {
      "original": "return `Couldn't connect to the SSH host. Check its name, your network and ssh config (e.g. a ProxyCommand), and that ssh to it works in a terminal${prompts === 'no' ? ' without a prompt' : ''}.`;",
      "translated": "return `无法连接到 SSH 主机。请检查主机名、网络与 ssh 配置（如 ProxyCommand），并确认在终端中可执行 ssh 连接${prompts === 'no' ? '（无需交互式输入）' : ''}。`;",
      "optional": true
    },
    {
      "original": "return 'SSH port forwarding failed. Make sure the server allows TCP forwarding (AllowTcpForwarding) for your account, then try again.';",
      "translated": "return 'SSH 端口转发失败。请确保服务器对您的账户启用了 TCP 转发（AllowTcpForwarding），然后重试。';",
      "optional": true
    },
    {
      "original": "return \"The SSH host isn't supported. Antigravity needs Linux on x64 or arm64 with glibc 2.26 or newer.\";",
      "translated": "return \"不支持该 SSH 主机系统。Antigravity 需要 x64 或 arm64 架构的 Linux（glibc 2.26 及以上版本）。\";",
      "optional": true
    },
    {
      "original": "return 'Another host that shares your home directory runs the Antigravity server. Connect to that host instead.';",
      "translated": "return '共享同一主目录的另一台主机正在运行 Antigravity 服务器，请改为连接到该主机。';",
      "optional": true
    },
    {
      "original": "return \"Couldn't install the Antigravity server on the SSH host. Make sure it has free disk space, and that it or this computer can download from the internet.\";",
      "translated": "return \"无法在 SSH 主机上安装 Antigravity 服务器。请确保主机拥有足够的可用磁盘空间，且该主机或当前计算机能够正常联网下载。\";",
      "optional": true
    },
    {
      "original": "return `The Antigravity server failed to start on the SSH host. See its log in ~/${types_1.REMOTE_INSTALL_ROOT}/data on that host.`;",
      "translated": "return `SSH 主机上的 Antigravity 服务器启动失败。请查看该主机 ~/${types_1.REMOTE_INSTALL_ROOT}/data 目录下的日志。`;",
      "optional": true
    },
    {
      "original": "return 'The Antigravity server on the SSH host stopped. Reconnect to start it again.';",
      "translated": "return 'SSH 主机上的 Antigravity 服务器已停止运行，请重新连接以再次启动。';",
      "optional": true
    },
    {
      "original": "return 'The SSH connection closed. Check your network connection, then reconnect.';",
      "translated": "return 'SSH 连接已关闭。请检查您的网络连接后重新连接。';",
      "optional": true
    },
    {
      "original": "return 'The connection was cancelled.';",
      "translated": "return '连接已取消。';",
      "optional": true
    },
    {
      "original": "return \"Couldn't connect to the SSH host. Try ssh to it in a terminal, and see the Antigravity log for details.\";",
      "translated": "return \"无法连接到 SSH 主机。请在终端中尝试使用 ssh 连接，并查看 Antigravity 日志了解详情。\";",
      "optional": true
    },
    {
      "original": "exports.LINUX_HOST_NEEDED = 'Antigravity needs a Linux host on x64 or arm64 with glibc 2.26 or newer.';",
      "translated": "exports.LINUX_HOST_NEEDED = 'Antigravity 需要运行 glibc 2.26 及以上版本的 x64 或 arm64 Linux 主机。';",
      "optional": true
    },
    {
      "original": "return 'Another host that shares your home directory runs the Antigravity server. Connect to that host, or connect again and choose Take Over.';",
      "translated": "return '共享同一主目录的另一台主机正在运行 Antigravity 服务器。请改为连接该主机，或重新连接并选择“接管服务”。';",
      "optional": true
    }
  ],
  "remote/sshBridge.js": [
    {
      "original": "const BAD_CONFIG_FILE = 'The SSH config file must be a path of at most 4 KiB.';",
      "translated": "const BAD_CONFIG_FILE = 'SSH 配置文件路径长度不能超过 4 KiB。';",
      "optional": true
    },
    {
      "original": "message: 'Enter an SSH host, for example \"devbox\" or \"user@host\".',",
      "translated": "message: '请输入 SSH 主机，例如 \"devbox\" 或 \"user@host\"。',",
      "optional": true
    }
  ],
  "remote/signInCallback.js": [
    {
      "original": "body: page('Signed in', 'Signed in. You can close this tab.'),",
      "translated": "body: page('已登录', '登录成功，您可以关闭此标签页。'),",
      "optional": true
    },
    {
      "original": "body: page('Sign-in did not complete', 'The Antigravity server on the SSH host could not be reached. ' +\n        'Sign in again from Antigravity.'),",
      "translated": "body: page('登录未完成', '无法访问 SSH 主机上的 Antigravity 服务器，' +\n        '请从 Antigravity 重新登录。'),",
      "optional": true
    },
    {
      "original": "'You have successfully authenticated.'",
      "translated": "'您已成功完成身份认证，现在可以关闭此页面。'",
      "optional": true
    },
    {
      "original": "\"Sign-in didn't finish\"",
      "translated": "'登录未完成'",
      "optional": true
    },
    {
      "original": "'Sign in again from Antigravity.'",
      "translated": "'请返回 Antigravity 重新发起登录。'",
      "optional": true
    }
  ],
  "desktopHost/pairing.js": [
    {
      "original": "'Unnamed device'",
      "translated": "'未命名设备'",
      "optional": true
    }
  ],
  "computer/overlay.js": [
    {
      "original": "return `Agent: ${clean}`;",
      "translated": "return `智能体：${clean}`;",
      "optional": true
    }
  ]
};

const MAIN_DYNAMIC_EXACT = {
  "File": "文件",
  "Edit": "编辑",
  "View": "视图",
  "Window": "窗口",
  "Help": "帮助",
  "New Window": "新建窗口",
  "Connect to WSL": "连接到 WSL",
  "Reopen Locally": "在本地重新打开",
  "Docs": "文档",
  "Check for Updates": "检查更新",
  "Checking for Updates...": "正在检查更新...",
  "Downloading Update...": "正在下载更新...",
  "Restart to Update": "重启以更新",
  "No agents running": "无智能体运行",
  "Quit": "退出",
  "Cancel": "取消",
  "OK": "确定",
  "Yes": "是",
  "No": "否",
  "Allow": "允许",
  "Don't Allow": "不允许",
  "Take Over": "接管服务",
  "Restart": "立即重启",
  "Later": "稍后",
  "Choose Another File…": "选择其他文件…",
  "Undo": "撤销",
  "Redo": "重做",
  "Cut": "剪切",
  "Copy": "复制",
  "Paste": "粘贴",
  "Paste and Match Style": "粘贴并匹配样式",
  "Delete": "删除",
  "Select All": "全选",
  "Reload": "重新加载",
  "Force Reload": "强制重新加载",
  "Toggle Developer Tools": "切换开发者工具",
  "Actual Size": "实际大小",
  "Reset Zoom": "重置缩放",
  "Zoom In": "放大",
  "Zoom Out": "缩小",
  "Toggle Full Screen": "切换全屏",
  "Minimize": "最小化",
  "Zoom": "缩放",
  "Close": "关闭",
  "Close Window": "关闭窗口",
  "Bring All to Front": "前置全部窗口",
  "Services": "服务",
  "Hide": "隐藏",
  "Hide Others": "隐藏其他",
  "Unhide": "全部显示",
  "Copy Path": "复制路径",
  "Copy Relative Path": "复制相对路径",
  "Reveal in File Explorer": "在文件资源管理器中显示",
  "Reveal in Finder": "在 Finder 中显示",
  "Reveal in File Manager": "在文件管理器中显示",
  "Open in Integrated Terminal": "在集成终端中打开",
  "Open in Terminal": "在终端中打开",
  "Open Containing Folder": "打开所在文件夹",
  "Open Folder": "打开文件夹",
  "Close Folder": "关闭文件夹",
  "Remove Folder from Workspace": "从工作区移除文件夹",
  "Rename": "重命名",
  "Rename...": "重命名...",
  "Duplicate": "创建副本",
  "New File": "新建文件",
  "New Folder": "新建文件夹",
  "Pin": "置顶",
  "Unpin": "取消置顶",
  "Archive": "归档",
  "Unarchive": "取消归档",
  "Delete Conversation": "删除对话",
  "Rename Conversation": "重命名对话",
  "Mark as Read": "标为已读",
  "Mark as Unread": "标为未读",
  "Open Link": "打开链接",
  "Copy Link": "复制链接",
  "Copy Link Address": "复制链接地址",
  "Copy Image": "复制图片",
  "Copy Image Address": "复制图片地址",
  "Save Image As...": "图片另存为...",
  "Inspect": "检查",
  "Inspect Element": "检查元素",
  "Open workspace": "打开工作区",
  "Open workspaces": "打开多个工作区",
  "Confirm Quit": "确认退出",
  "Are you sure you want to quit?": "确定要退出吗？",
  "There may be agents or background tasks running.": "可能有智能体或后台任务正在运行。",
  "No updates available": "当前已是最新版本",
  "Binary not found": "文件未找到",
  "Startup failed": "启动失败",
  "WSL distro not found": "未找到 WSL 发行版",
  "Antigravity opened on Windows instead.": "Antigravity 已改为在 Windows 本地打开。",
  "WSL setup failed": "WSL 配置失败",
  "Cannot open folder": "无法打开文件夹",
  "Folder is on the Windows filesystem": "文件夹位于 Windows 文件系统中",
  "This folder is on the Windows filesystem. Accessing it from WSL (via /mnt) can be slow — for best performance keep projects inside the WSL filesystem.": "此文件夹位于 Windows 文件系统中。从 WSL（通过 /mnt）访问可能会较慢——为获得最佳性能，建议将项目保存在 WSL 文件系统内。",
  "Choose a Passkey": "选择通行密钥",
  "Select a passkey account to continue:": "选择要继续使用的通行密钥账户：",
  "Select Download Folder": "选择下载文件夹",
  "Connect a device": "连接设备",
  "Select a device:": "选择设备：",
  "No compatible devices found.": "未找到兼容的设备。",
  "Unknown device": "未知设备",
  "Connection info…": "连接信息…",
  "Connection info": "连接信息",
  "Not secure": "不安全",
  "⚠ Not secure": "⚠ 不安全",
  "Connection is secure": "连接安全",
  "Your connection to this site is not secure": "您与此网站的连接不安全",
  "You should not enter any sensitive information on this site (for example, passwords or credit cards), because it could be stolen by attackers.": "请勿在此网站上输入任何敏感信息（例如密码或信用卡信息），否则可能会被攻击者窃取。",
  "Your information (for example, passwords or credit card numbers) is private when it is sent to this site.": "您的信息（例如密码或信用卡号）在发送到此网站时处于私密保护状态。",
  "Connection security information is not available for this page": "此页面的连接安全信息不可用",
  "Certificate is valid": "证书有效",
  "Certificate details": "证书详情",
  "This page": "此页面",
  "Passkeys": "通行密钥",
  "Use your phone or tablet": "使用您的手机或平板电脑",
  "Connecting to your device…": "正在连接到您的设备…",
  "Verify on your device to continue…": "请在您的设备上验证以继续…",
  "Stop Server": "停止服务器",
  "Sign In": "登录",
  "Sign in": "登录",
  "Sign-in failed": "登录失败",
  "Continue": "继续",
  "Choose an SSH config file": "选择 SSH 配置文件",
  "Choose another SSH config file": "选择其他 SSH 配置文件",
  "SSH connection failed": "SSH 连接失败",
  "Reconnect failed": "重新连接失败",
  "Restart failed": "重启失败",
  "Could not restart the SSH server": "无法重启 SSH 服务器",
  "Could not load its window": "无法加载窗口内容",
  "Stop SSH server": "停止 SSH 服务器",
  "Restart SSH server": "重启 SSH 服务器",
  "Could not stop the SSH server": "无法停止 SSH 服务器",
  "Reconnect first, then stop its server.": "请先重新连接，然后再停止其服务器。",
  "Touch your security key": "请轻触您的安全密钥",
  "Microphone access": "麦克风访问权限",
  "Shared home directory": "检测到共享主目录",
  "Accept updated host keys?": "接受更新后的主机密钥吗？"
};

const ROLE_LABELS = {
  "undo": "撤销",
  "redo": "重做",
  "cut": "剪切",
  "copy": "复制",
  "paste": "粘贴",
  "pasteandmatchstyle": "粘贴并匹配样式",
  "delete": "删除",
  "selectall": "全选",
  "reload": "重新加载",
  "forcereload": "强制重新加载",
  "toggledevtools": "切换开发者工具",
  "resetzoom": "实际大小",
  "zoomin": "放大",
  "zoomout": "缩小",
  "togglefullscreen": "切换全屏",
  "minimize": "最小化",
  "zoom": "缩放",
  "close": "关闭",
  "quit": "退出",
  "front": "前置全部窗口",
  "services": "服务",
  "hide": "隐藏",
  "hideothers": "隐藏其他",
  "unhide": "全部显示",
  "filemenu": "文件",
  "editmenu": "编辑",
  "viewmenu": "视图",
  "windowmenu": "窗口",
  "helpmenu": "帮助"
};

module.exports = {
  STATIC_FILE_RULES,
  MAIN_DYNAMIC_EXACT,
  ROLE_LABELS,
};
