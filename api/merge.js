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

export function mergeThreeWay(base, local, remote) {
  if (local === remote) return { merged: local, hasConflicts: false };
  if (local === base) return { merged: remote, hasConflicts: false };
  if (remote === base) return { merged: local, hasConflicts: false };
  const baseLines = String(base).split('\n');
  const localLines = String(local).split('\n');
  const remoteLines = String(remote).split('\n');
  const change = (next) => {
    let start = 0;
    while (start < baseLines.length && start < next.length && baseLines[start] === next[start]) start += 1;
    let baseEnd = baseLines.length;
    let nextEnd = next.length;
    while (baseEnd > start && nextEnd > start && baseLines[baseEnd - 1] === next[nextEnd - 1]) {
      baseEnd -= 1; nextEnd -= 1;
    }
    return { start, end: baseEnd, replacement: next.slice(start, nextEnd) };
  };
  const left = change(localLines);
  const right = change(remoteLines);
  // Independent edits can be combined without conflict. Treat insertions at
  // the same offset as overlapping unless they are byte-identical.
  const disjoint = left.end <= right.start || right.end <= left.start;
  if (disjoint) {
    const edits = [left, right].sort((a, b) => b.start - a.start);
    const out = baseLines.slice();
    for (const edit of edits) out.splice(edit.start, edit.end - edit.start, ...edit.replacement);
    return { merged: out.join('\n'), hasConflicts: false };
  }
  if (left.start === right.start && left.end === right.end &&
      left.replacement.join('\n') === right.replacement.join('\n')) {
    return { merged: local, hasConflicts: false };
  }
  const merged = ['<<<<<<< LOCAL', ...localLines, '=======', ...remoteLines, '>>>>>>> REMOTE'].join('\n');
  return { merged, hasConflicts: true };
}
