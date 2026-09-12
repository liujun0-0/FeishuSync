// 用完整 node_token 移动 BSP 到容器
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, moveWikiNode, apiGet } from '../api/feishu.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const BSP_NODE_TOKEN = 'YIRYwdd4RiR7XKkcizFcahwJnRb';
const PARENT_NODE_TOKEN = 'UBsDwaAjiiVz0Hk';

console.log('=== 移动 BSP doc ===');
console.log(`  BSP nodeToken: ${BSP_NODE_TOKEN}`);
console.log(`  容器 nodeToken: ${PARENT_NODE_TOKEN}`);
try {
  await moveWikiNode(spaceId, token, BSP_NODE_TOKEN, PARENT_NODE_TOKEN);
  console.log('  ✅ 成功移动');
} catch (e) {
  console.log('  失败:', e.message.slice(0, 100));
}

// 验证
console.log('\n=== 验证 ===');
try {
  const info = await apiGet('/wiki/v2/spaces/get_node', token, { token: BSP_NODE_TOKEN });
  console.log('  标题:', info?.node?.title);
  console.log('  node_token:', info?.node?.node_token);
} catch (e) {
  console.log('  验证失败:', e.message.slice(0, 80));
}

// 更新 manifest
const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
const mBsp = Object.entries(m.docs).find(([k, e]) => e.file?.includes('WhatsApp-BSP-API开放现状评估报告'));
if (mBsp) {
  mBsp[1].revisionId = 1;
  console.log(`\n  manifest 更新 revisionId: ${mBsp[0]}`);
}
m.updatedAt = new Date().toISOString();
await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
console.log('  manifest 已保存');
