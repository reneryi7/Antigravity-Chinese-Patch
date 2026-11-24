/**
 * Antigravity 中文汉化补丁 v4.0 - Preload IPC 原生右键菜单与系统通知拦截片段
 */

'use strict';

const PRELOAD_IPC_SNIPPET = `
// 拦截渲染进程发往主进程的原生右键菜单 (window:show-context-menu) 与通知 (notification:send)
try {
  if (typeof electron_1 !== 'undefined' && electron_1.ipcRenderer && typeof electron_1.ipcRenderer.invoke === 'function' && !electron_1.ipcRenderer.__agyZhInvokeHooked) {
    electron_1.ipcRenderer.__agyZhInvokeHooked = true;
    const _origInvoke = electron_1.ipcRenderer.invoke.bind(electron_1.ipcRenderer);
    const _trMenuItem = (item) => {
      if (!item || typeof item !== 'object') return item;
      const copy = { ...item };
      if (typeof copy.label === 'string' && copy.label && typeof globalThis.__agyTranslateString === 'function') {
        copy.label = globalThis.__agyTranslateString(copy.label) || copy.label;
      }
      if (Array.isArray(copy.submenu)) copy.submenu = copy.submenu.map(_trMenuItem);
      if (Array.isArray(copy.items)) copy.items = copy.items.map(_trMenuItem);
      return copy;
    };
    electron_1.ipcRenderer.invoke = function(channel, ...args) {
      try {
        if (channel === 'window:show-context-menu' && Array.isArray(args[0])) {
          args[0] = args[0].map(_trMenuItem);
        } else if (channel === 'notification:send' && args[0] && typeof args[0] === 'object' && typeof globalThis.__agyTranslateString === 'function') {
          args[0] = {
            ...args[0],
            title: typeof args[0].title === 'string' ? (globalThis.__agyTranslateString(args[0].title) || args[0].title) : args[0].title,
            body: typeof args[0].body === 'string' ? (globalThis.__agyTranslateString(args[0].body) || args[0].body) : args[0].body,
          };
        }
      } catch {}
      return _origInvoke(channel, ...args);
    };
  }
} catch {}`;

module.exports = { PRELOAD_IPC_SNIPPET };
