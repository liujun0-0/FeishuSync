import path from 'node:path';
import { spawn } from 'node:child_process';
import { readConfig, resolveSyncFolder, startLocalWatcher, shouldSyncLocalPath } from '../api/helpers.js';

const config = await readConfig();
const rootDir = resolveSyncFolder(config.sync?.folderPath || 'wikid');
let running = false;
let queued = null;

function run(fileRel) {
  if (!fileRel || !shouldSyncLocalPath(fileRel, '.feishu-sync.json')) return;
  const abs = path.join(rootDir, fileRel);
  if (running) { queued = abs; return; }
  running = true;
  const child = spawn(process.execPath, [path.join(process.cwd(), 'scripts', 'local-upload-worker.js'), abs], { stdio: 'inherit', windowsHide: true });
  child.on('exit', () => { running = false; if (queued) { const next = queued; queued = null; run(path.relative(rootDir, next).replaceAll('\\', '/')); } });
}

startLocalWatcher(rootDir, { onChange: run, localIgnoreWindowMs: 5000, manifestName: '.feishu-sync.json' });
console.log(`[local-watch] watching ${rootDir}`);
