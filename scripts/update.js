import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import {
  readToken,
  hashFile,
  readManifest,
  writeManifest,
  sanitizeFilename,
  ensurePosixPath,
  ensureUniqueFilePath,
  buildConflictPath,
  resolveFileType,
} from '../api/helpers.js';
import {
  deleteRemoteDocument,
  collectWikiDocNodes,
  collectWikiNodePaths,
  createWikiNode,
  fetchDocumentMeta,
  fetchWikiNodes,
  downloadDocumentToFile,
  uploadMarkdownToDocument,
  createDocumentFromMarkdown,
  moveDocumentToWiki,
} from '../api/feishu.js';

if (typeof fetch !== 'function') {
  console.error('This CLI requires Node.js 18+ (global fetch).');
  process.exit(1);
}

const MANIFEST_NAME = '.feishu-sync.json';

function expandHomeDir(inputPath) {
  if (!inputPath) return inputPath;
  if (inputPath === '~') return process.env.HOME || inputPath;
  if (inputPath.startsWith('~/')) {
    const home = process.env.HOME || '';
    return path.join(home, inputPath.slice(2));
  }
  return inputPath;
}

function isMarkdownFile(entry) {
  return entry.toLowerCase().endsWith('.md');
}

// Resolve a local subdirectory (array of title segments) to a wiki node_token.
// Any missing prefix in the wiki is created on the fly as a container node,
// so that a brand-new local folder "A/B/C" yields a corresponding wiki path.
async function ensureParentPath(spaceId, token, segs, wikiPathIndex) {
  let currentParent = null;
  let accumulated = [];
  for (const title of segs) {
    accumulated.push(title);
    const candidate = accumulated.join('/');
    let hit = wikiPathIndex.get(candidate);
    if (!hit) {
      try {
        const node = await createWikiNode(spaceId, token, title, currentParent);
        hit = { title, nodeToken: node.node_token, parentNodeToken: currentParent };
        // Record both key shapes so subsequent lookups in this run hit the cache.
        wikiPathIndex.set(candidate, hit);
        if (accumulated.length > 1) {
          wikiPathIndex.set(accumulated.slice(1).join('/'), hit);
        }
        console.log(`[upload] created wiki container "${candidate}"`);
      } catch (err) {
        console.error(
          `[upload] failed to create wiki container "${candidate}": ${err.message || err}`
        );
        return null;
      }
    }
    currentParent = hit.nodeToken;
  }
  return currentParent;
}

async function listMarkdownFiles(rootDir, manifestName) {
  const files = [];
  const skipDirs = new Set(['.git', 'node_modules']);

  const walk = async (dir) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === manifestName) continue;
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        await walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.isFile()) continue;
      if (!isMarkdownFile(entry.name)) continue;
      if (entry.name.endsWith('.remote.md')) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = ensurePosixPath(path.relative(rootDir, fullPath));
      files.push({ fullPath, relPath });
    }
  };

  await walk(rootDir);
  return files;
}

async function deleteLocalFile(filePath) {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    if (err && err.code === 'ENOENT') return false;
    throw err;
  }
}



async function main() {
  const config = await readConfig();
  const spaceId = requireConfigValue(config, 'wikiSpaceId');
  const folderInput = requireConfigValue(config, 'sync.folderPath');
  const manifestName = MANIFEST_NAME;
  const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));

  const resolvedFolder = path.resolve(expandHomeDir(folderInput));
  await fs.mkdir(resolvedFolder, { recursive: true });

  const token = await readToken(tokenPath);
  const manifest = await readManifest(resolvedFolder, manifestName);
  const manifestDocs = manifest.docs || {};
  manifest.spaceId = spaceId;

  const localFiles = await listMarkdownFiles(resolvedFolder, manifestName);
  const localMap = new Map();
  for (const file of localFiles) {
    const hash = await hashFile(file.fullPath);
    localMap.set(file.relPath, { ...file, hash });
  }

  const wikiDocs = [];
  await collectWikiDocNodes(spaceId, token, undefined, wikiDocs);

  // Build a parentPath lookup keyed by obj_token (documentId). We'll use it
  // when downloading new remote docs to mirror their wiki subdirectory
  // structure locally instead of dumping everything at the root.
  const wikiTree = await collectWikiNodePaths(spaceId, token);
  const parentPathByObjToken = new Map();
  async function indexPaths(parentNodeToken, segments) {
    const children = await fetchWikiNodes(spaceId, token, parentNodeToken);
    for (const c of children) {
      const next = [...segments, c.title || ''];
      parentPathByObjToken.set(c.obj_token, next.slice(0, -1).join('/'));
      if (c.has_child) await indexPaths(c.node_token, next);
    }
  }
  await indexPaths(undefined, []);

  const remoteDocs = [];
  for (const node of wikiDocs) {
    const meta = await fetchDocumentMeta(node.documentId, token);
    remoteDocs.push({
      documentId: node.documentId,
      nodeToken: node.nodeToken,
      title: meta.title || node.title || '',
      parentPath: parentPathByObjToken.get(node.documentId) || '',
      revisionId: meta.revision_id ?? meta.revisionId ?? null,
      fileType: node.objType || 'docx',
    });
  }

  // Build a map of wiki-node paths so we can resolve local subdirectories
  // (e.g. "飞书深诺技术文档/飞书深诺产品文档") to the right parent node_token
  // when uploading new local files.
  const wikiPathIndex = await collectWikiNodePaths(spaceId, token);

  const remoteMap = new Map(remoteDocs.map((doc) => [doc.documentId, doc]));
  const usedPaths = new Set(localFiles.map((file) => file.relPath));
  for (const entry of Object.values(manifestDocs)) {
    if (entry && entry.file) {
      usedPaths.add(entry.file);
    }
  }

  let downloaded = 0;
  let uploaded = 0;
  let conflicts = 0;
  let skipped = 0;
  let deletedLocal = 0;
  let deletedRemote = 0;
  let movedRemote = 0;

  for (const doc of remoteDocs) {
    const existing = manifestDocs[doc.documentId];
    const baseName = sanitizeFilename(doc.title) || doc.documentId;
    // Build the desired relative path: include the wiki parent path so the
    // local file ends up in a subdirectory mirroring the Feishu tree.
    const desiredRelative = doc.parentPath
      ? `${doc.parentPath}/${baseName}.md`
      : `${baseName}.md`;
    let fileRel = existing?.file;
    const renameCandidates = new Set(usedPaths);
    if (fileRel) {
      renameCandidates.delete(fileRel);
    }
    const desiredRel = await ensureUniqueFilePath(
      resolvedFolder,
      desiredRelative,
      renameCandidates
    );
    if (!fileRel) {
      fileRel = desiredRel;
    } else if (desiredRel && desiredRel !== fileRel) {
      const oldRel = fileRel;
      const oldInfo = localMap.get(oldRel);
      const oldAbs = path.join(resolvedFolder, oldRel);
      const newAbs = path.join(resolvedFolder, desiredRel);
      if (oldInfo) {
        try { await fs.rename(oldAbs, newAbs); } catch {}
        localMap.delete(oldRel);
        localMap.set(desiredRel, { ...oldInfo, relPath: desiredRel, fullPath: newAbs });
      }
      usedPaths.delete(oldRel);
      usedPaths.add(desiredRel);
      fileRel = desiredRel;
      if (existing) {
        existing.file = fileRel;
      }
    }

    const fileAbs = path.join(resolvedFolder, fileRel);
    const localInfo = localMap.get(fileRel);
    const localExists = Boolean(localInfo);

    if (!existing) {
      const hash = await downloadDocumentToFile(
        doc.documentId,
        token,
        {
          document_id: doc.documentId,
          revision_id: doc.revisionId,
          title: doc.title,
        },
        fileAbs
      );
      manifestDocs[doc.documentId] = {
        file: fileRel,
        revisionId: doc.revisionId,
        title: doc.title,
        fileType: resolveFileType(doc),
        hash,
      };
      usedPaths.add(fileRel);
      localMap.set(fileRel, { fullPath: fileAbs, relPath: fileRel, hash });
      downloaded += 1;
      continue;
    }

    if (!localExists) {
      await deleteRemoteDocument(doc.documentId, token, resolveFileType(doc, existing));
      delete manifestDocs[doc.documentId];
      deletedRemote += 1;
      continue;
    }

    const localChanged =
      existing.hash && localInfo.hash && existing.hash !== localInfo.hash;
    const remoteChanged =
      existing.revisionId && doc.revisionId && existing.revisionId !== doc.revisionId;

    if (remoteChanged && localChanged) {
      const conflictRel = buildConflictPath(fileRel);
      const conflictAbs = path.join(resolvedFolder, conflictRel);
      await downloadDocumentToFile(
        doc.documentId,
        token,
        {
          document_id: doc.documentId,
          revision_id: doc.revisionId,
          title: doc.title,
        },
        conflictAbs
      );
      conflicts += 1;
      continue;
    }

    if (remoteChanged && !localChanged) {
      const hash = await downloadDocumentToFile(
        doc.documentId,
        token,
        {
          document_id: doc.documentId,
          revision_id: doc.revisionId,
          title: doc.title,
        },
        fileAbs
      );
      manifestDocs[doc.documentId] = {
        ...existing,
        file: fileRel,
        revisionId: doc.revisionId,
        title: doc.title,
        fileType: resolveFileType(doc, existing),
        hash,
      };
      localMap.set(fileRel, { ...localInfo, hash });
      downloaded += 1;
      continue;
    }

    if (localChanged && !remoteChanged) {
      const markdown = await fs.readFile(localInfo.fullPath, 'utf8');
      await uploadMarkdownToDocument(doc.documentId, token, markdown);
      const meta = await fetchDocumentMeta(doc.documentId, token);
      manifestDocs[doc.documentId] = {
        ...existing,
        file: fileRel,
        revisionId: meta.revision_id ?? meta.revisionId ?? doc.revisionId,
        title: meta.title || doc.title,
        fileType: resolveFileType(doc, existing),
        hash: localInfo.hash,
      };
      uploaded += 1;
      continue;
    }

    // Local file moved to a different subdirectory but hash/revision are
    // unchanged. Mirror the move to Feishu so the doc ends up in the right
    // container. We compare the local subdirectory with the doc's wiki
    // parent path; if they differ, call move_docs_to_wiki.
    if (!localChanged && !remoteChanged) {
      const localDir = path.posix.dirname(fileRel);
      const remoteDir = doc.parentPath || '';
      if (localDir !== remoteDir && doc.nodeToken) {
        let parentToken = null;
        if (localDir) {
          const segs = localDir.split('/');
          parentToken = await ensureParentPath(spaceId, token, segs, wikiPathIndex);
        }
        if (parentToken !== null) {
          try {
            await moveDocumentToWiki(spaceId, token, doc.documentId, parentToken);
            console.log(`[move] ${doc.title} -> ${localDir || '<wiki root>'}`);
            movedRemote += 1;
          } catch (err) {
            console.error(`[move] failed for ${doc.title}: ${err.message || err}`);
          }
        }
      }
    }

    manifestDocs[doc.documentId] = {
      ...existing,
      file: fileRel,
      revisionId: doc.revisionId,
      title: doc.title,
      fileType: resolveFileType(doc, existing),
      hash: localInfo.hash || existing.hash,
    };
    skipped += 1;
  }

  for (const [docId, entry] of Object.entries({ ...manifestDocs })) {
    if (remoteMap.has(docId)) continue;
    const fileRel = entry.file;
    if (!fileRel) {
      delete manifestDocs[docId];
      continue;
    }
    const localInfo = localMap.get(fileRel);
    if (localInfo) {
      await deleteLocalFile(localInfo.fullPath);
      localMap.delete(fileRel);
      deletedLocal += 1;
    }
    delete manifestDocs[docId];
  }

  const fileToDoc = new Map();
  for (const [docId, entry] of Object.entries(manifestDocs)) {
    if (entry.file) fileToDoc.set(entry.file, docId);
  }

  for (const [fileRel, localInfo] of localMap.entries()) {
    if (fileToDoc.has(fileRel)) continue;
    const markdown = await fs.readFile(localInfo.fullPath, 'utf8');

    // Resolve parent wiki node from the file's local subdirectory.
    // fileRel looks like "飞书深诺技术文档/飞书深诺产品文档/new.md" or just "new.md".
    // The parent path segments (everything except the basename) are looked up
    // in the wiki path index by title sequence. If any prefix doesn't exist
    // in the wiki, we create it as a new container node on the fly.
    const segs = fileRel.split('/');
    segs.pop(); // drop filename
    let parentWikiToken;
    if (segs.length > 0) {
      parentWikiToken = await ensureParentPath(spaceId, token, segs, wikiPathIndex);
      if (!parentWikiToken) {
        console.warn(
          `[upload] could not resolve parent for local subdirectory "${segs.join('/')}"; uploading to root`
        );
      }
    }

    const newDocId = await createDocumentFromMarkdown(
      spaceId,
      token,
      markdown,
      parentWikiToken
    );
    const meta = await fetchDocumentMeta(newDocId, token);
    manifestDocs[newDocId] = {
      file: fileRel,
      revisionId: meta.revision_id ?? meta.revisionId ?? null,
      title: meta.title || '',
      fileType: 'docx',
      hash: localInfo.hash,
    };
    uploaded += 1;
  }

  await writeManifest(resolvedFolder, { spaceId, docs: manifestDocs }, manifestName);

  console.log(
    `Sync complete. Downloaded: ${downloaded}, Uploaded: ${uploaded}, Moved Remote: ${movedRemote}, Deleted Local: ${deletedLocal}, Deleted Remote: ${deletedRemote}, Conflicts: ${conflicts}, Skipped: ${skipped}`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
