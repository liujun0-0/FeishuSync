import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  feishuToMarkdown,
  markdownToBlocks,
  inlineMarkdownToElements,
  BLOCK_TYPE,
} from './feishu-md.js';
import {
  readManifest,
  writeManifest,
  hashFile,
  sanitizeFilename,
  ensurePosixPath,
  fileExists,
  deleteLocalFile,
  ensureUniqueFilePathWithFs,
  shouldSyncLocalPath,
  buildConflictPath,
  resolveFileType,
} from './helpers.js';

export const API_BASE = 'https://open.feishu.cn/open-apis';
const DELETE_BATCH_SIZE = 100;
const CREATE_BATCH_SIZE = 100;

/**
 * Token 热更新支持。
 *
 * sync.js 是常驻进程，启动时读一次 token 用到底；auth 进程每 ~96 分钟自动
 * 刷新 token 并写回 user-token.txt，但常驻进程拿的还是旧 token → 全部 API
 * 调用撞 99991677（token expired），直到进程重启。
 *
 * 解法：sync.js 启动时调 setTokenReloader(() => readToken(tokenPath))。
 * apiRequest 遇到 99991677/99991661 时通过 reloader 重读最新 token 并重试，
 * 整个链路自愈，无需重启。
 */
let tokenReloader = null;

export function setTokenReloader(fn) {
  tokenReloader = typeof fn === 'function' ? fn : null;
}

// 触发 token 重载并重试的错误码：
// 99991677 = access token expired；99991661 = access token invalid
const TOKEN_RELOAD_CODES = new Set([99991677, 99991661]);

export async function apiRequest(method, pathSuffix, token, { query = {}, body } = {}) {
  const url = new URL(`${API_BASE}${pathSuffix}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const headers = {
    Authorization: `Bearer ${token}`,
  };
  const options = {
    method,
    headers,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json; charset=utf-8';
    options.body = JSON.stringify(body);
  }

  const maxRetries = 5;
  let authToken = token;
  let tokenReloaded = false;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    headers.Authorization = `Bearer ${authToken}`;
    let response;
    try {
      response = await fetch(url, options);
    } catch (err) {
      const bodyPreview = body ? JSON.stringify(body).slice(0, 200) : '';
      throw new Error(
        `Fetch failed for ${url.toString()}: ${err && err.message ? err.message : err}${
          bodyPreview ? ` | body=${bodyPreview}` : ''
        }`
      );
    }

    if (response.status === 429) {
      const retryAfter = Number(response.headers.get('retry-after'));
      const delayMs = Number.isFinite(retryAfter)
        ? retryAfter * 1000
        : Math.min(8000, 1000 * 2 ** attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      continue;
    }

    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch (err) {
      throw new Error(
        `API response is not JSON (status ${response.status}). Raw response: ${text || '<empty>'}`
      );
    }

    if (!data) {
      throw new Error(`API response is empty (status ${response.status}).`);
    }

    if (data.code !== 0) {
      // token 失效自愈：重读 token 文件换新 token 重试一次
      if (TOKEN_RELOAD_CODES.has(data.code) && tokenReloader && !tokenReloaded) {
        const fresh = await tokenReloader().catch(() => null);
        if (fresh && fresh !== authToken) {
          authToken = fresh;
          tokenReloaded = true;
          console.log('[feishu] token expired; reloaded fresh token from file and retrying');
          continue;
        }
      }
      const message = data.msg || data.error_description || data.error || 'Unknown error';
      throw new Error(`API error (${data.code}): ${message}`);
    }
    return data.data ?? data;
  }

  throw new Error('API error: rate limited (429) after retries.');
}

export function apiGet(pathSuffix, token, query) {
  return apiRequest('GET', pathSuffix, token, { query });
}

export function apiPost(pathSuffix, token, body, query) {
  return apiRequest('POST', pathSuffix, token, { query, body });
}

export function apiDelete(pathSuffix, token, body, query) {
  return apiRequest('DELETE', pathSuffix, token, { query, body });
}

export function apiPatch(pathSuffix, token, body, query) {
  return apiRequest('PATCH', pathSuffix, token, { query, body });
}

/**
 * 通用 multipart 上传到飞书 drive /medias/upload_all。
 *
 * @param {Buffer} buffer - 文件内容
 * @param {string} fileName - 文件名（含扩展名）
 * @param {string} parentType - parent_type（如 'docx_image' / 'docx_file'）
 * @param {string} parentNode - parent_node（如 documentId 或 imageBlockId）
 * @param {string} token - user_access_token
 * @param {object} [options]
 * @param {string} [options.contentType] - 二进制 MIME（默认 image/png）
 * @param {string} [options.driveRouteToken] - 多数据中心路由 token（extra 字段）
 * @returns {Promise<object>} 完整 API 响应（调用方自取 file_token）
 */
async function uploadMediaMultipart(buffer, fileName, parentType, parentNode, token, options = {}) {
  const boundary = `----FeishuSync${Date.now()}${Math.random().toString(36).slice(2)}`;
  const textFields = {
    file_name: fileName,
    parent_type: parentType,
    parent_node: parentNode,
    size: String(buffer.length),
  };
  if (options.driveRouteToken) {
    textFields.extra = JSON.stringify({ drive_route_token: options.driveRouteToken });
  }
  const parts = [];
  for (const [name, value] of Object.entries(textFields)) {
    parts.push(
      Buffer.from(`--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${name}"\r\n\r\n` +
        `${value}\r\n`, 'utf8')
    );
  }
  const contentType = options.contentType || 'image/png';
  parts.push(
    Buffer.from(`--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
      `Content-Type: ${contentType}\r\n\r\n`, 'utf8')
  );
  parts.push(buffer);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));

  const body = Buffer.concat(parts);
  const url = `${API_BASE}/drive/v1/medias/upload_all`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': String(body.length),
    },
    body,
  });

  const data = await response.json();
  if (!response.ok || (data.code !== undefined && data.code !== 0)) {
    throw new Error(
      `uploadMedia 失败: HTTP ${response.status} code=${data.code} msg=${data.msg || ''}`
    );
  }
  // 与 apiRequest 保持一致：返回 data.data（脱壳一层）
  return data.data ?? data;
}

/**
 * 上传 PNG buffer 到飞书文档，返回 file_token。
 *
 * 保留导出供 Batch 1 兼容旧调用方（实际不再被主上行链路使用——
 * 见 api/mermaid-render.js 自渲染路径已被官方 import_task 取代）。
 *
 * @param {Buffer} buffer - PNG buffer
 * @param {string} fileName - 文件名
 * @param {string} parentNode - parent_node
 * @param {string} token - user_access_token
 * @returns {Promise<string>} file_token
 */
export async function uploadImage(buffer, fileName, parentNode, token, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('uploadImage: buffer 必须是 Buffer');
  }
  if (!fileName || typeof parentNode !== 'string' || !token) {
    throw new Error('uploadImage: fileName/parentNode/token 必填');
  }
  const data = await uploadMediaMultipart(buffer, fileName, 'docx_image', parentNode, token, options);
  const fileToken = data.file_token || data.data?.file_token;
  if (!fileToken) {
    throw new Error(`uploadImage 响应缺 file_token: ${JSON.stringify(data).slice(0, 200)}`);
  }
  return fileToken;
}

/**
 * 上传 markdown buffer 到飞书 drive（作为 docx_file 类型），
 * 配合 import_task.create 实现 markdown → docx 整篇导入。
 *
 * @param {Buffer} buffer - markdown utf-8 buffer
 * @param {string} fileName - 文件名（含 .md 扩展名）
 * @param {string} parentNode - 真实 docx_id（飞书要求 docx_file 类型的 parent_node 必须存在）
 * @param {string} token - user_access_token
 * @returns {Promise<object>} 完整 API 响应
 */
export async function uploadMarkdownFile(buffer, fileName, parentNode, token) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('uploadMarkdownFile: buffer 必须是 Buffer');
  }
  if (!fileName || !parentNode || !token) {
    throw new Error('uploadMarkdownFile: fileName/parentNode/token 必填');
  }
  return uploadMediaMultipart(
    buffer,
    fileName,
    'docx_file',
    parentNode,
    token,
    { contentType: 'text/markdown' }
  );
}

export async function deleteRemoteDocument(documentId, token, fileType) {
  const type = fileType || 'docx';
  await apiDelete(`/drive/v1/files/${documentId}`, token, undefined, { type });
}

export async function fetchAllBlocks(documentId, token) {
  const blocks = [];
  let pageToken;
  let hasMore = true;

  while (hasMore) {
    const data = await apiGet(
      `/docx/v1/documents/${documentId}/blocks`,
      token,
      {
        page_size: 100,
        document_revision_id: -1,
        page_token: pageToken,
      }
    );

    const items = data.items || data.blocks || [];
    blocks.push(...items);

    pageToken = data.page_token || data.next_page_token || '';
    if (typeof data.has_more === 'boolean') {
      hasMore = data.has_more;
    } else {
      hasMore = Boolean(pageToken);
    }
  }

  return blocks;
}

const spaceIdCache = new Map();

function isNumericSpaceId(value) {
  return typeof value === 'string' && /^[0-9]+$/.test(value);
}

export async function resolveSpaceId(spaceId, token) {
  if (spaceId === undefined || spaceId === null || spaceId === '') {
    throw new Error('Missing spaceId.');
  }
  const raw = String(spaceId);
  if (isNumericSpaceId(raw)) {
    return raw;
  }
  const cached = spaceIdCache.get(raw);
  if (cached) {
    return cached;
  }
  // Feishu wiki v2 `/spaces/{int}/...` endpoints require an integer space_id.
  // New-style knowledge spaces only expose a node token; resolve it via /get_node.
  const data = await apiGet('/wiki/v2/spaces/get_node', token, { token: raw });
  const node = data?.node || data;
  const resolved =
    node?.space_id ||
    node?.origin_space_id ||
    data?.space_id;
  if (!resolved || !isNumericSpaceId(String(resolved))) {
    throw new Error(
      `Could not resolve space_id from token "${raw}". Got: ${JSON.stringify(
        data
      ).slice(0, 200)}`
    );
  }
  spaceIdCache.set(raw, String(resolved));
  return String(resolved);
}

export async function fetchWikiNodes(spaceId, token, parentNodeToken) {
  const nodes = [];
  let pageToken;
  let hasMore = true;
  const resolvedSpaceId = await resolveSpaceId(spaceId, token);

  while (hasMore) {
    const data = await apiGet(`/wiki/v2/spaces/${resolvedSpaceId}/nodes`, token, {
      parent_node_token: parentNodeToken,
      page_token: pageToken,
      page_size: 50,
    });

    const items = data.items || data.nodes || [];
    nodes.push(...items);

    pageToken = data.page_token || data.next_page_token || '';
    if (typeof data.has_more === 'boolean') {
      hasMore = data.has_more;
    } else {
      hasMore = Boolean(pageToken);
    }
  }

  return nodes;
}

export async function collectWikiDocNodes(spaceId, token, parentNodeToken, result) {
  const nodes = await fetchWikiNodes(spaceId, token, parentNodeToken);
  for (const node of nodes) {
    const hasChild = node.has_child ?? node.hasChild;
    const nodeToken = node.node_token || node.nodeToken;
    const objType = node.obj_type || node.objType;
    const objToken = node.obj_token || node.objToken;

    // Collect every docx/doc node — including containers (has_child=true).
    // Containers in Feishu wiki v2 are themselves docx documents that may
    // carry an introduction/overview in their own body. The caller decides
    // what to do with each one (download content if non-empty, skip otherwise,
    // never delete containers even if local file is missing).
    const isDocument = objToken && (objType === 'docx' || objType === 'doc');
    if (isDocument) {
      result.push({
        nodeToken,
        documentId: objToken,
        title: node.title || node.name || '',
        objType,
        hasChild: Boolean(hasChild),
      });
    }

    if (hasChild && nodeToken) {
      await collectWikiDocNodes(spaceId, token, nodeToken, result);
    }
  }
}

// Walks the wiki tree once and returns a Map keyed by an array of path segments
// from the wiki root, so callers can resolve a local subdirectory to a node_token.
// Each value contains the title and the wiki node_token.
export async function createWikiNode(spaceId, token, title, parentNodeToken) {
  const resolvedSpaceId = await resolveSpaceId(spaceId, token);
  const body = {
    obj_type: 'docx',
    node_type: 'origin',
    title,
  };
  if (parentNodeToken) {
    body.parent_node_token = parentNodeToken;
  }
  const data = await apiPost(
    `/wiki/v2/spaces/${resolvedSpaceId}/nodes`,
    token,
    body
  );
  const node = data?.node || data;
  if (!node?.node_token) {
    throw new Error(
      `Failed to create wiki node "${title}". Got: ${JSON.stringify(data).slice(0, 200)}`
    );
  }
  return node;
}

export async function collectWikiNodePaths(spaceId, token) {
  const byPath = new Map();

  async function walk(parentNodeToken, segments) {
    const nodes = await fetchWikiNodes(spaceId, token, parentNodeToken);
    for (const node of nodes) {
      const nodeToken = node.node_token || node.nodeToken;
      const title = node.title || node.name || '';
      const hasChild = node.has_child ?? node.hasChild;
      const nextSegments = [...segments, title];
      // In Feishu wiki v2, container (folder) nodes ALSO have obj_type=docx
      // with has_child=true. Use has_child as the container signal.
      // Record both with-root and without-root keys so callers can resolve
      // local subdirectories either way.
      if (hasChild) {
        const full = nextSegments.join('/');
        byPath.set(full, { title, nodeToken, parentNodeToken });
        // Strip the leading wiki-root title (first segment).
        if (nextSegments.length > 1) {
          const trimmed = nextSegments.slice(1).join('/');
          byPath.set(trimmed, { title, nodeToken, parentNodeToken });
        }
      }
      if (hasChild && nodeToken) {
        await walk(nodeToken, nextSegments);
      }
    }
  }

  await walk(undefined, []);
  return byPath;
}

export async function fetchDocumentMeta(documentId, token) {
  const data = await apiGet(`/docx/v1/documents/${documentId}`, token);
  return data.document || data;
}

export async function downloadDocumentToFile(documentId, token, metadata, filePath) {
  const blocks = await fetchAllBlocks(documentId, token);
  const markdown = feishuToMarkdown({ metadata, blocks });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, markdown, 'utf8');
  return crypto.createHash('sha256').update(markdown).digest('hex');
}

function extractBlocksFromResponse(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.children)) return data.children;
  if (Array.isArray(data.blocks)) return data.blocks;
  if (Array.isArray(data.items)) return data.items;
  if (data.data) return extractBlocksFromResponse(data.data);
  return [];
}

function buildCellTextBlocks(content) {
  const lines = content.split('\n');
  const blocks = [];
  for (const line of lines) {
    const elements = inlineMarkdownToElements(line);
    blocks.push({
      block_type: BLOCK_TYPE.text,
      text: {
        style: {},
        elements,
      },
    });
  }
  return blocks;
}

async function createTableWithContent(documentId, token, tableBlock, index) {
  const rows = tableBlock._table?.rows || [];
  const rowSize = tableBlock.table?.property?.row_size || rows.length;
  const columnSize = tableBlock.table?.property?.column_size || rows[0]?.length || 0;
  const headerRow = Boolean(tableBlock.table?.property?.header_row);

  if (!rows.length || !columnSize) {
    return index;
  }

  // Build the full subtree (table + every table_cell + each cell's text
  // blocks) and create it in one POST to /descendant. The /children endpoint
  // refuses tables with more than ~9 cells (1770001 invalid param), but
  // /descendant accepts arbitrarily sized tables by sending the entire
  // tree at once with temporary block IDs linked via `children` arrays.
  //
  // Note: temporary block_ids must be alphanumeric only. Underscores cause
  // Feishu to return 1770001 ("invalid param"). Tested: 11x3 OK with
  // "tblxxx" / "cellxxx" / "txtxxx" but fails with "tbl_xxx".
  const tableId = `tbl${Date.now()}${Math.floor(Math.random() * 1e9)}`;
  const cellIds = [];
  const descendants = [];
  const tmp = () => Math.floor(Math.random() * 1e12).toString(36);

  for (let r = 0; r < rowSize; r += 1) {
    for (let c = 0; c < columnSize; c += 1) {
      const cellId = `cell${tmp()}`;
      cellIds.push(cellId);

      // Each cell holds one or more text blocks. Empty cells need at least
      // one text block — Feishu rejects empty cells otherwise.
      const cellContent = (rows[r] && rows[r][c]) || '';
      const cellLines = cellContent.length
        ? cellContent.split('\n')
        : [''];
      const childIds = [];
      const textBlocks = cellLines.map((line) => {
        const textBlockId = `txt${tmp()}`;
        childIds.push(textBlockId);
        return {
          block_id: textBlockId,
          block_type: BLOCK_TYPE.text,
          text: {
            style: { align: 1, folded: false },
            // /descendant 接口拒绝 elements 为空的 text block（/children 允许），
            // 因此空单元格必须用单个空格占位，否则整表 1770001。
            elements:
              line.trim() === ''
                ? [{ text_run: { content: ' ', text_element_style: {} } }]
                : inlineMarkdownToElements(line),
          },
          children: [],
        };
      });

      descendants.push({
        block_id: cellId,
        block_type: BLOCK_TYPE.table_cell,
        table_cell: {},
        children: childIds,
      });
      descendants.push(...textBlocks);
    }
  }

  // Table root goes first in descendants.
  descendants.unshift({
    block_id: tableId,
    block_type: BLOCK_TYPE.table,
    table: {
      property: {
        row_size: rowSize,
        column_size: columnSize,
        header_row: headerRow,
        header_column: false,
      },
    },
    children: cellIds,
  });

  await apiPost(
    `/docx/v1/documents/${documentId}/blocks/${documentId}/descendant?document_revision_id=-1`,
    token,
    {
      index,
      children_id: [tableId],
      descendants,
    }
  );

  return index + 1;
}

export async function appendBlocks(documentId, token, blocks, startIndex = 0) {
  // 跳过被 mermaid resolve 标记的占位块（已独立插入并 patch token）
  const effective = (blocks || []).filter((b) => b && !b._skip);
  if (!effective.length) return startIndex;
  let index = startIndex;
  for (let i = 0; i < effective.length; i += CREATE_BATCH_SIZE) {
    const chunk = effective.slice(i, i + CREATE_BATCH_SIZE);
    try {
      await apiPost(
        `/docx/v1/documents/${documentId}/blocks/${documentId}/children?document_revision_id=-1`,
        token,
        { index, children: chunk }
      );
      index += chunk.length;
    } catch (batchErr) {
      // Batch failed (commonly 1770001 invalid param). Retry each block in
      // the chunk individually so we upload what we can and report the bad
      // ones; the caller can decide what to do.
      console.warn(
        `[feishu] batch upload failed at index ${i} (size=${chunk.length}): ${batchErr.message || batchErr}; retrying block-by-block`
      );
      for (const single of chunk) {
        try {
          await apiPost(
            `/docx/v1/documents/${documentId}/blocks/${documentId}/children?document_revision_id=-1`,
            token,
            { index, children: [single] }
          );
          index += 1;
        } catch (singleErr) {
          console.error(
            `[feishu] skipping block_type=${single.block_type} at index ${index}: ${singleErr.message || singleErr}`
          );
          // don't advance index — the failing block isn't actually appended
        }
      }
    }
  }
  return index;
}

export async function appendBlocksWithTables(documentId, token, blocks) {
  let index = 0;
  let buffer = [];

  const flushBuffer = async () => {
    if (!buffer.length) return;
    index = await appendBlocks(documentId, token, buffer, index);
    buffer = [];
  };

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.block_type === BLOCK_TYPE.table && block._table) {
      await flushBuffer();
      try {
        index = await createTableWithContent(documentId, token, block, index);
      } catch (err) {
        console.error(
          `[feishu] createTableWithContent failed at index ${index} ` +
            `(rows=${block._table.rows.length}, cols=${block._table.rows[0]?.length || 0}): ` +
            `${err.message || err}; skipping table and continuing`
        );
        // Skip this table — do not advance index because the table isn't
        // actually in the doc.
      }
      continue;
    }
    buffer.push(block);
  }

  await flushBuffer();
}

export async function createDocument(token, title) {
  try {
    const data = await apiPost('/docx/v1/documents', token, title ? { title } : undefined);
    const documentId = data?.document?.document_id || data?.document_id || data?.documentId;
    if (!documentId) {
      throw new Error('Create document response missing document_id.');
    }
    return { documentId, usedTitle: Boolean(title) };
  } catch (err) {
    if (title) {
      const data = await apiPost('/docx/v1/documents', token);
      const documentId = data?.document?.document_id || data?.document_id || data?.documentId;
      if (!documentId) {
        throw new Error('Create document response missing document_id.');
      }
      return { documentId, usedTitle: false };
    }
    throw err;
  }
}

export async function addDocToWiki(spaceId, token, documentId, parentWikiToken) {
  const resolvedSpaceId = await resolveSpaceId(spaceId, token);
  const body = {
    obj_type: 'docx',
    obj_token: documentId,
  };
  if (parentWikiToken) {
    body.parent_wiki_token = parentWikiToken;
  }
  await apiPost(`/wiki/v2/spaces/${resolvedSpaceId}/nodes/move_docs_to_wiki`, token, body);
}

/**
 * 通过飞书官方 import_task API 把 markdown 文件导入为 docx。
 *
 * 这是飞书**官方**的 markdown → docx 转换通道。飞书服务端会自己解析 markdown，
 * 包括 ```mermaid``` fenced code block → 飞书画板（block_type=21/44）、
 * plantUML → 画板、表格、超9行自动拆分、Callout 高亮块 等。
 *
 * 流程（参考 openclaw/openclaw#16592 实现）：
 *   1. 上传 .md 文件到飞书 drive（parent_type: docx_file）
 *   2. 调 import_task.create（type: docx, file_extension: md）
 *   3. 轮询 import_task.get 拿到新文档 token
 *   4. 清理临时文件
 *
 * @param {object} options
 * @param {string} options.token - user_access_token
 * @param {string} options.markdown - 完整 markdown 内容
 * @param {string} options.fileName - 临时文件名（不含扩展名）
 * @param {string} options.spaceId - wiki space id（用作 mount_key，mount_type=1）
 * @returns {Promise<string>} 新飞书文档的 document_id
 */
export async function importMarkdownToDocument({
  token,
  markdown,
  fileName,
  spaceId,
  parentWikiToken,
}) {
  if (typeof token !== 'string' || !token) {
    throw new Error('importMarkdownToDocument: token 必填');
  }
  if (typeof markdown !== 'string') {
    throw new Error('importMarkdownToDocument: markdown 必填');
  }
  if (typeof spaceId !== 'string' || !spaceId) {
    throw new Error('importMarkdownToDocument: spaceId 必填');
  }

  const resolvedSpaceId = await resolveSpaceId(spaceId, token);
  const mdBuffer = Buffer.from(markdown, 'utf-8');
  // 临时文件名用时间戳而非 markdown title，避免 wiki 标题里夹带长 H1 + hash 后缀。
  // 当前 import_task 没有"重命名文档"能力，所以最终 wiki 标题是 "import-{ts}.md"，
  // 用户可在飞书侧手动重命名。markdown 文件内的 H1 仍是文档正文的标题（heading 1）。
  const tempFileName = `import-${Date.now().toString(36)}.md`;

  // 创建临时 docx 作为 upload 的 parent_node（飞书要求 docx_file 类型的
  // parent_node 必须是真实存在的 docx_id）。导入任务完成后会清理。
  const { documentId: tempDocId } = await createDocument(token, '[tmp] ' + tempFileName);

  // 第 1 步：上传 .md 文件到飞书 drive（parent_node 必须用真实 docx）
  const uploadRes = await uploadMarkdownFile(mdBuffer, tempFileName, tempDocId, token);
  const fileToken = uploadRes?.file_token;
  if (!fileToken) {
    throw new Error(
      `importMarkdownToDocument: upload 失败，响应缺 file_token: ${JSON.stringify(uploadRes).slice(0, 200)}`
    );
  }

  try {
    // 第 2 步：创建导入任务
    // mount_type=1, mount_key='' → 导入到调用者云盘根目录。
    // 不直接挂到 wiki space：import_task API 不支持挂到 wiki，
    // 改在导入完成后调 addDocToWiki 把 docx 移到 wiki。
    const importRes = await apiPost(
      '/drive/v1/import_tasks',
      token,
      {
        file_extension: 'md',
        file_token: fileToken,
        type: 'docx',
        file_name: tempFileName,
        point: { mount_type: 1, mount_key: '' },
      }
    );
    const ticket = importRes?.ticket || importRes?.data?.ticket;
    if (!ticket) {
      throw new Error(
        `importMarkdownToDocument: 创建导入任务失败: ${JSON.stringify(importRes).slice(0, 200)}`
      );
    }

    // 第 3 步：轮询等待
    const maxAttempts = 10;
    const pollIntervalMs = 2000;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const pollRes = await apiGet(`/drive/v1/import_tasks/${ticket}`, token);
      const result = pollRes?.result || {};
      const status = result.job_status;
      // 飞书文档对 job_status 没有公开枚举值。社区观察（lark-cli drive +import）：
      // - 0 = 成功
      // - 1 / 2 = 处理中
      // - > 2 = 失败
      if (result.token && (status === 0 || status === undefined || status === 1 || status === 2)) {
        if (status === 0 || status === undefined) {
          // 视为成功（有 token + 状态合理）
          const newDocId = result.token;
          try {
            await addDocToWiki(spaceId, token, newDocId, parentWikiToken || null);
          } catch (wikiErr) {
            console.warn(
              `[import_task] addDocToWiki 失败 (${wikiErr.message || wikiErr}); doc 保留在云盘根目录`
            );
          }
          return newDocId;
        }
        // 否则继续轮询
      }
      if (status !== undefined && status > 2) {
        throw new Error(
          `importMarkdownToDocument: 导入失败 status=${status} msg=${result.job_error_msg || ''}`
        );
      }
    }
    throw new Error('importMarkdownToDocument: 导入超时（10 次轮询未完成）');
  } finally {
    // 第 4 步：清理临时 doc 和上传文件（best-effort）
    // 先删临时 docx（移走的父 doc），再删上传的 .md 文件。
    // openclaw 实现参考：先删 docx，docx 删除会自动清理挂在它下的 file_token。
    try {
      await deleteRemoteDocument(tempDocId, token, 'docx');
    } catch {
      // ignore
    }
    try {
      await apiDelete(`/drive/v1/files/${fileToken}`, token, undefined, { type: 'file' });
    } catch {
      // ignore
    }
  }
}

// Move an existing wiki NODE (already in the wiki tree) to a different parent
// container. The correct endpoint for wiki-internal moves is
// POST /wiki/v2/spaces/{space_id}/nodes/{node_token}/move with
// target_parent_token — move_docs_to_wiki only works for docs NOT yet in the
// wiki.
export async function moveWikiNode(spaceId, token, nodeToken, parentNodeToken) {
  const resolvedSpaceId = await resolveSpaceId(spaceId, token);
  if (!nodeToken) {
    throw new Error('moveWikiNode requires node_token');
  }
  const body = { target_parent_token: parentNodeToken || undefined };
  await apiPost(
    `/wiki/v2/spaces/${resolvedSpaceId}/nodes/${nodeToken}/move`,
    token,
    body
  );
}

export async function fetchChildrenCount(documentId, token) {
  let count = 0;
  let pageToken;
  let hasMore = true;
  while (hasMore) {
    const data = await apiGet(
      `/docx/v1/documents/${documentId}/blocks/${documentId}/children`,
      token,
      {
        page_size: 200,
        document_revision_id: -1,
        page_token: pageToken,
      }
    );
    const items = data.items || data.blocks || data.children || [];
    count += items.length;
    pageToken = data.page_token || data.next_page_token || '';
    if (typeof data.has_more === 'boolean') {
      hasMore = data.has_more;
    } else {
      hasMore = Boolean(pageToken);
    }
  }
  return count;
}

async function deleteAllChildren(documentId, token) {
  let remaining = await fetchChildrenCount(documentId, token);
  while (remaining > 0) {
    const batch = Math.min(DELETE_BATCH_SIZE, remaining);
    await apiDelete(
      `/docx/v1/documents/${documentId}/blocks/${documentId}/children/batch_delete`,
      token,
      {
        start_index: 0,
        end_index: batch,
      },
      { document_revision_id: -1 }
    );
    remaining -= batch;
  }
}

/**
 * 原地更新文档内容（保留 docId）。
 *
 * 走 block-by-block 路径：先清空文档 children，再用 markdownToBlocks
 * 逐块 append。Mermaid 代码块在飞书侧会变成普通 code block（飞书块
 * 类型 14），无法渲染为画板——如果需要 mermaid 渲染，请改用
 * createDocumentFromMarkdown 走 import_task 路径。
 *
 * @param {string} documentId
 * @param {string} token
 * @param {string} markdown
 */
export async function uploadMarkdownToDocument(documentId, token, markdown) {
  const { blocks } = markdownToBlocks(markdown);
  await deleteAllChildren(documentId, token);
  await appendBlocksWithTables(documentId, token, blocks);
}

/**
 * 通过飞书官方 import_task API 整篇导入 markdown 并挂到 wiki space。
 *
 * 飞书服务端解析 markdown（含 ```mermaid``` → 飞书画板 / 表格自动拆分 /
 * Callout 等），无需本地逐块构造。这是推荐的**新建**文档路径。
 *
 * 注意：import_task 总是创建新 documentId，**不**支持原地更新。如需
 * 原地保留 docId，请用 uploadMarkdownToDocument。
 *
 * @param {string} spaceId - wiki space id
 * @param {string} token - user_access_token
 * @param {string} markdown
 * @param {string} [parentWikiToken] - （当前未使用，预留）
 * @returns {Promise<string>} 新飞书文档 document_id
 */
export async function createDocumentFromMarkdown(spaceId, token, markdown, parentWikiToken) {
  const { title } = markdownToBlocks(markdown);
  const fileName = (title || 'Untitled').replace(/[\\/:*?"<>|\r\n\t]+/g, '_').slice(0, 80);
  return importMarkdownToDocument({
    token,
    markdown,
    fileName,
    spaceId,
    // parentWikiToken 当前未在 import_task 路径里使用；
    // 飞书 import_task 文档默认挂到 space 根节点。
    // 后续若需挂到指定父节点，可在 importMarkdownToDocument 内
    // 通过 mount_type=2 + mount_key=parent_wiki_token 扩展。
    parentWikiToken,
  });
}

export async function subscribeToDocEvents(fileToken, token, fileType, eventType) {
  if (!fileToken) {
    throw new Error('Missing file token for event subscription.');
  }
  if (!fileType) {
    throw new Error('Missing file type for event subscription.');
  }
  const query = { file_type: String(fileType).toLowerCase() };
  if (eventType) {
    query.event_type = eventType;
  }
  await apiPost(`/drive/v1/files/${fileToken}/subscribe`, token, undefined, query);
}

export function createChangeProcessor({
  token,
  spaceId,
  rootDir,
  debounceMs,
  dedupeWindowMs,
  logEvents,
  fileTypes,
  runFullSync,
  subscribeToDocument,
  manifestName,
}) {
  let processing = false;
  let queued = false;
  let debounceTimer = null;
  let lastProcessCompletedAt = 0;
  const recentEvents = new Map();
  const pendingRemote = new Map();
  const pendingLocal = new Set();

  const pruneRecent = (now) => {
    for (const [eventId, ts] of recentEvents.entries()) {
      if (now - ts > dedupeWindowMs) {
        recentEvents.delete(eventId);
      }
    }
  };

  const seenEvent = (eventId) => {
    if (!eventId) return false;
    const now = Date.now();
    pruneRecent(now);
    if (recentEvents.has(eventId)) return true;
    recentEvents.set(eventId, now);
    return false;
  };

  const scheduleProcess = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      processPending().catch((err) => {
        console.error(`[realtime-sync] process failed: ${err.message || err}`);
      });
    }, debounceMs);
  };

  const handleEvent = (eventType, data) => {
    const eventId = data.event_id || data.eventId || '';
    if (eventId && seenEvent(eventId)) return;

    const fileTypeRaw = data.file_type || data.fileType || '';
    const fileType = String(fileTypeRaw).toLowerCase();
    if (fileType && fileTypes && !fileTypes.has(fileType)) {
      if (logEvents) {
        console.log(
          `[realtime-sync] ignored ${eventType} for file type ${fileType || 'unknown'}`
        );
      }
      return;
    }

    const fileToken =
      data.file_token || data.fileToken || data.resource_id || data.resourceId || '';
    if (!fileToken) {
      if (logEvents) {
        console.log(`[realtime-sync] ignored ${eventType} without file token`);
      }
      return;
    }

    if (logEvents) {
      const eventInfo = [eventType, fileType, fileToken].filter(Boolean).join(' | ');
      console.log(`[realtime-sync] event ${eventInfo}`);
    }

    pendingRemote.set(fileToken, eventType);
    scheduleProcess();
  };

  const handleLocalChange = (detail) => {
    const relPath = detail ? ensurePosixPath(detail) : '';
    if (relPath && !shouldSyncLocalPath(relPath, manifestName)) return;
    if (logEvents) {
      console.log(`[realtime-sync] local change ${relPath || ''}`.trim());
    }
    if (relPath) {
      pendingLocal.add(relPath);
    } else {
      pendingLocal.add('local');
    }
    scheduleProcess();
  };

  const processPending = async () => {
    if (processing) {
      queued = true;
      return;
    }
    processing = true;
    const remoteBatch = new Map(pendingRemote);
    const localBatch = new Set(pendingLocal);
    pendingRemote.clear();
    pendingLocal.clear();

    try {
      await processChanges(remoteBatch, localBatch);
    } finally {
      processing = false;
      lastProcessCompletedAt = Date.now();
      if (queued || pendingRemote.size || pendingLocal.size) {
        queued = false;
        setTimeout(() => {
          processPending().catch((err) => {
            console.error(`[realtime-sync] process failed: ${err.message || err}`);
          });
        }, 0);
      }
    }
  };

  const processChanges = async (remoteBatch, localBatch) => {
    if (localBatch.has('local')) {
      localBatch.delete('local');
      if (typeof runFullSync === 'function') {
        await runFullSync('local-change');
      }
      return;
    }
    const manifest = await readManifest(rootDir, manifestName);
    const manifestDocs = manifest.docs || {};
    let manifestDirty = false;

    const fileToDoc = new Map();
    const usedPaths = new Set();
    // 防幽灵副本守卫（full-sync 路径）：已被跟踪的标题集合。
    const trackedTitles = new Set(
      Object.values(manifestDocs)
        .map((e) => (e?.title || '').toLowerCase())
        .filter(Boolean)
    );
    for (const [docId, entry] of Object.entries(manifestDocs)) {
      if (entry?.file) {
        fileToDoc.set(entry.file, docId);
        usedPaths.add(entry.file);
      }
    }

    for (const [docId, eventType] of remoteBatch.entries()) {
      if (eventType === 'drive.file.trashed_v1') {
        const entry = manifestDocs[docId];
        if (entry?.file) {
          localBatch.delete(entry.file);
          const fileAbs = path.join(rootDir, entry.file);
          await deleteLocalFile(fileAbs);
          manifestDirty = true;
        }
        if (manifestDocs[docId]) {
          delete manifestDocs[docId];
          manifestDirty = true;
        }
        continue;
      }

      let meta;
      try {
        meta = await fetchDocumentMeta(docId, token);
      } catch (err) {
        console.warn(
          `[realtime-sync] failed to fetch meta for ${docId}: ${err.message || err}`
        );
        continue;
      }

      const entry = manifestDocs[docId];
      const title = meta.title || entry?.title || '';
      const revisionId = meta.revision_id ?? meta.revisionId ?? entry?.revisionId ?? null;
      // 防幽灵副本守卫：未跟踪 docId + 标题已被其他文档跟踪 = wiki 侧重复文档。
      // 不跳过的话，每个 revision-check 周期都会把它重新下载成 -N 本地副本。
      // 注意：必须用 logEvents 门控，否则重复文档存续期间每分钟刷屏。
      if (!entry && title && trackedTitles.has(title.toLowerCase())) {
        if (logEvents) {
          console.log(
            `[realtime-sync] skip duplicate wiki doc ${docId} titled "${title}" (ghost-duplicate guard)`
          );
        }
        continue;
      }
      const baseName = sanitizeFilename(title) || docId;
      const desiredName = `${baseName}.md`;
      let fileRel = entry?.file;
      // 标题重命名保护（防幽灵副本）：
      // 1) 仅当 basename 真的变化（标题被改）时才重命名，否则不动文件位置；
      // 2) 重命名只在原文件所在目录内进行，绝不把子目录文件搬到根目录。
      // 旧实现用扁平 rootDir 计算唯一路径，导致每次远程事件都会把子目录文件
      // 拖到根目录并堆积 -N 后缀副本。
      if (fileRel && path.posix.basename(fileRel) !== desiredName) {
        const dir = path.posix.dirname(fileRel);
        const renameCandidates = new Set(usedPaths);
        renameCandidates.delete(fileRel);
        let candidate = desiredName;
        let counter = 1;
        let newRel =
          dir === '.' ? candidate : ensurePosixPath(path.join(dir, candidate));
        while (
          usedPaths.has(newRel) ||
          (await fileExists(path.join(rootDir, newRel)))
        ) {
          candidate = `${baseName}-${counter}.md`;
          newRel =
            dir === '.' ? candidate : ensurePosixPath(path.join(dir, candidate));
          counter += 1;
        }
        const oldAbs = path.join(rootDir, fileRel);
        const newAbs = path.join(rootDir, newRel);
        if (await fileExists(oldAbs)) {
          await fs.rename(oldAbs, newAbs);
        }
        usedPaths.delete(fileRel);
        usedPaths.add(newRel);
        fileToDoc.delete(fileRel);
        fileToDoc.set(newRel, docId);
        localBatch.delete(fileRel);
        fileRel = newRel;
        if (entry) {
          entry.file = fileRel;
        }
        manifestDirty = true;
      }
      if (!fileRel) {
        // manifest 无条目的新文档：保持原行为落到根目录
        const renameCandidates = new Set(usedPaths);
        fileRel = await ensureUniqueFilePathWithFs(
          rootDir,
          desiredName,
          renameCandidates
        );
      }
      localBatch.delete(fileRel);

      const fileAbs = path.join(rootDir, fileRel);
      let localHash = null;
      let localExists = false;
      if (await fileExists(fileAbs)) {
        localExists = true;
        localHash = await hashFile(fileAbs);
      }

      const localChanged =
        entry?.hash && localHash && entry.hash !== localHash;
      const remoteChanged =
        entry?.revisionId && revisionId && entry.revisionId !== revisionId;

      if (!entry || !localExists) {
        const hash = await downloadDocumentToFile(
          docId,
          token,
          { document_id: docId, revision_id: revisionId, title },
          fileAbs
        );
        manifestDocs[docId] = {
          file: fileRel,
          revisionId,
          title,
          fileType: resolveFileType({ fileType: entry?.fileType }),
          hash,
        };
        usedPaths.add(fileRel);
        manifestDirty = true;
        if (typeof subscribeToDocument === 'function') {
          await subscribeToDocument(docId, resolveFileType(null, manifestDocs[docId]));
        }
        continue;
      }

      if (remoteChanged && localChanged) {
        const conflictRel = buildConflictPath(fileRel);
        const conflictAbs = path.join(rootDir, conflictRel);
        await downloadDocumentToFile(
          docId,
          token,
          { document_id: docId, revision_id: revisionId, title },
          conflictAbs
        );
        continue;
      }

      if (remoteChanged && !localChanged) {
        const hash = await downloadDocumentToFile(
          docId,
          token,
          { document_id: docId, revision_id: revisionId, title },
          fileAbs
        );
        manifestDocs[docId] = {
          ...entry,
          file: fileRel,
          revisionId,
          title,
          fileType: resolveFileType({ fileType: entry?.fileType }),
          hash,
        };
        manifestDirty = true;
        continue;
      }

      if (title && entry?.title !== title) {
        manifestDocs[docId] = {
          ...entry,
          title,
        };
        manifestDirty = true;
      }
    }

    for (const fileRel of Array.from(localBatch)) {
      if (fileRel === 'local') continue;
      const docId = fileToDoc.get(fileRel);
      const fileAbs = path.join(rootDir, fileRel);
      const exists = await fileExists(fileAbs);

      if (!exists) {
        if (docId) {
          const entry = manifestDocs[docId];
          await deleteRemoteDocument(docId, token, resolveFileType(null, entry));
          delete manifestDocs[docId];
          manifestDirty = true;
        }
        continue;
      }

      const hash = await hashFile(fileAbs);
      if (docId) {
        const entry = manifestDocs[docId];
        if (entry?.hash && entry.hash === hash) continue;
        const markdown = await fs.readFile(fileAbs, 'utf8');
        await uploadMarkdownToDocument(docId, token, markdown);
        const meta = await fetchDocumentMeta(docId, token);
        manifestDocs[docId] = {
          ...entry,
          file: fileRel,
          revisionId: meta.revision_id ?? meta.revisionId ?? entry?.revisionId ?? null,
          title: meta.title || entry?.title || '',
          fileType: resolveFileType(null, entry),
          hash,
        };
        manifestDirty = true;
      } else {
        const markdown = await fs.readFile(fileAbs, 'utf8');
        // 防幽灵副本守卫：本地文件无 manifest 条目时，先比对其 H1 标题。
        // 若同标题文档已被跟踪（其他 docId），说明这是一份重复内容——
        // 直接新建会在 wiki 侧再繁殖一个副本（正反馈循环的源头）。
        // 跳过并告警，由人工决定保留哪一份。
        const titleMatch = markdown.match(/^#\s+(.+)\s*$/m);
        const localTitle = titleMatch ? titleMatch[1].trim() : '';
        if (localTitle) {
          const titleKey = localTitle.toLowerCase();
          const trackedTitles = new Set(
            Object.values(manifestDocs)
              .map((e) => (e?.title || '').toLowerCase())
              .filter(Boolean)
          );
          if (trackedTitles.has(titleKey)) {
            console.warn(
              `[realtime-sync] skip creating doc for "${fileRel}": doc titled "${localTitle}" already tracked (ghost-duplicate guard)`
            );
            continue;
          }
        }
        const newDocId = await createDocumentFromMarkdown(spaceId, token, markdown);
        const meta = await fetchDocumentMeta(newDocId, token);
        manifestDocs[newDocId] = {
          file: fileRel,
          revisionId: meta.revision_id ?? meta.revisionId ?? null,
          title: meta.title || '',
          fileType: 'docx',
          hash,
        };
        fileToDoc.set(fileRel, newDocId);
        usedPaths.add(fileRel);
        manifestDirty = true;
        if (typeof subscribeToDocument === 'function') {
          await subscribeToDocument(newDocId, 'docx');
        }
      }
    }

    if (manifestDirty) {
      await writeManifest(rootDir, { spaceId, docs: manifestDocs }, manifestName);
    }
  };

  return {
    handleEvent,
    handleLocalChange,
    processPending,
    isProcessing: () => processing,
    getLastProcessCompletedAt: () => lastProcessCompletedAt,
  };
}

// 在 wikid/ 全目录递归查找指定文件名（不含根目录自身），返回完整路径或 null。
// 用于 guard 3：避免为已有子目录文件在根目录再创建副本。
async function findSubdirFile(rootDir, targetName) {
  const lower = targetName.toLowerCase();
  async function walk(dir) {
    for (const it of await fs.readdir(dir, { withFileTypes: true })) {
      const fp = path.join(dir, it.name);
      if (it.isDirectory()) {
        const found = await walk(fp);
        if (found) return found;
      } else if (it.name.toLowerCase() === lower) {
        return fp;
      }
    }
    return null;
  }
  // 只搜子目录，不搜根目录本身
  for (const it of await fs.readdir(rootDir, { withFileTypes: true })) {
    if (it.isDirectory()) {
      const found = await walk(path.join(rootDir, it.name));
      if (found) return found;
    }
  }
  return null;
}

export async function syncNewDocsFromWiki({
  rootDir,
  spaceId,
  token,
  logEvents,
  subscribeToDocument,
  manifestName,
}) {
  const manifest = await readManifest(rootDir, manifestName);
  const manifestDocs = manifest.docs || {};
  const existingDocIds = new Set(Object.keys(manifestDocs));
  const usedPaths = new Set();
  // 防幽灵副本守卫：已被跟踪的标题集合。wiki 侧重复文档（同标题不同 docId）
  // 不再下载为 -N 本地副本，避免本地/远端副本正反馈繁殖。
  const trackedTitles = new Set(
    Object.values(manifestDocs)
      .map((e) => (e?.title || '').toLowerCase())
      .filter(Boolean)
  );
  for (const entry of Object.values(manifestDocs)) {
    if (entry?.file) usedPaths.add(entry.file);
  }

  const wikiDocs = [];
  await collectWikiDocNodes(spaceId, token, undefined, wikiDocs);

  let added = 0;
  let manifestDirty = false;

  for (const node of wikiDocs) {
    const docId = node.documentId;
    if (!docId || existingDocIds.has(docId)) continue;

    let meta;
    try {
      meta = await fetchDocumentMeta(docId, token);
    } catch (err) {
      console.warn(`[realtime-sync] poll meta failed for ${docId}: ${err.message || err}`);
      continue;
    }

    const title = meta.title || node.title || '';
    const titleKey = title.toLowerCase();
    const baseName = sanitizeFilename(title) || docId;
    const revisionId = meta.revision_id ?? meta.revisionId ?? null;

    // 守卫 1（标题级）：标题已被 manifest 中的其他 docId 跟踪 → 克隆，跳过
    if (title && trackedTitles.has(titleKey)) {
      if (logEvents) {
        console.log(
          `[realtime-sync] skip duplicate wiki doc ${docId} titled "${title}" (ghost-duplicate guard)`
        );
      }
      continue;
    }

    // 守卫 2（路径匹配）：查找 manifest 里标题相同的条目。
    // 若已有同标题文档在 manifest（路径可能在子目录），则跳过新建——
    // 避免 sync 把已有子目录文档拉到根目录创建重复副本。
    const existingEntry = [...Object.values(manifestDocs)].find(
      (e) => e?.title && e.title.toLowerCase() === titleKey
        && e.file && !e.file.startsWith('import-')
    );
    if (existingEntry) {
      if (logEvents) {
        console.log(
          `[realtime-sync] skip wiki doc ${docId} titled "${title}": already tracked at ${existingEntry.file} (path-match guard)`
        );
      }
      continue;
    }

    // 守卫 3（文件系统扫描）：扫描 wikid/ 全目录，看是否有同名 .md
    // 文件已存在于子目录里（可能是备份恢复、手动创建、或 manifest 被清后残留）。
    // 有则跳过，避免在根目录再创建一份。
    const subTitleFile = await findSubdirFile(rootDir, `${baseName}.md`);
    if (subTitleFile) {
      if (logEvents) {
        console.log(
          `[realtime-sync] skip wiki doc ${docId} titled "${title}": local file exists at ${path.relative(rootDir, subTitleFile)}`
        );
      }
      continue;
    }

    const fileRel = await ensureUniqueFilePathWithFs(rootDir, `${baseName}.md`, usedPaths);
    const fileAbs = path.join(rootDir, fileRel);

    const hash = await downloadDocumentToFile(
      docId,
      token,
      { document_id: docId, revision_id: revisionId, title },
      fileAbs
    );

    manifestDocs[docId] = {
      file: fileRel,
      revisionId,
      title,
      fileType: resolveFileType({ fileType: node.objType }),
      hash,
    };
    usedPaths.add(fileRel);
    existingDocIds.add(docId);
    if (title) trackedTitles.add(titleKey);
    manifestDirty = true;
    added += 1;

    if (typeof subscribeToDocument === 'function') {
      await subscribeToDocument(docId, resolveFileType(null, manifestDocs[docId]));
    }
  }

  if (manifestDirty) {
    await writeManifest(rootDir, { spaceId, docs: manifestDocs }, manifestName);
  }

  if (logEvents) {
    console.log(`[realtime-sync] poll complete (new docs: ${added})`);
  }

  return { added };
}
