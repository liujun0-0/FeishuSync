// Remote read/download boundary. Keeping these operations separate makes the
// synchronizer testable and prevents download code from reaching delete APIs.
import { downloadDocumentToFile, fetchDocumentMeta, fetchAllBlocks, fetchChildrenCount } from './feishu.js';

export { downloadDocumentToFile, fetchDocumentMeta, fetchAllBlocks, fetchChildrenCount };
