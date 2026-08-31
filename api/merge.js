// Content-aware merge between local and remote, designed for the common
// case where manifest revisions are stale.
//
// Why this is not full diff3:
//   We do not store a per-doc base (the snapshot from the last clean sync).
//   So we cannot tell "which side made this edit". Instead we detect:
//     1. Local and remote are byte-identical -> no conflict, no backup.
//     2. They differ -> real conflict, download remote to .remote.md,
//        keep local .md untouched, mark manifest hasMergeConflict=true.
//
// In the future we can upgrade to real 3-way diff3 by storing the base
// in manifest, but for the common case (Feishu revision drifts without
// real content change) this avoids the noisy .remote.md files.

export function mergeRemoteIntoLocal(localContent, remoteContent) {
  if (localContent === remoteContent) {
    return { merged: localContent, hasConflicts: false, autoMerged: true };
  }
  return { merged: localContent, hasConflicts: true, autoMerged: false };
}