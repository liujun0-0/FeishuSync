import fs from 'node:fs/promises';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { createDocument, uploadMarkdownToDocument } from '../api/feishu.js';

if (typeof fetch !== 'function') {
  console.error('This CLI requires Node.js 18+ (global fetch).');
  process.exit(1);
}

async function main() {
  const config = await readConfig();
  const inputPathArg = process.argv[2];
  if (!inputPathArg) {
    console.error('Usage: npm run upload <markdown-file>');
    process.exit(1);
  }
  const inputPath = resolvePath(inputPathArg);

  const markdown = await fs.readFile(inputPath, 'utf8');
  const token = await readToken(resolvePath(requireConfigValue(config, 'tokenPath')));

  // 从 markdown 提取 H1 标题作为飞书文档标题
  const titleMatch = markdown.match(/^#\s+(.+)\s*$/m);
  const title = titleMatch ? titleMatch[1].trim() : require('node:path').basename(inputPath, '.md');

  // 创建文档（用 H1 标题，不用 import-{ts}.md）
  const { documentId } = await createDocument(token, title);

  // 用 block-by-block 路径上传（走我们的 mermaid→block_type=40 代码）
  // 失败时清理空 doc，避免留下半成品
  try {
    await uploadMarkdownToDocument(documentId, token, markdown);
  } catch (err) {
    try {
      const { deleteRemoteDocument } = await import('../api/feishu.js');
      await deleteRemoteDocument(documentId, token, 'docx');
    } catch {}
    throw err;
  }
  console.log(`Uploaded: ${title} -> ${documentId}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
