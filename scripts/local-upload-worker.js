// Local-authoritative worker entry point. This intentionally delegates to the
// upload-only implementation and never starts websocket or remote deletion.
import { main } from './upload.js';
main().catch((err) => { console.error(err.message || err); process.exit(1); });
