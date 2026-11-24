/**
 * Antigravity 中文汉化补丁 v4.0 - 原始文件系统包装与跨进程事务锁
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

let ofs;
try {
  ofs = require('original-fs');
} catch {
  ofs = fs;
}

const PATCH_TXN_LOCK_FILE = path.join(os.tmpdir(), 'antigravity_patch_txn.lock');

function sleepSync(ms) {
  try {
    const sab = new SharedArrayBuffer(4);
    Atomics.wait(new Int32Array(sab), 0, 0, ms);
  } catch {
    const end = Date.now() + ms;
    while (Date.now() < end) {}
  }
}

/**
 * 检测指定文件是否被运行中的进程或内核锁占用
 */
function isFileLocked(filePath) {
  try {
    if (!filePath || !ofs.existsSync(filePath)) return false;
    const fd = ofs.openSync(filePath, 'r+');
    ofs.closeSync(fd);
    return false;
  } catch (err) {
    if (err && (err.code === 'EBUSY' || err.code === 'EPERM' || err.code === 'EACCES')) {
      return true;
    }
    return false;
  }
}

/**
 * 检测目标目录是否具备当前用户写权限（用于判断是否需要为 Program Files 触发 UAC 提权）
 */
function checkDirectoryWritable(dirPath) {
  try {
    if (!dirPath || !ofs.existsSync(dirPath)) return { writable: false, reason: 'not_found' };
    const probe = path.join(dirPath, `.agy_write_probe_${process.pid}_${Date.now()}`);
    const fd = ofs.openSync(probe, 'w');
    ofs.closeSync(fd);
    ofs.unlinkSync(probe);
    return { writable: true };
  } catch (err) {
    const needElevation = Boolean(err && (err.code === 'EACCES' || err.code === 'EPERM'));
    return { writable: false, needElevation, code: err ? err.code : 'UNKNOWN', message: err ? err.message : '' };
  }
}

/**
 * 跨进程共享事务互斥锁（防止并发读写 app.asar）
 */
function withPatchTxnLock(fn, timeoutMs = 15000) {
  if ((globalThis.__agPatchTxnDepth || 0) > 0) {
    globalThis.__agPatchTxnDepth++;
    try {
      return fn();
    } finally {
      globalThis.__agPatchTxnDepth--;
    }
  }
  const deadline = Date.now() + timeoutMs;
  let acquired = false;
  while (Date.now() < deadline) {
    try {
      const fd = ofs.openSync(PATCH_TXN_LOCK_FILE, 'wx');
      try {
        ofs.writeFileSync(fd, JSON.stringify({ pid: process.pid, ts: Date.now(), owner: 'zh-v4' }), 'utf8');
      } finally {
        ofs.closeSync(fd);
      }
      acquired = true;
      break;
    } catch (err) {
      if (err && err.code === 'EEXIST') {
        try {
          const st = ofs.statSync(PATCH_TXN_LOCK_FILE);
          if (Date.now() - st.mtimeMs > 35000) {
            ofs.unlinkSync(PATCH_TXN_LOCK_FILE);
            continue;
          }
        } catch {}
        sleepSync(45);
      } else {
        break;
      }
    }
  }
  globalThis.__agPatchTxnDepth = 1;
  try {
    return fn();
  } finally {
    globalThis.__agPatchTxnDepth = 0;
    if (acquired) {
      try { ofs.unlinkSync(PATCH_TXN_LOCK_FILE); } catch {}
    }
  }
}

module.exports = {
  ofs,
  PATCH_TXN_LOCK_FILE,
  sleepSync,
  isFileLocked,
  checkDirectoryWritable,
  withPatchTxnLock,
};
