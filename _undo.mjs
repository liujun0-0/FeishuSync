import fs from 'node:fs/promises';
const token = (await fs.readFile('./user-token.txt', 'utf8')).trim();
const SPACE = '7587058718827645920';

async function fc(p) {
  const url = p ? `https://open.feishu.cn/open-apis/wiki/v2/spaces/${SPACE}/nodes?parent_node_token=${p}&page_size=50` : `https://open.feishu.cn/open-apis/wiki/v2/spaces/${SPACE}/nodes?page_size=50`;
  return (await (await fetch(url, { headers: { Authorization: `Bearer ${token}` } })).json()).data?.items || [];
}

async function moveDoc(docId, parentToken) {
  const r = await fetch(`https://open.feishu.cn/open-apis/wiki/v2/spaces/${SPACE}/nodes/move_docs_to_wiki`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      obj_type: 'docx',
      obj_token: docId,
      parent_wiki_token: parentToken || undefined
    })
  });
  const d = await r.json();
  console.log(`move docId=${docId}:`, d.msg);
}

async function deleteDoc(docId) {
  const r = await fetch(`https://open.feishu.cn/open-apis/drive/v1/files/${docId}?type=docx`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
  const d = await r.json();
  console.log(`delete docId=${docId}:`, d.msg);
}

// Find "." container
const root = await fc(undefined);
const dotContainer = root.find(n => n.title === '.');
console.log('"." container:', dotContainer ? `YES (node_token=${dotContainer.node_token}, obj_token=${dotContainer.obj_token})` : 'NO');

if (dotContainer) {
  // Its children are the misplaced docs
  const children = await fc(dotContainer.node_token);
  console.log('Children of ".":', children.map(c => `${c.title} obj_token=${c.obj_token}`).join(', '));

  // Move each back to wiki root
  for (const c of children) {
    await moveDoc(c.obj_token, undefined);
  }

  // Delete the "." container (empty after move)
  await deleteDoc(dotContainer.obj_token);
}

// Move "客户营销属性管理" back to 产品文档
const 客户营销 = 'K1BWdj0PSo1yl0xdCYjc18cvnFg';  // obj_token from earlier
// Find 飞书深诺产品文档
async function findContainer(title) {
  async function walk(p, depth=0) {
    for (const n of await fc(p)) {
      if (n.title === title) return n;
      if (n.has_child) {
        const found = await walk(n.node_token, depth+1);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(undefined);
}

const prod = await findContainer('飞书深诺产品文档');
if (prod) {
  console.log(`Moving 客户营销属性管理 back to ${prod.title} (${prod.node_token})`);
  await moveDoc('K1BWdj0PSo1yl0xdCYjc18cvnFg', prod.node_token);
}