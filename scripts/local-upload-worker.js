// Local-authoritative worker entry point. This intentionally delegates to the
// upload-only implementation and never starts websocket or remote deletion.
import './upload.js';
