import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import Lark from '@larksuiteoapi/node-sdk';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import {
  readToken,
  readManifest,
  resolveSyncFolder,
  pickAppCredentials,
  normalizeLoggerLevel,
  normalizeFileTypes,
  startLocalWatcher,
  resolveFileType,
} from '../api/helpers.js';
import {
  subscribeToDocEvents,
  createChangeProcessor,
  syncNewDocsFromWiki,
  setTokenReloader,
} from '../api/feishu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (typeof fetch !== 'function') {
  console.error('This CLI requires Node.js 18+ (global fetch).');
  process.exit(1);
}

const SYNC_DEFAULTS = {
  manifestName: '.feishu-sync.json',
  logEvents: false,
  loggerLevel: 'info',
  debounceMs: 3000,
  dedupeWindowMs: 600000,
  localIgnoreWindowMs: 2000,
  fileTypes: ['doc', 'docx'],
  subscribeEvents: true,
  eventTypes: [
    'drive.file.created_in_folder_v1',
    'drive.file.edit_v1',
    'drive.file.title_updated_v1',
    'drive.file.trashed_v1',
  ],
};

function requireBoolean(config, keyPath) {
  const value = requireConfigValue(config, keyPath);
  if (typeof value !== 'boolean') {
    throw new Error(`Expected ${keyPath} to be a boolean in config.json.`);
  }
  return value;
}

function requirePositiveNumber(config, keyPath) {
  const raw = requireConfigValue(config, keyPath);
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Expected ${keyPath} to be a positive number in config.json.`);
  }
  return value;
}

async function main() {
  const config = await readConfig();
  const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));
  const spaceId = requireConfigValue(config, 'wikiSpaceId');
  const folderInput = requireConfigValue(config, 'sync.folderPath');
  const manifestName = SYNC_DEFAULTS.manifestName;
  const rootDir = resolveSyncFolder(folderInput);
  await fs.mkdir(rootDir, { recursive: true });
  const token = await readToken(tokenPath);

  // Token 热更新：auth 进程每 ~96 分钟自动刷新 token 并写回文件。
  // 常驻 sync 拿的是启动时的旧 token，全部 API 调用会撞 99991677。
  // 注册 reloader 后，apiRequest 遇到 token 失效会自动重读文件重试，
  // 不再需要重启进程（也不再触发昨天那种崩溃循环）。
  setTokenReloader(() => readToken(tokenPath));

  const { appId, appSecret } = pickAppCredentials(config);

  const debounceMs = SYNC_DEFAULTS.debounceMs;
  const dedupeWindowMs = SYNC_DEFAULTS.dedupeWindowMs;
  const localIgnoreWindowMs = SYNC_DEFAULTS.localIgnoreWindowMs;
  const logEvents = SYNC_DEFAULTS.logEvents;
  const fileTypes = normalizeFileTypes(SYNC_DEFAULTS.fileTypes);
  const subscribeEvents = SYNC_DEFAULTS.subscribeEvents;
  const pollIntervalSecondsRaw = requireConfigValue(
    config,
    'sync.pollIntervalSeconds'
  );
  const pollDisabled =
    pollIntervalSecondsRaw === false ||
    pollIntervalSecondsRaw === 0 ||
    pollIntervalSecondsRaw === '0';
  const pollIntervalSeconds = pollDisabled
    ? 0
    : requirePositiveNumber(config, 'sync.pollIntervalSeconds');

  const eventTypes = SYNC_DEFAULTS.eventTypes;

  const loggerLevel = normalizeLoggerLevel(
    SYNC_DEFAULTS.loggerLevel,
    Lark.LoggerLevel
  );
  const initialSync = requireBoolean(config, 'sync.initialSync');

  let ignoreLocalChanges = false;
  const subscribedDocs = new Set();
  const subscribeToDocument = async (docId, fileType) => {
    if (!subscribeEvents) return;
    if (!docId) return;
    if (subscribedDocs.has(docId)) return;
    const normalizedType = fileType ? String(fileType).toLowerCase() : 'docx';
    if (fileTypes && !fileTypes.has(normalizedType)) return;
    try {
      await subscribeToDocEvents(docId, token, normalizedType);
      subscribedDocs.add(docId);
      if (logEvents) {
        console.log(`[realtime-sync] subscribed ${docId} (${normalizedType})`);
      }
    } catch (err) {
      console.warn(
        `[realtime-sync] subscribe failed for ${docId}: ${err.message || err}`
      );
    }
  };

  const subscribeManifestDocs = async () => {
    if (!subscribeEvents) return;
    const manifest = await readManifest(rootDir, manifestName);
    const entries = Object.entries(manifest.docs || {});
    for (const [docId, entry] of entries) {
      await subscribeToDocument(docId, resolveFileType(null, entry));
    }
    if (logEvents) {
      console.log(`[realtime-sync] subscription scan complete (${entries.length} docs)`);
    }
  };

  const runFullSync = async (reason) => {
    const reasonText = reason ? ` (${reason})` : '';
    console.log(`[realtime-sync] running full sync${reasonText}`);
    const result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [path.join(__dirname, 'update.js')], {
        stdio: 'inherit',
        windowsHide: true,
      });
      child.on('error', (err) => {
        console.error(`[realtime-sync] full sync failed: ${err.message || err}`);
      });
      child.on('exit', (code, signal) => {
        resolve({ code, signal });
      });
    });
    const status =
      result.code === 0
        ? 'completed'
        : `failed (code ${result.code ?? 'unknown'}, signal ${result.signal ?? 'none'})`;
    console.log(`[realtime-sync] full sync ${status}`);
    if (result.code === 0) {
      await subscribeManifestDocs();
    }
  };

  // Guard against concurrent full syncs: a websocket edit event AND the
  // 5-minute revision fallback may fire at the same time, and update.js
  // mutates the manifest — two concurrent runs would race.
  let updateRunning = false;
  const runFullSyncGuarded = async (reason) => {
    if (updateRunning) {
      console.log(`[realtime-sync] update already running; skip (${reason})`);
      return;
    }
    updateRunning = true;
    try {
      await runFullSync(reason);
    } finally {
      updateRunning = false;
    }
  };

  const pollForNewDocs = async () => {
    ignoreLocalChanges = true;
    try {
      await syncNewDocsFromWiki({
        rootDir,
        spaceId,
        token,
        logEvents,
        subscribeToDocument,
        manifestName,
      });
    } finally {
      ignoreLocalChanges = false;
    }
  };

  const startPolling = () => {
    if (pollDisabled || !pollIntervalSeconds) return;
    let running = false;
    const intervalMs = pollIntervalSeconds * 1000;
    setInterval(() => {
      if (running) return;
      running = true;
      pollForNewDocs()
        .catch((err) => {
          console.error(`[realtime-sync] poll sync failed: ${err.message || err}`);
        })
        .finally(() => {
          running = false;
        });
    }, intervalMs);
    console.log(`[realtime-sync] polling every ${pollIntervalSeconds}s`);
  };

  const {
    handleEvent,
    handleLocalChange,
    getLastProcessCompletedAt,
    isProcessing,
    processPending,
  } = createChangeProcessor({
    token,
    spaceId,
    rootDir,
    debounceMs,
    dedupeWindowMs,
    logEvents,
    fileTypes,
    runFullSync: runFullSyncGuarded,
    subscribeToDocument,
    manifestName,
  });

  if (initialSync) {
    await runFullSync('startup');
  }

  await subscribeManifestDocs();
  startPolling();

  // === Fallback revision check (in case WS events are missed) ===
  // The websocket subscription requires the Feishu Developer Console to
  // be configured for long-connection events; if it isn't, edit events
  // never reach this process. Every 5 minutes, run update.js to compare
  // each doc's revisionId against the manifest and pull any changes.
  const REV_CHECK_MS = 60 * 1000;
  setInterval(() => {
    runFullSyncGuarded('revision-check').catch((err) => {
      console.error(`[realtime-sync] revision check failed: ${err.message || err}`);
    });
  }, REV_CHECK_MS);
  console.log(`[realtime-sync] revision fallback every ${REV_CHECK_MS / 1000}s`);

  startLocalWatcher(rootDir, {
    onChange: handleLocalChange,
    logEvents,
    localIgnoreWindowMs,
    getLastProcessCompletedAt,
    isProcessing,
    shouldIgnoreLocal: () => ignoreLocalChanges,
    manifestName,
  });

  const wsClient = new Lark.WSClient({
    appId,
    appSecret,
    loggerLevel,
  });

  const dispatcher = new Lark.EventDispatcher({ loggerLevel });
  const handlers = {};
  for (const eventType of eventTypes) {
    handlers[eventType] = async (data) => handleEvent(eventType, data);
  }
  dispatcher.register(handlers);

  console.log('[realtime-sync] websocket client starting');
  await wsClient.start({ eventDispatcher: dispatcher });
}

// Global error handlers — prevent V8/libuv assertion crashes from killing the
// sync process. When token expires mid-fetch, the cleanup of async handles can
// trigger `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` which would
// otherwise kill the entire process. These handlers swallow such errors and
// keep sync alive; the next poll cycle will recover.
process.on('uncaughtException', (err) => {
  console.error('[realtime-sync] uncaughtException (swallowed):', err && (err.message || err));
});
process.on('unhandledRejection', (reason) => {
  const msg = reason && (reason.message || reason) || 'unknown';
  console.error('[realtime-sync] unhandledRejection (swallowed):', msg);
});

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
