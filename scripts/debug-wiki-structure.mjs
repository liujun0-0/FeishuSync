// 查看飞书 wiki 树中"非群发"相关节点的完整层级
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes, collectWikiDocNodes } from '../api/feishu.js';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

const all = [];
await collectWikiDocNodes(spaceId, token, undefined, all);

// 找所有含"非群发"的节点
const sheji = all.filter(n => (n.title || '').includes('非群发') || (n.title || '').includes('Flow'));
console.log(`共 ${sheji.length} 个含"非群发/Flow"的节点:`);
for (const n of sheji) {
  console.log(`  ${n.title} (${n.documentId}) hasChild=${n.hasChild}`);
}

// 查飞书深诺技术文档下的所有节点
console.log('\n飞书深诺技术文档下的所有节点:');
const techDoc = all.find(n => n.title === '飞书深诺技术文档');
if (techDoc) {
  const children = all.filter(n => {
    // 简单判断：飞书深诺技术文档的子节点应该在它的路径下
    // 我们直接从 wiki 树遍历
    return true; // 先全部列出
  });
}

// 直接用 fetchWikiNodes 查根容器
const rootNodes = await fetchWikiNodes(spaceId, token, undefined);
const rootContainer = rootNodes.find(n => n.title === '飞书深诺文档集合');
if (rootContainer) {
  const techNodes = await fetchWikiNodes(spaceId, token, rootContainer.node_token || rootContainer.nodeToken);
  const techDocNode = techNodes.find(n => n.title === '飞书深诺技术文档');
  if (techDocNode) {
    const techDocToken = techDocNode.node_token || techDocNode.nodeToken;
    const children = await fetchWikiNodes(spaceId, token, techDocToken);
    console.log('\n飞书深诺技术文档 → 直接子节点:');
    for (const c of children) {
      const hasChild = c.has_child ?? c.hasChild;
      console.log(`  ${c.title}  has_child=${hasChild}  obj_token=${c.obj_token?.slice(0,12)}`);
      if (hasChild && c.node_token) {
        const grandchildren = await fetchWikiNodes(spaceId, token, c.node_token);
        for (const gc of grandchildren) {
          console.log(`    └─ ${gc.title}  obj_token=${gc.obj_token?.slice(0,12)}`);
        }
      }
    }
  }
}
