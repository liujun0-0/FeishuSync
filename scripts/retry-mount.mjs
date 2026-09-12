// 等更久再试挂载
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, moveWikiNode, fetchWikiNodes, apiGet } from '../api/feishu.js';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const MANIFEST = path.join(ROOT, 'wikid/.feishu-sync.json');

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const DOC_ID = 'CZZqdWirPor31px4MC7cio5YnFb';
const PARENT_TITLE = 'WhatsApp-BSP-API开放评估';

// 多等几次
for (let attempt = 1; attempt <= 5; attempt++) {
  console.log(`\n=== 尝试 ${attempt}/5 ===`);
  await new Promise(r => setTimeout(r, 5000)); // 等 5 秒
  
  // 试 get_node
  try {
    const info = await apiGet('/wiki/v2/spaces/get_node', token, { token: DOC_ID });
    if (info?.node?.node_token) {
      const bspToken = info.node.node_token;
      console.log('  get_node 找到:', bspToken.slice(0, 15));
      // 找容器
      const all = [];
      async function walk(parentToken) {
        for (const n of await fetchWikiNodes(spaceId, token, parentToken)) {
          all.push(n);
          if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
        }
      }
      await walk(undefined);
      const parent = all.find(n => n.title === PARENT_TITLE);
      if (parent) {
        try {
          await moveWikiNode(spaceId, token, bspToken, parent.node_token || parent.nodeToken);
          console.log('  ✅ 已挂到容器');
          
          // 更新 manifest revisionId
          const m = JSON.parse(await fs.readFile(MANIFEST, 'utf8'));
          if (m.docs[DOC_ID]) {
            m.docs[DOC_ID].revisionId = 1;
            m.updatedAt = new Date().toISOString();
            await fs.writeFile(MANIFEST, JSON.stringify(m, null, 2) + '\n');
            console.log('  manifest 已更新');
          }
          break;
        } catch (e) {
          console.log('  移动失败:', e.message.slice(0, 80));
        }
      }
      break;
    }
  } catch (e) {
    console.log('  get_node:', e.message.slice(0, 60));
  }
}
