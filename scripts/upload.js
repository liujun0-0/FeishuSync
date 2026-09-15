import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import {
  readToken,
  getFileIdentity,
  hashFile,
  findDocIdByFile,
  canReuseDocByTitle,
} from '../api/helpers.js';
import { loadState, saveState } from '../api/sync-state.js';
import { classifyPathChange } from '../api/move-transaction.js';
import {
  createDocument,
  uploadMarkdownToDocument,
  findExistingDocByTitle,
  collectWikiDocNodes,
  createWikiNode,
  addDocToWiki,
  moveWikiNode,
  renameDocument,
  renameWikiNode,
} from '../api/feishu.js';

if (typeof fetch !== 'function') {
  console.error('This CLI requires Node.js 18+ (global fetch).');
  process.exit(1);
}

export async function main() {
  const config = await readConfig();
  const inputPathArg = process.argv[2];
  if (!inputPathArg) {
    console.error('Usage: npm run upload <markdown-file>');
    process.exit(1);
  }
  const inputPath = resolvePath(inputPathArg);

  let stat;
  try {
    stat = await fs.stat(inputPath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      // Deletion is handled by local-watch (pendingDelete → remote delete).
      console.log(`[upload] skip missing file: ${inputPath}`);
      return;
    }
    throw err;
  }

  if (stat.isDirectory()) {
    const entries = await fs.readdir(inputPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        process.argv[2] = path.join(inputPath, entry.name);
        await main();
        continue;
      }
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.md')) continue;
      const child = path.join(inputPath, entry.name);
      process.argv[2] = child;
      await main();
    }
    return;
  }

  const markdown = await fs.readFile(inputPath, 'utf8');
  const token = await readToken(resolvePath(requireConfigValue(config, 'tokenPath')));
  const spaceId = requireConfigValue(config, 'wikiSpaceId');
  const syncRoot = resolvePath(config.sync?.folderPath || 'wikid');
  const state = await loadState(syncRoot, '.feishu-sync.json');

  const titleMatch = markdown.match(/^#\s+(.+)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(inputPath, '.md');
  const rel = path.relative(syncRoot, inputPath).replaceAll('\\', '/');
  const identity = await getFileIdentity(inputPath);
  const currentHash = await hashFile(inputPath);

  const pathDocId = findDocIdByFile(state.docs || {}, rel);
  const identityEntry = identity
    ? Object.entries(state.docs || {}).find(([, e]) => e.identity === identity)
    : null;

  // Hash short-circuit: already tracked at this path with same content.
  if (pathDocId && state.docs[pathDocId]?.hash === currentHash && !state.docs[pathDocId]?.pendingDeleteAt) {
    console.log(`[upload] unchanged, skip: ${rel}`);
    return;
  }

  const parts = rel.split('/');
  parts.pop();
  let parentToken;
  if (parts.length) {
    const nodes = [];
    await collectWikiDocNodes(spaceId, token, undefined, nodes);
    let parentPath = '';
    for (const part of parts) {
      parentPath = parentPath ? `${parentPath}/${part}` : part;
      let hit = nodes.find((n) => n.path === parentPath || n.path?.endsWith(`/${parentPath}`));
      if (!hit) {
        const made = await createWikiNode(spaceId, token, part, parentToken);
        hit = { nodeToken: made.node_token };
      }
      parentToken = hit.nodeToken;
    }
  }

  let documentId = pathDocId || (identityEntry ? identityEntry[0] : null);
  let reusedExisting = false;
  let createdNew = false;

  const wikiMatch = !documentId ? await findExistingDocByTitle(spaceId, token, title) : null;
  if (!documentId && wikiMatch && canReuseDocByTitle(state.docs || {}, wikiMatch.docId, rel)) {
    console.log(`[upload] 复用现有飞书 doc: "${title}" (${wikiMatch.docId})`);
    documentId = wikiMatch.docId;
    reusedExisting = true;
  } else if (!documentId && wikiMatch && !canReuseDocByTitle(state.docs || {}, wikiMatch.docId, rel)) {
    console.warn(
      `[upload] wiki title "${title}" already tracked at "${state.docs[wikiMatch.docId]?.file}"; ` +
        `creating a distinct doc for ${rel}`
    );
  }

  if (!documentId) {
    const created = await createDocument(token, title);
    documentId = created.documentId;
    createdNew = true;
  }

  const moveKind = identityEntry
    ? classifyPathChange(
        {
          path: identityEntry[1].file,
          identity: identityEntry[1].identity,
          hash: identityEntry[1].hash,
        },
        { path: rel, identity, hash: currentHash }
      ).type
    : 'create';

  if (createdNew && parentToken) {
    await addDocToWiki(spaceId, token, documentId, parentToken);
  } else if (reusedExisting && parentToken) {
    await addDocToWiki(spaceId, token, documentId, parentToken).catch(() => {});
  }

  if (identityEntry || pathDocId) {
    const nodes = [];
    await collectWikiDocNodes(spaceId, token, undefined, nodes);
    const node = nodes.find((n) => n.documentId === documentId);
    if (parentToken && node?.nodeToken) {
      await moveWikiNode(spaceId, token, node.nodeToken, parentToken);
    }
    if (node?.title !== title) {
      await renameDocument(documentId, token, title);
      if (node?.nodeToken) await renameWikiNode(spaceId, token, node.nodeToken, title);
    }
  }

  try {
    await uploadMarkdownToDocument(documentId, token, markdown);
  } catch (err) {
    if (createdNew) {
      try {
        const { deleteRemoteDocument } = await import('../api/feishu.js');
        await deleteRemoteDocument(documentId, token, 'docx');
      } catch {}
    }
    throw err;
  }
  console.log(`Uploaded: ${title} -> ${documentId}`);
  state.spaceId = spaceId;
  const prev = state.docs[documentId] || {};
  state.docs[documentId] = {
    ...prev,
    file: rel,
    title,
    fileType: 'docx',
    identity,
    hash: currentHash,
    lastMove:
      identityEntry && moveKind === 'move'
        ? { from: identityEntry[1].file, to: rel, at: new Date().toISOString() }
        : prev.lastMove,
  };
  delete state.docs[documentId].pendingDeleteAt;
  await saveState(syncRoot, state, '.feishu-sync.json');
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}`) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}
