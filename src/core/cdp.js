/**
 * Antigravity 中文汉化补丁 v4.0 - 零外部依赖原生 RFC 6455 WebSocket + CDP 实时热汉化模块
 */

'use strict';

const net = require('net');
const http = require('http');
const path = require('path');
const crypto = require('crypto');
const { ofs } = require('./fs-lock.js');
const { ROAMING_APPDATA, VERIFIED_CDP_FILE_PATH, ensurePatchDataDir } = require('./config.js');
const { PATCH_DICT_SIGNATURE, compileFrontendScript } = require('../compiler.js');

function sendCdpCommandsOverRawWs(wsUrl, commands, timeoutMs = 4500) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { socket.destroy(); } catch {}
      resolve(val);
    };

    let parsedUrl;
    try {
      parsedUrl = new URL(wsUrl);
    } catch {
      return resolve({ ok: false, error: 'invalid_ws_url' });
    }

    const host = parsedUrl.hostname || '127.0.0.1';
    const port = parseInt(parsedUrl.port || '80', 10);
    const reqPath = (parsedUrl.pathname || '/') + (parsedUrl.search || '');
    const secKey = crypto.randomBytes(16).toString('base64');

    const socket = net.createConnection({ host, port });
    const timer = setTimeout(() => finish({ ok: false, error: 'timeout' }), timeoutMs);

    let upgraded = false;
    let rxBuf = Buffer.alloc(0);
    const pendingIds = new Set(commands.map((c) => c.id));
    const responses = new Map();

    function encodeMaskedTextFrame(str) {
      const payload = Buffer.from(str, 'utf8');
      const len = payload.length;
      const maskKey = crypto.randomBytes(4);
      let headerLen = 2;
      if (len >= 126 && len <= 65535) headerLen += 2;
      else if (len > 65535) headerLen += 8;

      const frame = Buffer.alloc(headerLen + 4 + len);
      frame[0] = 0x81;
      let offset = 2;
      if (len < 126) {
        frame[1] = 0x80 | len;
      } else if (len <= 65535) {
        frame[1] = 0x80 | 126;
        frame.writeUInt16BE(len, 2);
        offset = 4;
      } else {
        frame[1] = 0x80 | 127;
        frame.writeBigUInt64BE(BigInt(len), 2);
        offset = 10;
      }
      maskKey.copy(frame, offset);
      offset += 4;
      for (let i = 0; i < len; i++) {
        frame[offset + i] = payload[i] ^ maskKey[i & 3];
      }
      return frame;
    }

    function drainIncomingFrames() {
      while (rxBuf.length >= 2) {
        const opcode = rxBuf[0] & 0x0f;
        const isMasked = (rxBuf[1] & 0x80) !== 0;
        let payloadLen = rxBuf[1] & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (rxBuf.length < 4) return;
          payloadLen = rxBuf.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (rxBuf.length < 10) return;
          payloadLen = Number(rxBuf.readBigUInt64BE(2));
          offset = 10;
        }

        const maskLen = isMasked ? 4 : 0;
        if (rxBuf.length < offset + maskLen + payloadLen) return;

        let payload = rxBuf.subarray(offset + maskLen, offset + maskLen + payloadLen);
        if (isMasked) {
          const m = rxBuf.subarray(offset, offset + 4);
          payload = Buffer.from(payload);
          for (let i = 0; i < payload.length; i++) payload[i] ^= m[i & 3];
        }
        rxBuf = rxBuf.subarray(offset + maskLen + payloadLen);

        if (opcode === 0x08) {
          finish({ ok: responses.size > 0, responses });
          return;
        }
        if (opcode === 0x01) {
          try {
            const msg = JSON.parse(payload.toString('utf8'));
            if (msg && msg.id !== undefined && pendingIds.has(msg.id)) {
              responses.set(msg.id, msg);
              pendingIds.delete(msg.id);
              if (pendingIds.size === 0) {
                finish({ ok: true, responses });
                return;
              }
            }
          } catch {}
        }
      }
    }

    socket.on('connect', () => {
      const handshake = [
        `GET ${reqPath} HTTP/1.1`,
        `Host: ${host}:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${secKey}`,
        'Sec-WebSocket-Version: 13',
        '',
        '',
      ].join('\r\n');
      socket.write(handshake);
    });

    socket.on('data', (chunk) => {
      rxBuf = Buffer.concat([rxBuf, chunk]);
      if (!upgraded) {
        const sep = rxBuf.indexOf('\r\n\r\n');
        if (sep === -1) return;
        const headerStr = rxBuf.subarray(0, sep).toString('utf8');
        rxBuf = rxBuf.subarray(sep + 4);
        if (!headerStr.includes('101')) {
          finish({ ok: false, error: 'ws_handshake_rejected' });
          return;
        }
        upgraded = true;
        for (const cmd of commands) {
          socket.write(encodeMaskedTextFrame(JSON.stringify(cmd)));
        }
      }
      if (upgraded && rxBuf.length > 0) {
        drainIncomingFrames();
      }
    });

    socket.on('error', (err) => finish({ ok: false, error: err.message }));
    socket.on('end', () => finish({ ok: pendingIds.size === 0, responses }));
  });
}

function readActiveDevToolsInfo() {
  const candidates = [
    path.join(ROAMING_APPDATA, 'Antigravity', 'DevToolsActivePort'),
    path.join(ROAMING_APPDATA, 'Antigravity IDE', 'DevToolsActivePort'),
  ];
  for (const p of candidates) {
    if (!ofs.existsSync(p)) continue;
    try {
      const lines = ofs.readFileSync(p, 'utf8').trim().split(/\r?\n/);
      if (lines[0] && /^\d+$/.test(lines[0].trim())) {
        return {
          port: parseInt(lines[0].trim(), 10),
          browserPath: (lines[1] || '').trim() || null,
        };
      }
    } catch {}
  }
  return null;
}

function getDevToolsPortSignatureText() {
  const portFile = path.join(ROAMING_APPDATA, 'Antigravity', 'DevToolsActivePort');
  try {
    if (!ofs.existsSync(portFile)) return '';
    return ofs.readFileSync(portFile, 'utf8').trim();
  } catch {
    return '';
  }
}

function recordVerifiedCdpState(portSig = getDevToolsPortSignatureText()) {
  try {
    const norm = String(portSig || '').replace(/\r?\n/g, '|').trim();
    if (!norm) return;
    ensurePatchDataDir();
    ofs.writeFileSync(VERIFIED_CDP_FILE_PATH, `${PATCH_DICT_SIGNATURE}|${norm}`, 'utf8');
  } catch {}
}

function clearVerifiedCdpState() {
  try {
    if (ofs.existsSync(VERIFIED_CDP_FILE_PATH)) ofs.unlinkSync(VERIFIED_CDP_FILE_PATH);
  } catch {}
}

function fetchHttpJsonTargets(port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    if (!port) return resolve([]);
    const req = http.get(`http://127.0.0.1:${port}/json`, (res) => {
      if (res.statusCode !== 200) {
        res.resume();
        return resolve([]);
      }
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(Array.isArray(parsed) ? parsed : []);
        } catch {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve([]);
    });
  });
}

async function discoverHubPageWsUrls(devToolsInfo) {
  const { port, browserPath } = devToolsInfo;
  const isHubPage = (type, url) =>
    type === 'page' && /^https?:\/\/(127\.0\.0\.1|localhost)(?::\d+)?(?:\/|\?|#|$)/i.test(url || '');

  const httpTargets = await fetchHttpJsonTargets(port);
  const urlsFromHttp = httpTargets
    .filter((t) => isHubPage(t.type, t.url) && t.webSocketDebuggerUrl)
    .map((t) => t.webSocketDebuggerUrl);
  if (urlsFromHttp.length > 0) {
    return urlsFromHttp;
  }

  if (browserPath) {
    const browserWs = `ws://127.0.0.1:${port}${browserPath.startsWith('/') ? '' : '/'}${browserPath}`;
    const res = await sendCdpCommandsOverRawWs(browserWs, [{ id: 1, method: 'Target.getTargets', params: {} }], 2500);
    if (res.ok && res.responses) {
      const infos = res.responses.get(1)?.result?.targetInfos;
      if (Array.isArray(infos)) {
        return infos
          .filter((info) => isHubPage(info.type, info.url) && info.targetId)
          .map((info) => `ws://127.0.0.1:${port}/devtools/page/${info.targetId}`);
      }
    }
  }
  return [];
}

async function hotInjectZhToRunningWindows(options = {}) {
  const { maxAttempts = 1, retryDelayMs = 600, verifyOnly = false, frontendScript = null } = options;
  const i18nCode = frontendScript || compileFrontendScript();
  if (!i18nCode) {
    return { reachable: false, injected: 0, reason: 'missing_i18n_source' };
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const devToolsInfo = readActiveDevToolsInfo();
    if (devToolsInfo) {
      const wsUrls = await discoverHubPageWsUrls(devToolsInfo);
      if (wsUrls.length > 0) {
        let injected = 0;
        let alreadySynced = 0;
        for (const wsUrl of wsUrls) {
          if (verifyOnly) {
            const probeRes = await sendCdpCommandsOverRawWs(
              wsUrl,
              [
                {
                  id: 1,
                  method: 'Runtime.evaluate',
                  params: {
                    expression: `Boolean(globalThis.__agZhPatchSignature === ${JSON.stringify(PATCH_DICT_SIGNATURE)} && document.documentElement?.dataset?.antigravityZhI18nInitialized === 'true')`,
                    returnByValue: true,
                  },
                },
              ],
              3000
            );
            const isUpToDate = probeRes.ok && probeRes.responses?.get(1)?.result?.result?.value === true;
            if (isUpToDate) {
              alreadySynced++;
              continue;
            }
          }
          const cmds = [
            { id: 1, method: 'Page.enable', params: {} },
            { id: 2, method: 'Page.addScriptToEvaluateOnNewDocument', params: { source: i18nCode } },
            { id: 3, method: 'Runtime.evaluate', params: { expression: i18nCode, returnByValue: true } },
          ];
          const res = await sendCdpCommandsOverRawWs(wsUrl, cmds, 5000);
          if (res.ok) injected++;
        }
        if (injected + alreadySynced >= wsUrls.length) {
          recordVerifiedCdpState();
        }
        if (injected > 0 || alreadySynced > 0) {
          return {
            reachable: true,
            port: devToolsInfo.port,
            injected,
            alreadySynced,
            totalPages: wsUrls.length,
          };
        }
      }
    }

    if (attempt + 1 < maxAttempts) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  return { reachable: false, injected: 0 };
}

module.exports = {
  hotInjectZhToRunningWindows,
  recordVerifiedCdpState,
  clearVerifiedCdpState,
};
