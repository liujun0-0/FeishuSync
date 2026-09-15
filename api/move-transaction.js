// Pure move/copy/delete classification shared by local and bidirectional
// workers. No filesystem or network side effects occur here.
export function classifyPathChange(previous, current) {
  if (!previous && current) return { type: 'create' };
  if (previous && !current) return { type: 'delete' };
  if (!previous || !current) return { type: 'unknown' };
  if (previous.identity && current.identity && previous.identity === current.identity) {
    return { type: previous.path === current.path ? 'unchanged' : 'move', from: previous.path, to: current.path };
  }
  if (previous.hash && current.hash && previous.hash === current.hash) {
    return { type: previous.path === current.path ? 'unchanged' : 'copy', from: previous.path, to: current.path };
  }
  return { type: 'modify' };
}

// Durable move state machine. The returned objects are manifest-safe and can
// be written before/after the remote API call so a crashed sync can resume.
export function beginMoveTransaction(entry, from, to, now = new Date().toISOString()) {
  return {
    ...entry,
    pendingMove: { from, to, state: 'prepared', startedAt: now, attempts: (entry?.pendingMove?.attempts || 0) + 1 },
  };
}

export function completeMoveTransaction(entry, now = new Date().toISOString()) {
  if (!entry?.pendingMove) return entry;
  const move = entry.pendingMove;
  return { ...entry, file: move.to, lastMove: { from: move.from, to: move.to, at: now }, pendingMove: undefined };
}

export function failMoveTransaction(entry, error, now = new Date().toISOString()) {
  if (!entry?.pendingMove) return entry;
  return {
    ...entry,
    pendingMove: { ...entry.pendingMove, state: 'failed', failedAt: now, error: String(error?.message || error).slice(0, 500) },
  };
}
