import fs from 'node:fs/promises';
import path from 'node:path';
import { readConfig, requireConfigValue, resolvePath } from '../config.js';
import { readToken } from '../api/helpers.js';
import { setTokenReloader, fetchWikiNodes } from '../api/feishu.js';

const config = await readConfig();
const TOKEN_PATH = resolvePath(requireConfigValue(config, 'tokenPath'));
let token = await readToken(TOKEN_PATH);
setTokenReloader(() => readToken(TOKEN_PATH));
const spaceId = requireConfigValue(config, 'wikiSpaceId');

// 查飞书 wiki 树有多少 import-mt* 节点
const all = [];
async function walk(pt) {
  for (const n of await fetchWikiNodes(spaceId, token, pt)) {
    all.push(n);
    if (n.has_child && (n.node_token || n.nodeToken)) await walk(n.node_token || n.nodeToken);
  }
}
await walk(undefined);
console.log(`飞书 wiki 总节点: ${all.length}`);
const importNodes = all.filter(n => n.title?.startsWith('import-'));
console.log(`import-mt* 节点: ${importNodes.length}`);
if (importNodes.length > 0) {
  console.log('前 5 个:');
  for (const n of importNodes.slice(0, 5)) {
    console.log(`  ${n.title} has_child=${n.has_child}`);
  }
}

// 查 manifest
const m = JSON.parse(await fs.readFile('wikid/.feishu-sync.json', 'utf8'));
const manifestImportCount = Object.values(m.docs).filter(e => e.title?.startsWith('import-') || e.file?.includes('import-')).length;
console.log(`\nmanifest 中 import-mt*: ${manifestImportCount} 条`);
console.log(`manifest 总条目: ${Object.keys(m.docs).length}`);
