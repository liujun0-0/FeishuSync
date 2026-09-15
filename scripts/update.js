import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import {
  readToken,
  isTokenExpired,
  hashFile,
  readManifest,
  writeManifest,
  sanitizeFilename,
  ensurePosixPath,
  ensureUniqueFilePath,
  buildConflictPath,
  resolveFileType,
  removeEmptyParentDirs,
  checkPendingDelete,
  getFileIdentity,
} from '../api/helpers.js';
import {
  deleteRemoteDocument,
  collectWikiDocNodes,
  createWikiNode,
  fetchDocumentMeta,
  fetchChildrenCount,
  fetchAllBlocks,
  downloadDocumentToFile,
  uploadMarkdownToDocument,
  createDocumentFromMarkdown,
  moveWikiNode,
} from '../api/feishu.js';
import { feishuToMarkdown } from '../api/feishu-md.js';
import { mergeRemoteIntoLocal } from '../api/merge.js';

if (typeof fetch !== 'function') {
  console.error('This CLI requires Node.js 18+ (global fetch).');
  process.exit(1);
}

const MANIFEST_NAME = '.feishu-sync.json';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readFreshToken(tokenPath) {
  for (;;) {
    const token = await readToken(tokenPath);
    if (!isTokenExpired(token)) return token;
    console.log('[update] token file is expired; waiting for auth refresh...');
    await sleep(1000);
  }
}

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
  const skipDirs = new Set(['.git', 'node_modules', '.feishu-sync-soft-trash']);

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
  // --prefer-local: when both the local file and the remote doc changed
  // (a conflict), overwrite Feishu with the local .md instead of stopping
  // at the safety net. The remote version is still saved as *.remote.md
  // before the upload so nothing is lost. Use this when you know your local
  // copy is the one you want to keep.
  const preferLocal = process.argv.includes('--prefer-local');
  if (preferLocal) {
    console.log('[prefer-local] conflicts will overwrite Feishu with the local .md (remote version is saved as *.remote.md first)');
  }

  const config = await readConfig();
  const spaceId = requireConfigValue(config, 'wikiSpaceId');
  const folderInput = requireConfigValue(config, 'sync.folderPath');
  const manifestName = MANIFEST_NAME;
  const tokenPath = resolvePath(requireConfigValue(config, 'tokenPath'));

  const resolvedFolder = path.resolve(expandHomeDir(folderInput));
  await fs.mkdir(resolvedFolder, { recursive: true });

  const token = await readFreshToken(tokenPath);
  const manifest = await readManifest(resolvedFolder, manifestName);
  const manifestDocs = manifest.docs || {};
  manifest.spaceId = spaceId;

  const localFiles = await listMarkdownFiles(resolvedFolder, manifestName);
  console.log(`[update] local markdown files: ${localFiles.length}`);
  const localMap = new Map();
  for (const file of localFiles) {
    const hash = await hashFile(file.fullPath);
    const identity = await getFileIdentity(file.fullPath);
    localMap.set(file.relPath, { ...file, hash, identity });
  }

  const wikiDocs = [];
  console.log('[update] collecting wiki document nodes...');
  await collectWikiDocNodes(spaceId, token, undefined, wikiDocs);
  console.log(`[update] wiki document nodes: ${wikiDocs.length}`);
  const syncableWikiDocs = wikiDocs.filter((node) => {
    const nodePath = node.path || '';
    const title = node.title || '';
    return nodePath !== '.feishu-sync-soft-trash'
      && !nodePath.startsWith('.feishu-sync-soft-trash/')
      && title !== '.feishu-sync-soft-trash'
      && title !== 'feishu-sync-soft-trash';
  });
  const skippedSoftTrashRemote = wikiDocs.length - syncableWikiDocs.length;
  if (skippedSoftTrashRemote > 0) {
    console.log(`[update] skipped remote soft-trash nodes: ${skippedSoftTrashRemote}`);
  }

  const wikiPathIndex = new Map();
  for (const node of syncableWikiDocs) {
    if (!node.hasChild || !node.nodeToken || !node.path) continue;
    wikiPathIndex.set(node.path, {
      title: node.title,
      nodeToken: node.nodeToken,
      parentNodeToken: node.parentNodeToken,
    });
    const parts = node.path.split('/');
    if (parts.length > 1) {
      wikiPathIndex.set(parts.slice(1).join('/'), {
        title: node.title,
        nodeToken: node.nodeToken,
        parentNodeToken: node.parentNodeToken,
      });
    }
  }
  console.log(`[update] indexed wiki container paths: ${wikiPathIndex.size}`);
  const existingFileToDoc = new Map();
  for (const [docId, entry] of Object.entries(manifestDocs)) {
    if (entry.file) existingFileToDoc.set(entry.file, docId);
  }
  const remoteExistingPaths = new Set();
  for (const node of syncableWikiDocs) {
    const parentPath = node.parentPath || '';
    const baseName = sanitizeFilename(node.title) || node.documentId;
    remoteExistingPaths.add(parentPath ? `${parentPath}/${baseName}.md` : `${baseName}.md`);
  }

  let downloaded = 0;
  let uploaded = 0;
  let conflicts = 0;
  let skipped = 0;
  let autoMerged = 0;
  let deletedLocal = 0;
  let deletedRemote = 0;
  let movedRemote = 0;

  for (const [fileRel, localInfo] of localMap.entries()) {
    if (existingFileToDoc.has(fileRel)) continue;
    const sameHash = Object.entries(manifestDocs).find(([, e]) => e.hash && localInfo.hash && e.hash === localInfo.hash);
    if (sameHash) {
      manifestDocs[sameHash[0]].file = fileRel;
      existingFileToDoc.set(fileRel, sameHash[0]);
      console.log(`[dedupe] reused manifest doc for identical local content: ${fileRel}`);
      continue;
    }
    if (remoteExistingPaths.has(fileRel)) {
      console.log(`[upload] local file matches existing remote path; defer to remote scan: ${fileRel}`);
      continue;
    }
    console.log(`[upload] local file not in manifest: ${fileRel}`);
    const markdown = await fs.readFile(localInfo.fullPath, 'utf8');
    const segs = fileRel.split('/');
    segs.pop();
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
    existingFileToDoc.set(fileRel, newDocId);
    uploaded += 1;
  }
  if (uploaded > 0) {
    await writeManifest(resolvedFolder, { spaceId, docs: manifestDocs }, manifestName);
    console.log(`[update] wrote manifest after early local uploads: ${uploaded}`);
  }

  const remoteDocs = [];
  let metaIndex = 0;
  for (const node of syncableWikiDocs) {
    if (!manifestDocs[node.documentId] && /^import-/i.test(node.title || '')) {
      skipped += 1;
      continue;
    }
    metaIndex += 1;
    console.log(`[update] fetching meta ${metaIndex}: ${node.title || node.documentId}`);
    const meta = await fetchDocumentMeta(node.documentId, token);
    remoteDocs.push({
      documentId: node.documentId,
      nodeToken: node.nodeToken,
      title: meta.title || node.title || '',
      parentPath: node.parentPath || '',
      revisionId: meta.revision_id ?? meta.revisionId ?? null,
      fileType: node.objType || 'docx',
      hasChild: node.hasChild,
    });
  }

  // Build a map of wiki-node paths so we can resolve local subdirectories
  // (e.g. "飞书深诺技术文档/飞书深诺产品文档") to the right parent node_token
  // when uploading new local files.
  const remoteMap = new Map(remoteDocs.map((doc) => [doc.documentId, doc]));
  const usedPaths = new Set(localFiles.map((file) => file.relPath));
  for (const entry of Object.values(manifestDocs)) {
    if (entry && entry.file) {
      usedPaths.add(entry.file);
    }
  }

  for (const doc of remoteDocs) {
    const existing = manifestDocs[doc.documentId];
    const baseName = sanitizeFilename(doc.title) || doc.documentId;
    // Build the desired relative path: include the wiki parent path so the
    // local file ends up in a subdirectory mirroring the Feishu tree.
    const desiredRelative = doc.parentPath
      ? `${doc.parentPath}/${baseName}.md`
      : `${baseName}.md`;
    let fileRel = existing?.file;
    let localMoved = false;

    // --- Local move detection (user moved the file locally) ------------
    // If the manifest entry points to a path that is no longer on disk, but
    // a file with the SAME hash exists at a different relative path, the
    // user moved/renamed the local file. Honor the local layout: point the
    // manifest at the actual file and mirror the move to Feishu (so the
    // remote doc lands in the container matching the new subdirectory).
    if (existing?.hash && fileRel) {
      const oldOnDisk = localMap.has(fileRel);
      if (!oldOnDisk) {
        for (const [relPath, li] of localMap.entries()) {
          if (relPath !== fileRel && ((existing.identity && li.identity === existing.identity) || li.hash === existing.hash)) {
            fileRel = relPath;
            localMoved = true;
            const localDir = path.posix.dirname(fileRel);
            const localDirNorm = localDir === '.' ? '' : localDir;
            const remoteDir = doc.parentPath || '';
            if (doc.nodeToken && localDirNorm !== remoteDir) {
              let parentToken = null;
              if (localDirNorm) {
                parentToken = await ensureParentPath(
                  spaceId,
                  token,
                  localDirNorm.split('/'),
                  wikiPathIndex
                );
              }
              if (parentToken !== null) {
                try {
                  await moveWikiNode(spaceId, token, doc.nodeToken, parentToken);
                  console.log(`[move] ${doc.title} -> ${localDirNorm || '<wiki root>'}`);
                  movedRemote += 1;
                } catch (err) {
                  console.error(`[move] failed for ${doc.title}: ${err.message || err}`);
                }
              }
            }
            break;
          }
        }
      }
    }

    // --- Follow-Feishu rename (remote moved / title changed) ------------
    // Skip when the local move detection already picked a target: the user
    // moved the file locally, so honoring Feishu's position would undo it.
    let desiredRel = null;
    if (!localMoved) {
      if (!existing && localMap.has(desiredRelative)) {
        desiredRel = desiredRelative;
      } else {
        const renameCandidates = new Set(usedPaths);
        if (fileRel) {
          renameCandidates.delete(fileRel);
        }
        desiredRel = await ensureUniqueFilePath(
          resolvedFolder,
          desiredRelative,
          renameCandidates
        );
      }
    }
    if (!fileRel) {
      fileRel = desiredRel;
    } else if (desiredRel && desiredRel !== fileRel) {
      const oldRel = fileRel;
      const oldInfo = localMap.get(oldRel);
      const oldAbs = path.join(resolvedFolder, oldRel);
      const newAbs = path.join(resolvedFolder, desiredRel);
      if (oldInfo) {
        await fs.mkdir(path.dirname(newAbs), { recursive: true });
        let renamed = false;
        try {
          await fs.rename(oldAbs, newAbs);
          renamed = true;
        } catch {}
        if (renamed) {
          await removeEmptyParentDirs(path.dirname(oldAbs), resolvedFolder);
          localMap.delete(oldRel);
          localMap.set(desiredRel, { ...oldInfo, relPath: desiredRel, fullPath: newAbs });
        }
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
      if (localExists) {
        manifestDocs[doc.documentId] = {
          file: fileRel,
          revisionId: doc.revisionId,
          title: doc.title,
          fileType: resolveFileType(doc),
          hash: localInfo.hash,
        };
        usedPaths.add(fileRel);
        skipped += 1;
        continue;
      }
      // Containers (has_child=true) carry the wiki node, but their own body
      // is often empty. Skip downloading empty containers so we don't litter
      // the local tree with empty .md files mirroring empty directories.
      if (doc.hasChild) {
        const count = await fetchChildrenCount(doc.documentId, token);
        if (count === 0) {
          skipped += 1;
          continue;
        }
      }
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
      // Containers (has_child=true) own their sub-documents — never delete
      // them just because the local .md is missing. The container itself
      // might be a workspace the user keeps in Feishu but doesn't mirror
      // locally; deleting it would orphan the children.
      if (doc.hasChild) {
        skipped += 1;
        continue;
      }
      const deleteState = checkPendingDelete(existing);
      if (deleteState === 'marked') {
        console.warn(`[delete-guard] ${fileRel} is missing; remote delete delayed for 7 days`);
        skipped += 1;
        continue;
      }
      if (deleteState === 'waiting') {
        skipped += 1;
        continue;
      }
      await deleteRemoteDocument(doc.documentId, token, resolveFileType(doc, existing));
      delete manifestDocs[doc.documentId];
      deletedRemote += 1;
      continue;
    }

    const localChanged =
      existing.hash && localInfo.hash && existing.hash !== localInfo.hash;
    if (existing.pendingDeleteAt) {
      delete existing.pendingDeleteAt;
      console.log(`[delete-guard] restored ${fileRel}; cancelled pending remote delete`);
    }
    const remoteChanged =
      existing.revisionId && doc.revisionId && existing.revisionId !== doc.revisionId;

    if (remoteChanged && localChanged) {
      // Try a content-aware short-circuit: when the manifest hash is just
      // stale (Feishu revision drifted without anyone actually editing
      // anything), local and remote usually render to the exact same
      // markdown. Detect that case and skip the conflict instead of
      // spamming .remote.md files.
      try {
        const remoteBlocks = await fetchAllBlocks(doc.documentId, token);
        const remoteContent = feishuToMarkdown({
          metadata: { document_id: doc.documentId },
          blocks: remoteBlocks,
        });
        const localContent = await fs.readFile(fileAbs, 'utf8');
        const verdict = mergeRemoteIntoLocal(localContent, remoteContent);
        if (verdict.autoMerged && !verdict.hasConflicts) {
          // Local and remote are identical — no real conflict. Advance the
          // manifest to the current Feishu revision so future sync runs
          // don't keep tripping the same conflict.
          manifestDocs[doc.documentId] = {
            ...existing,
            revisionId: doc.revisionId,
            hash: localInfo.hash,
          };
          autoMerged += 1;
          console.log(`[merge] auto-resolved ${doc.title} (local == remote)`);
          continue;
        }
      } catch (err) {
        // If anything goes wrong with the content comparison, fall back to
        // the conservative behavior below (download + stash .remote.md).
        console.warn(`[merge] content comparison failed for ${doc.title}: ${err.message || err}`);
      }

      // Real conflict: stash remote version, keep the safety net.
      const conflictRel = buildConflictPath(fileRel);
      const conflictAbs = path.join(resolvedFolder, conflictRel);
      // Always stash the remote version first, regardless of which side wins.
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
      existing.lastConflict = {
        at: new Date().toISOString(),
        localPath: fileRel,
        remoteRevision: doc.revisionId,
        conflictPath: conflictRel,
      };
      if (preferLocal) {
        // User opted into "local wins": push local .md to Feishu and
        // refresh the manifest to the new revision so future syncs match.
        try {
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
          console.log(`[prefer-local] uploaded ${doc.title} (remote kept at ${conflictRel})`);
        } catch (err) {
          console.error(`[prefer-local] failed to upload ${doc.title}: ${err.message || err}`);
          conflicts += 1;
        }
      } else {
        conflicts += 1;
      }
      // Even when we keep the .remote.md safety net, advance the manifest
      // revision AND hash so the next sync run doesn't trip the same
      // conflict and re-create .remote.md files that the user already
      // cleaned up.
      manifestDocs[doc.documentId] = {
        ...existing,
        revisionId: doc.revisionId,
        hash: localInfo.hash,
      };
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

    manifestDocs[doc.documentId] = {
      ...existing,
      file: fileRel,
      revisionId: doc.revisionId,
      title: doc.title,
      fileType: resolveFileType(doc, existing),
      hash: localInfo.hash || existing.hash,
      identity: localInfo.identity || existing.identity || null,
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
      // Remote omission can be caused by pagination/transient API failures.
      // Never delete a local file solely because its manifest doc is absent;
      // drop the stale mapping and let the normal upload pass recreate it.
      console.warn(`[safety] remote doc ${docId} missing; preserving local file for re-upload: ${fileRel}`);
    }
    delete manifestDocs[docId];
  }

  const fileToDoc = new Map();
  for (const [docId, entry] of Object.entries(manifestDocs)) {
    if (entry.file) fileToDoc.set(entry.file, docId);
  }

  for (const [fileRel, localInfo] of localMap.entries()) {
    if (fileToDoc.has(fileRel)) continue;
    const sameHash = Object.entries(manifestDocs).find(([, e]) => e.hash && localInfo.hash && e.hash === localInfo.hash);
    if (sameHash) {
      manifestDocs[sameHash[0]].file = fileRel;
      fileToDoc.set(fileRel, sameHash[0]);
      console.log(`[dedupe] reused manifest doc for identical local content: ${fileRel}`);
      continue;
    }
    console.log(`[upload] local file not in manifest: ${fileRel}`);
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
    `Sync complete. Downloaded: ${downloaded}, Uploaded: ${uploaded}, Moved Remote: ${movedRemote}, Deleted Local: ${deletedLocal}, Deleted Remote: ${deletedRemote}, Auto-Merged: ${autoMerged}, Conflicts: ${conflicts}, Skipped: ${skipped}`
  );
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
