import fs from 'node:fs/promises';
const token = (await fs.readFile('./user-token.txt', 'utf8')).trim();
const SPACE = '7587058718827645920';
async function fc(p) {
  const url = p ? `https://open.feishu.cn/open-apis/wiki/v2/spaces/${SPACE}/nodes?parent_node_token=${p}&page_size=50` : `https://open.feishu.cn/open-apis/wiki/v2/spaces/${SPACE}/nodes?page_size=50`;
  return (await (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).json()).data?.items || [];
}
const root = await fc(undefined);
const exp = root.find(n => n.title === '_experiment');
console.log('_experiment container in Feishu:', exp ? `YES (token=${exp.node_token})` : 'NO');
if (exp) {
  const children = await fc(exp.node_token);
  console.log('Children:');
  for (const c of children) console.log(`  - ${c.title}  has_child=${c.has_child}`);
}