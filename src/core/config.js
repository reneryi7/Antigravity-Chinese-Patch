/**
 * Antigravity 中文汉化补丁 v4.0 - 运行时数据目录与本地配置管理
 *
 * 说明：所有用户本机状态与可选私有配置均存储在 %APPDATA%\AntigravityChinesePatch
 * 或被 .gitignore 忽略的 config.local.json 中，确保开源仓库零个人环境耦合。
 */

'use strict';

const os = require('os');
const path = require('path');
const { ofs } = require('./fs-lock.js');

const HOME_DIR = os.homedir();
const LOCAL_APPDATA = process.env.LOCALAPPDATA || path.join(HOME_DIR, 'AppData', 'Local');
const ROAMING_APPDATA = process.env.APPDATA || path.join(HOME_DIR, 'AppData', 'Roaming');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const LOCAL_REPO_CONFIG_PATH = path.join(PROJECT_ROOT, 'config.local.json');

const PATCH_DATA_DIR = path.join(ROAMING_APPDATA, 'AntigravityChinesePatch');
const USER_CONFIG_PATH = path.join(PATCH_DATA_DIR, 'config.json');
const INSTALL_DIR_FILE = path.join(PATCH_DATA_DIR, 'install_dir.txt');
const STATE_FILE_PATH = path.join(PATCH_DATA_DIR, 'patched_state.txt');
const GUARDIAN_STATE_FILE_PATH = path.join(PATCH_DATA_DIR, 'guardian_state.txt');
const VERIFIED_CDP_FILE_PATH = path.join(PATCH_DATA_DIR, 'verified_cdp.txt');
const SOURCE_DIR_FILE = path.join(PATCH_DATA_DIR, 'source_dir.txt');
const JUNCTION_TARGET_FILE = path.join(PATCH_DATA_DIR, 'junction_target.txt');
const ACTIVE_INSTALLER_FILE = path.join(PATCH_DATA_DIR, 'active_installer.txt');
const RELAUNCH_FLAG_FILE = path.join(PATCH_DATA_DIR, 'relaunch_requested.flag');
const UPDATE_TASK_FILE = path.join(PATCH_DATA_DIR, 'update_task.txt');
const DAEMON_LOCK_FILE = path.join(PATCH_DATA_DIR, 'daemon.lock');
const RUNNER_LOCK_FILE = path.join(PATCH_DATA_DIR, 'runner.lock');
const LOG_FILE_PATH = path.join(PATCH_DATA_DIR, 'auto_heal.log');
const VBS_FILE_PATH = path.join(PATCH_DATA_DIR, 'auto_heal.vbs');
const UPDATE_RUNNER_VBS_PATH = path.join(PATCH_DATA_DIR, 'update_runner.vbs');
const CACHED_FRONTEND_SCRIPT_PATH = path.join(PATCH_DATA_DIR, 'ag-zh-i18n.js');

const REG_RUN_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run';
const REG_APPROVED_KEY = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run';
const REG_VALUE_NAME = 'AntigravityChinesePatchAutoHeal';

const EXIT_CODE_NEED_ELEVATION = 77;

function ensurePatchDataDir() {
  if (!ofs.existsSync(PATCH_DATA_DIR)) {
    ofs.mkdirSync(PATCH_DATA_DIR, { recursive: true });
  }
}

function appendLog(message) {
  try {
    ensurePatchDataDir();
    const line = `[${new Date().toISOString()}] ${message}\r\n`;
    ofs.appendFileSync(LOG_FILE_PATH, line, 'utf8');
  } catch {}
}

function readJsonSafe(filePath) {
  try {
    if (filePath && ofs.existsSync(filePath)) {
      return JSON.parse(ofs.readFileSync(filePath, 'utf8'));
    }
  } catch {}
  return {};
}

function loadMergedConfig() {
  const userCfg = readJsonSafe(USER_CONFIG_PATH);
  const repoLocalCfg = readJsonSafe(LOCAL_REPO_CONFIG_PATH);
  return {
    ...userCfg,
    ...repoLocalCfg,
  };
}

function saveUserConfig(patchObj) {
  try {
    ensurePatchDataDir();
    const current = readJsonSafe(USER_CONFIG_PATH);
    const next = { ...current, ...patchObj, updatedAt: new Date().toISOString() };
    ofs.writeFileSync(USER_CONFIG_PATH, JSON.stringify(next, null, 2) + '\n', 'utf8');
    return true;
  } catch {
    return false;
  }
}

function getClientPaths(antigravityDir) {
  const dir = path.resolve(antigravityDir);
  const resourcesDir = path.join(dir, 'resources');
  return {
    antigravityDir: dir,
    resourcesDir,
    asarPath: path.join(resourcesDir, 'app.asar'),
    asarBackupPath: path.join(resourcesDir, 'app.asar.backup'),
    asarUnpackedPath: path.join(resourcesDir, 'app.asar.unpacked'),
    deployedZhScriptPath: path.join(resourcesDir, 'ag-zh-i18n.js'),
    antigravityExe: path.join(dir, 'Antigravity.exe'),
    lsExeV2: path.join(resourcesDir, 'bin', 'language_server.exe'),
    lsExeV1: path.join(resourcesDir, 'app', 'extensions', 'antigravity', 'bin', 'language_server_windows_x64.exe'),
    uninstallExe: path.join(dir, 'Uninstall Antigravity.exe'),
  };
}

module.exports = {
  HOME_DIR,
  LOCAL_APPDATA,
  ROAMING_APPDATA,
  PROJECT_ROOT,
  LOCAL_REPO_CONFIG_PATH,
  PATCH_DATA_DIR,
  USER_CONFIG_PATH,
  INSTALL_DIR_FILE,
  STATE_FILE_PATH,
  GUARDIAN_STATE_FILE_PATH,
  VERIFIED_CDP_FILE_PATH,
  SOURCE_DIR_FILE,
  JUNCTION_TARGET_FILE,
  ACTIVE_INSTALLER_FILE,
  RELAUNCH_FLAG_FILE,
  UPDATE_TASK_FILE,
  DAEMON_LOCK_FILE,
  RUNNER_LOCK_FILE,
  LOG_FILE_PATH,
  VBS_FILE_PATH,
  UPDATE_RUNNER_VBS_PATH,
  CACHED_FRONTEND_SCRIPT_PATH,
  REG_RUN_KEY,
  REG_APPROVED_KEY,
  REG_VALUE_NAME,
  EXIT_CODE_NEED_ELEVATION,
  ensurePatchDataDir,
  appendLog,
  loadMergedConfig,
  saveUserConfig,
  getClientPaths,
};
