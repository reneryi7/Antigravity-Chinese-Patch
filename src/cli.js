#!/usr/bin/env node
/**
 * Antigravity 中文汉化补丁 v4.1 - 统一命令行调度中心 (CLI)
 *
 * 用法：
 *   node src/cli.js [install] [--dry-run] [--no-daemon] [--path="D:\..."]
 *   node src/cli.js uninstall [--path="D:\..."]
 *   node src/cli.js status | doctor [--path="D:\..."]
 *   node src/cli.js daemon [--once] [--live | --offline | --verify-live]
 */

'use strict';

const { installPatch, uninstallPatch, inspectStatus } = require('./core/patcher.js');
const { checkAndHealOnce } = require('./daemon/service.js');
const { appendLog } = require('./core/config.js');

function parseCliArgs(argv) {
  let command = 'install';
  let explicitPath = null;
  let explicitJunctionTarget = null;
  let dryRun = false;
  let noDaemon = false;
  let autoHealMode = false;
  let once = false;
  let isOffline = false;
  let isVerifyLive = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === 'install' || arg === 'uninstall' || arg === 'status' || arg === 'doctor' || arg === 'daemon') {
      command = arg;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--no-daemon') {
      noDaemon = true;
    } else if (arg === '--auto-heal') {
      autoHealMode = true;
    } else if (arg === '--once') {
      once = true;
    } else if (arg === '--offline') {
      isOffline = true;
    } else if (arg === '--verify-live') {
      isVerifyLive = true;
      once = true;
    } else if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg.startsWith('--path=')) {
      explicitPath = arg.slice('--path='.length).trim();
    } else if (arg === '--path' && argv[i + 1]) {
      explicitPath = argv[++i].trim();
    } else if (arg.startsWith('--junction-target=')) {
      explicitJunctionTarget = arg.slice('--junction-target='.length).trim();
    }
  }

  return {
    command,
    explicitPath,
    explicitJunctionTarget,
    dryRun,
    noDaemon,
    autoHealMode,
    once,
    isOffline,
    isVerifyLive,
    help,
  };
}

function printHelp() {
  console.log(`
Antigravity 中文汉化补丁 v4.1 CLI

常用命令:
  install.bat                        一键自动探测并安装中文汉化补丁（推荐）
  uninstall.bat                      一键卸载中文补丁并恢复官方英文原版

高级参数:
  node src/cli.js install            安装汉化补丁并启用更新自愈守护
  node src/cli.js install --no-daemon  仅静态注入汉化，不注册后台自愈守护进程
  node src/cli.js install --dry-run    纯内存模拟构建与完整性验证（不修改任何文件）
  node src/cli.js install --path="D:\\Apps\\Antigravity"  手动指定客户端安装目录
  node src/cli.js status             查看客户端版本、汉化状态与守护进程健康体检报告
  node src/cli.js uninstall          彻底卸载汉化补丁与后台守护服务
`);
}

async function run() {
  const opts = parseCliArgs(process.argv.slice(2));

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  if (opts.command === 'status' || opts.command === 'doctor') {
    inspectStatus({ explicitPath: opts.explicitPath });
    process.exit(0);
  }

  if (opts.command === 'uninstall') {
    const res = uninstallPatch({ explicitPath: opts.explicitPath });
    process.exit(res.exitCode || 0);
  }

  if (opts.command === 'daemon') {
    if (opts.once) {
      await checkAndHealOnce({
        allowLiveHotInject: !opts.isOffline,
        verifyLiveOnly: opts.isVerifyLive,
      });
      process.exit(0);
    }
    appendLog('Node 常驻守护模式已启动');
    await checkAndHealOnce({ allowLiveHotInject: true }).catch(() => {});
    setInterval(() => {
      checkAndHealOnce({ allowLiveHotInject: true }).catch(() => {});
    }, 10000);
    return;
  }

  const res = await installPatch({
    dryRun: opts.dryRun,
    noDaemon: opts.noDaemon,
    autoHealMode: opts.autoHealMode,
    explicitPath: opts.explicitPath,
    explicitJunctionTarget: opts.explicitJunctionTarget,
  });
  process.exit(res.exitCode || 0);
}

if (require.main === module) {
  run().catch((err) => {
    appendLog(`CLI 运行异常: ${err.message}`);
    console.error('运行出错:', err.message || err);
    process.exit(1);
  });
}

module.exports = { parseCliArgs, run };
