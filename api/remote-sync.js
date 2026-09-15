// Remote-side synchronization boundary. Keeping destructive operations here
// makes the local-authoritative worker unable to call them accidentally.
export {
  downloadDocumentToFile,
  deleteRemoteDocument,
  moveWikiNode,
  renameWikiNode,
  fetchDocumentMeta,
  fetchAllBlocks,
} from './feishu.js';
