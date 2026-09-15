// Remote deletion boundary. Deletion is intentionally isolated so callers can
// apply pending-delete/confirmation policies before invoking the API.
import { deleteRemoteDocument } from './feishu.js';

export { deleteRemoteDocument };
