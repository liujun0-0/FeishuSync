import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeThreeWay } from '../api/merge.js';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  PENDING_DELETE_GRACE_MS,
  checkPendingDelete,
  removeEmptyParentDirs,
} from '../api/helpers.js';

test('pending delete requires a continuous seven-day absence', () => {
  const now = Date.parse('2026-09-15T00:00:00.000Z');
  const entry = {};
  assert.equal(checkPendingDelete(entry, now), 'marked');
  assert.equal(entry.pendingDeleteAt, '2026-09-15T00:00:00.000Z');
  assert.equal(checkPendingDelete(entry, now + PENDING_DELETE_GRACE_MS - 1), 'waiting');
  assert.equal(checkPendingDelete(entry, now + PENDING_DELETE_GRACE_MS), 'expired');
});

test('invalid or future pending timestamps restart the safety window', () => {
  const now = Date.parse('2026-09-15T00:00:00.000Z');
  for (const pendingDeleteAt of ['invalid', '2026-09-16T00:00:00.000Z']) {
    const entry = { pendingDeleteAt };
    assert.equal(checkPendingDelete(entry, now), 'marked');
    assert.equal(entry.pendingDeleteAt, '2026-09-15T00:00:00.000Z');
  }
});

test('empty-directory cleanup is bounded by root and stops at non-empty parent', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'feishu-sync-safety-'));
  try {
    const leaf = path.join(root, 'a', 'b');
    await fs.mkdir(leaf, { recursive: true });
    await fs.writeFile(path.join(root, 'a', 'keep.md'), '# keep');
    const removed = await removeEmptyParentDirs(leaf, root);
    assert.deepEqual(removed, [leaf]);
    await fs.access(path.join(root, 'a'));
    await fs.access(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('empty-directory cleanup never removes the sync root', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'feishu-sync-root-'));
  try {
    const leaf = path.join(root, 'a', 'b');
    await fs.mkdir(leaf, { recursive: true });
    await removeEmptyParentDirs(leaf, root);
    await fs.access(root);
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});

test('three-way merge chooses the side that changed', () => {
  assert.deepEqual(mergeThreeWay('base', 'base', 'remote'), { merged: 'remote', hasConflicts: false });
  assert.deepEqual(mergeThreeWay('base', 'local', 'base'), { merged: 'local', hasConflicts: false });
  assert.equal(mergeThreeWay('base', 'local', 'remote').hasConflicts, true);
});
