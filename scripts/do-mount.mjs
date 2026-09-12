// 直接用 nodeToken 移动 BSP 到容器
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes, moveWikiNode } from '../api/feishu.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const BSP_NODE_TOKEN = 'YIRYwdd4RiR7';
const PARENT_TOKEN = 'UBsDwaAjiiVz';

console.log('=== 移动 BSP doc ===');
try {
  await moveWikiNode(spaceId, token, BSP_NODE_TOKEN, PARENT_TOKEN);
  console.log('  ✅ 成功');
} catch (e) {
  console.log('  失败:', e.message.slice(0, 100));
}

// 更新 manifest
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
for (const [docId, e] of Object.entries(m.docs)) {
  if (e.file?.includes('WhatsApp-BSP-API开放现状评估报告')) {
    e.revisionId = 1;
    console.log(`  更新 revisionId: ${docId}`);
  }
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('  manifest 已更新');
