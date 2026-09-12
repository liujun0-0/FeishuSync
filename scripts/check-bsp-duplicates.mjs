// 查飞书端 WhatsApp-BSP-API开放评估 的所有重复文档
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes, fetchAllBlocks } from '../api/feishu.js';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const all = [];
async function walk(pt, depth) {
  for (const n of await fetchWikiNodes(spaceId, token, pt)) {
    all.push({ ...n, depth });
    if (n.has_child && (n.node_token || n.nodeToken)) {
      await walk(n.node_token || n.nodeToken, depth + 1);
    }
  }
}
await walk(undefined, 0);

console.log(`飞书 wiki 总节点: ${all.length}\n`);

// 找所有标题含 WhatsApp-BSP-API 的节点
const bspNodes = all.filter(n => (n.title || '').includes('WhatsApp-BSP-API'));
console.log(`=== WhatsApp-BSP-API 相关节点 (${bspNodes.length}) ===`);
for (const n of bspNodes) {
  const hasChild = n.has_child ?? n.hasChild;
  console.log(`  [depth=${n.depth}] "${n.title}"`);
  console.log(`    docId: ${n.obj_token}`);
  console.log(`    nodeToken: ${n.node_token}`);
  console.log(`    has_child: ${hasChild}`);
}

// 检查每个的内容块数
console.log('\n=== 各节点内容块数 ===');
for (const n of bspNodes) {
  try {
    const blocks = await fetchAllBlocks(n.obj_token, token);
    console.log(`  "${n.title}" (${n.obj_token.slice(0,12)}): ${blocks.length} blocks`);
  } catch (e) {
    console.log(`  "${n.title}": 读取失败 ${e.message.slice(0, 50)}`);
  }
}
