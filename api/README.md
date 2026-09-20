# api

飞书同步的底层模块，不作为用户入口直接运行。

- `feishu.js`：飞书 Wiki、Drive、Docx API 操作。
- `helpers.js`：路径过滤、token、manifest 和本地监听辅助函数。
- `sync-state.js`：同步状态持久化。
- `move-transaction.js`：文档移动事务状态机。
- `merge.js`：正文三方合并。

修改这里的代码后，应执行 `npm test`，并确认本地到远程的路径映射没有变化。
