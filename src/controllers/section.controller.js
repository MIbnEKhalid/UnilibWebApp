import { sectionRepository, bookRepository } from "../db/index.js";
import renderPage from "../utils/render.util.js";
import { getDriveDownloadUrl, isValidPdfContentType } from "../utils/drive.util.js";
import fetch from "node-fetch";
import { PDFDocument } from "pdf-lib";
import { invalidateBookCache, invalidateIndexCaches } from "../services/cache.service.js";

function validateSectionInput({ page_start, page_end, name, section_number, requireSectionNumber = false }) {
  if (requireSectionNumber && (!section_number || !Number.isInteger(section_number) || section_number < 1)) {
    return "Section number must be a positive integer";
  }
  if (!page_start || !Number.isInteger(page_start) || page_start < 1) {
    return "Start page must be a positive integer";
  }
  if (!page_end || !Number.isInteger(page_end) || page_end < 1) {
    return "End page must be a positive integer";
  }
  if (page_start > page_end) {
    return "Start page cannot be greater than end page";
  }
  if (typeof name !== "string" || !name.trim() || name.length > 200) {
    return "Section name must be a non-empty string with maximum 200 characters";
  }
  return null;
}

// Render sections management page for a book
export async function renderSectionsPage(req, res) {
  try {
    const data = await sectionRepository.getSectionsByBookId(req.params.bookId);
    if (!data) return res.status(404).send("Book not found");

    return renderPage(req, res, "mainPages/Sections.handlebars", true, {
      book: data.book,
      sections: data.sections,
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).send("Internal Server Error");
  }
}

// Add a section to a book
export async function addSection(req, res) {
  const bookId = req.params.bookId;
  const { page_start, page_end, name } = req.body;

  const error = validateSectionInput({ page_start, page_end, name });
  if (error) return res.status(400).json({ error });

  try {
    const username = req.session?.user?.username || "unknown";
    const { newSection } = await sectionRepository.addSection(bookId, {
      page_start,
      page_end,
      name,
      username,
    });

    Promise.all([invalidateBookCache(bookId), invalidateIndexCaches()]).catch((e) =>
      console.error("Cache invalidation error after section add:", e)
    );

    res.status(201).json({ message: "Section added successfully!", section: newSection });
  } catch (err) {
    if (err.message === "BOOK_NOT_FOUND") return res.status(404).json({ error: "Book not found" });
    console.error("Error adding section:", err);
    res.status(500).json({ error: "Failed to add section. Please try again." });
  }
}

// Edit a section
export async function editSection(req, res) {
  const sectionId = req.params.sectionId;
  const { section_number, page_start, page_end, name } = req.body;

  if (!sectionId) return res.status(400).json({ error: "Invalid section ID" });

  const error = validateSectionInput({ page_start, page_end, name, section_number, requireSectionNumber: true });
  if (error) return res.status(400).json({ error });

  try {
    const username = req.session?.user?.username || "unknown";
    const { updatedSection, bookId } = await sectionRepository.updateSection(sectionId, {
      section_number,
      page_start,
      page_end,
      name,
      username,
    });

    Promise.all([invalidateBookCache(bookId), invalidateIndexCaches()]).catch((e) =>
      console.error("Cache invalidation error after section edit:", e)
    );

    res.status(200).json({ message: "Section updated successfully!", section: updatedSection });
  } catch (err) {
    if (err.message === "SECTION_NOT_FOUND") return res.status(404).json({ error: "Section not found" });
    if (err.code === "DUPLICATE_SECTION_NUMBER" || err.message.includes("already exists")) {
      return res.status(409).json({ error: err.message });
    }
    console.error("Error updating section:", err);
    res.status(500).json({ error: "Failed to update section. Please try again." });
  }
}

// Delete a section
export async function deleteSection(req, res) {
  const sectionId = req.params.sectionId;
  if (!sectionId) return res.status(400).json({ error: "Invalid section ID" });

  try {
    const username = req.session?.user?.username || "unknown";
    const { deletedSection, bookId } = await sectionRepository.deleteSection(sectionId, { username });

    Promise.all([invalidateBookCache(bookId), invalidateIndexCaches()]).catch((e) =>
      console.error("Cache invalidation error after section delete:", e)
    );

    res.status(200).json({ message: "Section deleted successfully!", deletedSection });
  } catch (err) {
    if (err.message === "SECTION_NOT_FOUND") return res.status(404).json({ error: "Section not found" });
    console.error("Error deleting section:", err);
    res.status(500).json({ error: "Failed to delete section. Please try again." });
  }
}

// Bulk delete sections
export async function bulkDeleteSections(req, res) {
  const bookId = req.params.bookId;
  const { sectionIds } = req.body;

  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    return res.status(400).json({ error: "sectionIds must be a non-empty array" });
  }
  if (sectionIds.length > 50) {
    return res.status(400).json({ error: "Cannot delete more than 50 sections at once" });
  }

  const invalid = sectionIds.some((id) => !(Number.isInteger(id) && id > 0) && !(typeof id === "string" && id.trim()));
  if (invalid) {
    return res.status(400).json({ error: "All section IDs must be positive integers or non-empty strings" });
  }

  try {
    const username = req.session?.user?.username || "unknown";
    const { deletedSections, deletedCount } = await sectionRepository.bulkDeleteSections(bookId, sectionIds, {
      username,
    });

    if (deletedCount === 0) return res.status(404).json({ error: "No valid sections found to delete" });

    Promise.all([invalidateBookCache(bookId), invalidateIndexCaches()]).catch((e) =>
      console.error("Cache invalidation error after bulk section delete:", e)
    );

    res.status(200).json({
      message: `Successfully deleted ${deletedCount} section(s)`,
      deletedSections,
      deletedCount,
    });
  } catch (err) {
    if (err.message === "BOOK_NOT_FOUND") return res.status(404).json({ error: "Book not found" });
    console.error("Error in bulk delete:", err);
    res.status(500).json({ error: "Failed to delete sections. Please try again." });
  }
}

// Download section PDF
export async function downloadSectionPdf(req, res) {
  const { bookId, sectionId } = req.params;

  try {
    const data = await sectionRepository.getSectionsByBookId(bookId);
    if (!data) return res.status(404).send("Book not found");

    const { book, sections } = data;
    const section = sections.find((s) => String(s.id) === String(sectionId));
    if (!section) return res.status(404).send("Section not found");

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
    res.setHeader("Content-Disposition", `attachment; filename="${book.name}_${section.name}.pdf"`);

    const pdfData = await response.arrayBuffer();
    const originalDoc = await PDFDocument.load(pdfData);
    const newDoc = await PDFDocument.create();

    const pageIndexes = Array.from(
      { length: section.page_end - section.page_start + 1 },
      (_, i) => section.page_start - 1 + i
    );
    const pages = await newDoc.copyPages(originalDoc, pageIndexes);
    pages.forEach((page) => newDoc.addPage(page));

    const extractedPdfBytes = await newDoc.save();
    res.send(Buffer.from(extractedPdfBytes));

    setImmediate(async () => {
      try {
        await bookRepository.incrementViews(bookId);
        await invalidateBookCache(bookId);
      } catch (error) {
        console.error("Error tracking section download view:", error);
      }
    });
  } catch (error) {
    console.error("Error downloading section PDF:", error);
    res.status(500).send("Internal Server Error");
  }
}

export default {
  renderSectionsPage,
  addSection,
  editSection,
  deleteSection,
  bulkDeleteSections,
  downloadSectionPdf,
};
