import { PDFDocument } from "pdf-lib";

export class PdfSliceService {
  /**
   * Extracts a contiguous or bounded range of pages from a source PDF buffer.
   * @param {Buffer | Uint8Array} sourceBuffer - Raw PDF file bytes
   * @param {number} rawStartPage - 1-based start page number
   * @param {number} rawEndPage - 1-based end page number
   * @returns {Promise<{ buffer: Buffer, pageCount: number, startPage: number, endPage: number, totalSourcePages: number }>}
   */
  async extractPageRange(sourceBuffer, rawStartPage = 1, rawEndPage = 1) {
    if (!sourceBuffer || sourceBuffer.length === 0) {
      throw new Error("Invalid or empty source PDF buffer.");
    }

    const srcDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: true });
    const totalPages = srcDoc.getPageCount();

    if (totalPages === 0) {
      throw new Error("Source PDF contains no pages.");
    }

    // Clamp 1-based page indices
    let startPage = parseInt(rawStartPage, 10);
    let endPage = parseInt(rawEndPage, 10);

    if (isNaN(startPage) || startPage < 1) startPage = 1;
    if (isNaN(endPage) || endPage < startPage) endPage = startPage;

    startPage = Math.max(1, Math.min(startPage, totalPages));
    endPage = Math.max(startPage, Math.min(endPage, totalPages));

    const subDoc = await PDFDocument.create();

    // Copy the selected zero-based page index array
    const pageIndices = [];
    for (let p = startPage - 1; p < endPage; p++) {
      pageIndices.push(p);
    }

    const copiedPages = await subDoc.copyPages(srcDoc, pageIndices);
    for (const page of copiedPages) {
      subDoc.addPage(page);
    }

    const outputBytes = await subDoc.save();

    return {
      buffer: Buffer.from(outputBytes),
      pageCount: pageIndices.length,
      startPage,
      endPage,
      totalSourcePages: totalPages,
    };
  }

  /**
   * Helper to retrieve total page count of a PDF document
   * @param {Buffer | Uint8Array} sourceBuffer 
   * @returns {Promise<number>}
   */
  async getPdfPageCount(sourceBuffer) {
    try {
      const srcDoc = await PDFDocument.load(sourceBuffer, { ignoreEncryption: true });
      return srcDoc.getPageCount();
    } catch {
      return 0;
    }
  }
}

export const pdfSliceService = new PdfSliceService();
export default pdfSliceService;

