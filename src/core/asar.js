/**
 * Antigravity 中文汉化补丁 v4.0 - 纯内存 ASAR 二进制归档解析与重打包引擎
 *
 * 无需解压到 %TEMP%，直接在内存中替换 dist/*.js 并重新计算 4MB 分块 SHA256 Integrity，
 * 彻底杜绝 Windows 杀毒软件扫描与临时目录 EPERM 文件锁报错，构建耗时 < 100ms。
 */

'use strict';

const crypto = require('crypto');
const { ofs } = require('./fs-lock.js');

const ASAR_BLOCK_SIZE = 4 * 1024 * 1024; // 4MB

const ZH_MAIN_MARKER_START = '/* __AGY_ZH_MAIN_HOOK_START__ */';
const ZH_MAIN_MARKER_END = '/* __AGY_ZH_MAIN_HOOK_END__ */';
const ZH_PRELOAD_MARKER_START = '/* __AGY_ZH_PRELOAD_START__ */';
const ZH_PRELOAD_MARKER_END = '/* __AGY_ZH_PRELOAD_END__ */';
const ZH_UTILS_MARKER_START = '/* __AGY_ZH_UTILS_START__ */';
const ZH_UTILS_MARKER_END = '/* __AGY_ZH_UTILS_END__ */';

// 通用外部共存扩展标记对（仅在重打包基底剥离时清理，重打包完成后按需无损叠加）
const COMPANION_MARKERS = [
  ['/* __AGY_HARNESS_STATS_START__ */', '/* __AGY_HARNESS_STATS_END__ */'],
  ['/* __AGY_COMPANION_EXT_START__ */', '/* __AGY_COMPANION_EXT_END__ */'],
];

function parseAsarBuffer(asarBuffer, label = 'app.asar') {
  if (!asarBuffer || asarBuffer.length < 16) {
    throw new Error(`ASAR 文件头过短: ${label}`);
  }
  const pickleSize = asarBuffer.readUInt32LE(4);
  const stringLength = asarBuffer.readUInt32LE(12);
  const dataOffset = 8 + pickleSize;
  const headerEnd = 16 + stringLength;
  if (headerEnd > asarBuffer.length || dataOffset > asarBuffer.length) {
    throw new Error(`ASAR 文件头长度无效: ${label}`);
  }
  const header = JSON.parse(asarBuffer.subarray(16, headerEnd).toString('utf8'));
  return { header, dataOffset };
}

function getAsarEntry(header, relPath) {
  const parts = relPath.split('/').filter(Boolean);
  let cur = header;
  for (const part of parts) {
    if (!cur || !cur.files || !Object.prototype.hasOwnProperty.call(cur.files, part)) {
      return null;
    }
    cur = cur.files[part];
  }
  return cur;
}

function readAsarFileBuffer(asarBuffer, parsed, relPath) {
  const entry = getAsarEntry(parsed.header, relPath);
  if (!entry || entry.files || entry.unpacked) {
    return null;
  }
  const start = parsed.dataOffset + Number(entry.offset);
  const end = start + Number(entry.size);
  if (start < parsed.dataOffset || end > asarBuffer.length) {
    throw new Error(`ASAR 条目偏移越界: ${relPath}`);
  }
  return asarBuffer.subarray(start, end);
}

function readAsarFileText(asarBuffer, parsed, relPath) {
  const buf = readAsarFileBuffer(asarBuffer, parsed, relPath);
  return buf ? buf.toString('utf8') : null;
}

function getAsarVersion(asarBuffer, parsed) {
  try {
    const pkgText = readAsarFileText(asarBuffer, parsed, 'package.json');
    if (!pkgText) return null;
    return JSON.parse(pkgText).version || null;
  } catch {
    return null;
  }
}

function isAsarBufferPatched(asarBuffer, parsed) {
  try {
    const preload = readAsarFileText(asarBuffer, parsed, 'dist/preload.js') || '';
    const main = readAsarFileText(asarBuffer, parsed, 'dist/main.js') || '';
    return (
      preload.includes('Antigravity 中文汉化补丁 - 前端翻译引擎注入') ||
      preload.includes(ZH_PRELOAD_MARKER_START) ||
      main.includes('__agyMainHookInstalled')
    );
  } catch {
    return false;
  }
}

function isAsarPatchedRaw(asarPath) {
  try {
    if (!asarPath || !ofs.existsSync(asarPath)) return false;
    const buf = ofs.readFileSync(asarPath);
    const parsed = parseAsarBuffer(buf, asarPath);
    const preload = readAsarFileText(buf, parsed, 'dist/preload.js') || '';
    const main = readAsarFileText(buf, parsed, 'dist/main.js') || '';
    return (
      (preload.includes('Antigravity 中文汉化补丁 - 前端翻译引擎注入') || preload.includes(ZH_PRELOAD_MARKER_START)) &&
      main.includes('__agyMainHookInstalled')
    );
  } catch {
    return false;
  }
}

function hasCompanionMarkers(asarBuffer, parsed) {
  try {
    const preload = readAsarFileText(asarBuffer, parsed, 'dist/preload.js') || '';
    const main = readAsarFileText(asarBuffer, parsed, 'dist/main.js') || '';
    return COMPANION_MARKERS.some(([s]) => preload.includes(s) || main.includes(s));
  } catch {
    return false;
  }
}

function stripMarkedSection(code, startMarker, endMarker) {
  if (typeof code !== 'string') return code;
  let out = code;
  while (true) {
    const sIdx = out.indexOf(startMarker);
    if (sIdx === -1) break;
    const eIdx = out.indexOf(endMarker, sIdx);
    if (eIdx === -1) break;
    const before = out.slice(0, sIdx).replace(/[ \t]*$/, '');
    const after = out.slice(eIdx + endMarker.length).replace(/^[ \t]*\r?\n?/, '');
    out = (before ? before + '\n' : '') + after;
  }
  return out;
}

function stripExistingPatchBlocks(code) {
  if (typeof code !== 'string') return code;
  let cleaned = code;
  cleaned = stripMarkedSection(cleaned, ZH_MAIN_MARKER_START, ZH_MAIN_MARKER_END);
  cleaned = stripMarkedSection(cleaned, ZH_PRELOAD_MARKER_START, ZH_PRELOAD_MARKER_END);
  cleaned = stripMarkedSection(cleaned, ZH_UTILS_MARKER_START, ZH_UTILS_MARKER_END);
  for (const [s, e] of COMPANION_MARKERS) {
    cleaned = stripMarkedSection(cleaned, s, e);
  }
  const legacyPreloadHeader =
    '// ============================================================================\n// Antigravity 中文汉化补丁 - 前端翻译引擎注入';
  const legacyIdx = cleaned.indexOf(legacyPreloadHeader);
  if (legacyIdx !== -1) {
    cleaned = cleaned.slice(0, legacyIdx).trimEnd() + '\n';
  }
  return cleaned;
}

function collectUnpackedFiles(header) {
  const unpackedFiles = new Map();
  function walk(node, prefix = '') {
    for (const [name, entry] of Object.entries(node.files || {})) {
      const relativePath = prefix ? `${prefix}/${name}` : name;
      if (entry.files) {
        walk(entry, relativePath);
      } else if (entry.unpacked) {
        unpackedFiles.set(relativePath, {
          ...entry,
          size: Number(entry.size) || 0,
          unpacked: true,
        });
      }
    }
  }
  walk(header);
  return unpackedFiles;
}

function computeAsarIntegrity(buf) {
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const blocks = [];
  for (let i = 0; i < buf.length; i += ASAR_BLOCK_SIZE) {
    const slice = buf.subarray(i, Math.min(i + ASAR_BLOCK_SIZE, buf.length));
    blocks.push(crypto.createHash('sha256').update(slice).digest('hex'));
  }
  if (blocks.length === 0) {
    blocks.push(crypto.createHash('sha256').update(Buffer.alloc(0)).digest('hex'));
  }
  return {
    algorithm: 'SHA256',
    hash,
    blockSize: ASAR_BLOCK_SIZE,
    blocks,
  };
}

function writePatchedAsarInMemory(sourceBuffer, parsedSource, patchedTextMap, destPath) {
  const chunks = [];
  let currentOffset = 0;
  let archivedFileCount = 0;

  function cloneAndPatchNode(node, prefix = '') {
    const newFiles = {};
    for (const [name, entry] of Object.entries(node.files || {})) {
      const relPath = prefix ? `${prefix}/${name}` : name;
      if (entry.files) {
        newFiles[name] = cloneAndPatchNode(entry, relPath);
      } else if (entry.unpacked) {
        newFiles[name] = { ...entry, unpacked: true };
      } else {
        archivedFileCount++;
        let fileBuf;
        let integrity = entry.integrity;
        if (patchedTextMap.has(relPath)) {
          fileBuf = Buffer.from(patchedTextMap.get(relPath), 'utf8');
          if (integrity) {
            integrity = computeAsarIntegrity(fileBuf);
          }
        } else {
          const origStart = parsedSource.dataOffset + Number(entry.offset);
          const origEnd = origStart + Number(entry.size);
          fileBuf = sourceBuffer.subarray(origStart, origEnd);
        }

        const newEntry = {
          ...entry,
          size: fileBuf.length,
          offset: String(currentOffset),
        };
        if (integrity) {
          newEntry.integrity = integrity;
        }
        newFiles[name] = newEntry;
        chunks.push(fileBuf);
        currentOffset += fileBuf.length;
      }
    }
    return { files: newFiles };
  }

  const newTree = cloneAndPatchNode(parsedSource.header);
  const headerString = JSON.stringify(newTree);
  const jsonBytes = Buffer.from(headerString, 'utf8');
  const stringLength = jsonBytes.length;
  const paddingSize = (4 - (stringLength % 4)) % 4;
  const headerStringSize = 4 + stringLength + paddingSize;
  const pickleSize = 4 + headerStringSize;
  const totalHeaderSize = 8 + pickleSize;

  const headerBuf = Buffer.alloc(totalHeaderSize, 0);
  headerBuf.writeUInt32LE(4, 0);
  headerBuf.writeUInt32LE(pickleSize, 4);
  headerBuf.writeUInt32LE(headerStringSize, 8);
  headerBuf.writeUInt32LE(stringLength, 12);
  jsonBytes.copy(headerBuf, 16);

  if (destPath) {
    const fd = ofs.openSync(destPath, 'w');
    try {
      ofs.writeSync(fd, headerBuf, 0, headerBuf.length, 0);
      let writeOffset = totalHeaderSize;
      for (const chunk of chunks) {
        ofs.writeSync(fd, chunk, 0, chunk.length, writeOffset);
        writeOffset += chunk.length;
      }
    } finally {
      ofs.closeSync(fd);
    }
  }

  return {
    totalSize: totalHeaderSize + currentOffset,
    headerSize: totalHeaderSize,
    archivedFileCount,
    header: newTree,
  };
}

module.exports = {
  ZH_MAIN_MARKER_START,
  ZH_MAIN_MARKER_END,
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
};
