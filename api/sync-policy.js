// Per-document synchronization policy. Keys may be a manifest-relative path
// or a Feishu document id; path entries take precedence over id entries.
export const SYNC_POLICIES = new Set(['bidirectional', 'remote-to-local', 'local-to-remote', 'merge']);

export function normalizeSyncPolicy(value, fallback = 'bidirectional') {
  const raw = String(value || '').trim().toLowerCase().replaceAll('_', '-');
  const aliases = { bidirectional: 'bidirectional', both: 'bidirectional', remote: 'remote-to-local', local: 'local-to-remote', auto: 'bidirectional' };
  const policy = aliases[raw] || raw;
  return SYNC_POLICIES.has(policy) ? policy : fallback;
}

export function resolveSyncPolicy(policies, { path = '', docId = '', fallback = 'bidirectional' } = {}) {
  if (!policies || typeof policies !== 'object') return normalizeSyncPolicy(fallback);
  const normalizedPath = String(path || '').replaceAll('\\', '/');
  const byPath = policies.paths || policies.files || {};
  const byId = policies.docIds || policies.documents || {};
  return normalizeSyncPolicy(
    byPath[normalizedPath] ?? policies[normalizedPath] ?? byId[docId] ?? policies[docId],
    fallback,
  );
}
