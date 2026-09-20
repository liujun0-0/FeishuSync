# scripts

这里存放实际执行同步工作的脚本。常用入口：

- `auth.js`：获取和续期用户或应用身份 token。
- `sync.js`：常驻同步进程。
- `update.js`：执行一次全量对账。
- `local-watch.js`：监听本地文件变化。
- `upload.js` / `download.js`：单文档上传和下载。
- `watchdog.js`：监督认证和同步进程。
- `status.mjs`：输出队列、冲突和文档统计。

脚本之间存在相互引用，不要随意改名或移动；如需人工操作，优先使用 `npm run` 或 `ops/launcher/`。
