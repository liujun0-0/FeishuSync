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
