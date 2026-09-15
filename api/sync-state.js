// Centralized synchronization state facade. Keeping this boundary small lets
// upload-only and bidirectional engines share the same durable state safely.
import path from 'node:path';
import { readManifest, writeManifest } from './helpers.js';

export function statePath(rootDir, manifestName = '.feishu-sync.json') {
  return path.join(rootDir, manifestName);
}

export async function loadState(rootDir, manifestName) {
  return readManifest(rootDir, manifestName);
}

export async function saveState(rootDir, state, manifestName) {
  return writeManifest(rootDir, state, manifestName);
}

export function ensureDocState(entry = {}) {
  return {
    ...entry,
    pendingDeleteAt: entry.pendingDeleteAt || undefined,
    lastConflict: entry.lastConflict || undefined,
    identity: entry.identity || null,
  };
}
