import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken, getFileIdentity, hashFile } from '../api/helpers.js';
import { loadState, saveState } from '../api/sync-state.js';
import { classifyPathChange } from '../api/move-transaction.js';
import { createDocument, uploadMarkdownToDocument, findExistingDocByTitle, collectWikiDocNodes, createWikiNode, addDocToWiki, moveWikiNode } from '../api/feishu.js';

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
  const stat = await fs.stat(inputPath);
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

  // 从 markdown 提取 H1 标题作为飞书文档标题
  const titleMatch = markdown.match(/^#\s+(.+)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : path.basename(inputPath, '.md');
  const rel = path.relative(syncRoot, inputPath).replaceAll('\\', '/');
  const identity = await getFileIdentity(inputPath);
  const parts = rel.split('/'); parts.pop();
  let parentToken;
  if (parts.length) {
    const nodes=[]; await collectWikiDocNodes(spaceId, token, undefined, nodes);
    let parentPath='';
    for (const part of parts) {
      parentPath = parentPath ? `${parentPath}/${part}` : part;
      let hit = nodes.find(n => n.path === parentPath || n.path?.endsWith(`/${parentPath}`));
      if (!hit) { const made=await createWikiNode(spaceId, token, part, parentToken); hit={nodeToken:made.node_token}; }
      parentToken=hit.nodeToken;
    }
  }

  // 去重：上传前先查 wiki 里有没有同名 doc
  // 找到则复用现有 doc 并更新内容（避免反复创建 import-mt* 残留）
  const existing = await findExistingDocByTitle(spaceId, token, title);
  let documentId;
  const identityEntry = identity && Object.entries(state.docs || {}).find(([, e]) => e.identity === identity);
  const currentHash = await hashFile(inputPath);
  const moveKind = identityEntry
    ? classifyPathChange(
      { path: identityEntry[1].file, identity: identityEntry[1].identity, hash: identityEntry[1].hash },
      { path: rel, identity, hash: currentHash },
    ).type
    : 'create';
  if (identityEntry) documentId = identityEntry[0];
  if (existing && !identityEntry) {
    console.log(`[upload] 复用现有飞书 doc: "${title}" (${existing.docId})`);
    documentId = existing.docId;
  } else if (!documentId) {
    // 创建新文档（用 H1 标题）
    const created = await createDocument(token, title);
    documentId = created.documentId;
  }
  if (!existing && parentToken) await addDocToWiki(spaceId, token, documentId, parentToken);
  if (identityEntry && parentToken) {
    const nodes=[]; await collectWikiDocNodes(spaceId, token, undefined, nodes);
    const node=nodes.find(n=>n.documentId===documentId);
    if (node?.nodeToken) await moveWikiNode(spaceId, token, node.nodeToken, parentToken);
  }

  // 用 block-by-block 路径上传（走我们的 mermaid→block_type=40 代码）
  // 失败时清理空 doc（如果是新建的），避免留下半成品
  try {
    await uploadMarkdownToDocument(documentId, token, markdown);
  } catch (err) {
    if (!existing) {
      try {
        const { deleteRemoteDocument } = await import('../api/feishu.js');
        await deleteRemoteDocument(documentId, token, 'docx');
      } catch {}
    }
    throw err;
  }
  console.log(`Uploaded: ${title} -> ${documentId}`);
  state.spaceId = spaceId;
  state.docs[documentId] = {
    ...(state.docs[documentId] || {}),
    file: path.relative(syncRoot, inputPath).replaceAll('\\', '/'),
    title,
    fileType: 'docx',
    identity,
    hash: currentHash,
    lastMove: identityEntry && moveKind === 'move'
      ? { from: identityEntry[1].file, to: rel, at: new Date().toISOString() }
      : undefined,
  };
  await saveState(syncRoot, state, '.feishu-sync.json');
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}`) {
  main().catch((err) => { console.error(err.message || err); process.exit(1); });
}
