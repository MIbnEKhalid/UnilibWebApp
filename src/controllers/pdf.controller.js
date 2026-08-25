import { bookRepository } from "../db/index.js";
import { getDriveDownloadUrl, isValidPdfContentType } from "../utils/drive.util.js";
import fetch from "node-fetch";

// Stream PDF from Google Drive
export async function streamPdfFromDrive(req, res) {
  const { bookId, filename } = req.params;

  try {
    const isAdmin = Boolean(req.session?.user);
    const book = await bookRepository.findById(bookId, { mustBeVisible: !isAdmin });

    if (!book) return res.status(404).send("Book not found");

    const downloadUrl = getDriveDownloadUrl(book.link);
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      return res.status(500).send(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (!isValidPdfContentType(contentType)) {
      return res.status(500).send(`Invalid PDF URL - received content type: ${contentType}`);
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    response.body.pipe(res);
  } catch (error) {
    console.error("Error streaming PDF:", error);
    res.status(500).send("Internal Server Error");
  }
}

export default { streamPdfFromDrive };
