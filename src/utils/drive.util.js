/**
 * Converts a Google Drive sharing link to a direct download URL if applicable.
 */
export function getDriveDownloadUrl(link) {
  if (!link) return "";
  const match = link.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/uc?export=download&id=${match[1]}` : link;
}

const VALID_PDF_CONTENT_TYPES = ["application/pdf", "application/octet-stream"];

export function isValidPdfContentType(contentType) {
  return VALID_PDF_CONTENT_TYPES.some((type) => contentType && contentType.includes(type));
}

export default { getDriveDownloadUrl, isValidPdfContentType };
