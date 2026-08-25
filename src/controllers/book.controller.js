import { bookRepository } from "../db/index.js";
import config from "../config/index.js";
import { renderPage, renderCachedPage } from "../utils/render.util.js";
import { renderError } from "mbkauthe";
import {
  invalidateIndexCaches,
  invalidateBookCache,
  invalidateBookCaches,
} from "../services/cache.service.js";

function normalizeSemesterFilter(semester) {
  if (!semester || semester === "all") return "all";
  if (Array.isArray(semester)) {
    const list = semester.map((s) => String(s).trim()).filter(Boolean);
    return list.includes("all") ? "all" : list;
  }
  if (typeof semester === "string") {
    if (semester.includes(",")) {
      const list = semester.split(",").map((s) => s.trim()).filter(Boolean);
      return list.includes("all") ? "all" : list;
    }
    return [semester.trim()];
  }
  return [String(semester)];
}

// Reusable function to fetch and render books with pagination and filters
export async function renderUnilibBooks(req, res, view, data = {}) {
  const {
    page = 1,
    limit = config.defaultLimit,
    semester = config.defaultSemester,
    category = "all",
    search = "",
  } = req.query;

  const semesterFilter = normalizeSemesterFilter(semester);
  const isAdminView = view === "mainPages/Book.handlebars";

  try {
    const { books, pagination } = await bookRepository.findBooks({
      page,
      limit,
      semester: semesterFilter,
      category,
      search,
      isAdminView,
    });

    return renderPage(req, res, view, true, {
      ...data,
      books,
      pagination,
      filters: { semester: semesterFilter, category, search },
    });
  } catch (err) {
    console.error("Error fetching books:", err);
    return res.status(500).send("Internal Server Error");
  }
}

// Route for '/' with Edge CDN headers and distributed Redis caching
export async function renderIndex(req, res) {
  const {
    page = "1",
    limit = config.defaultLimit,
    semester = config.defaultSemester,
    category = "all",
    search = "",
  } = req.query;

  const queryString = new URLSearchParams({ page, limit, semester, category, search }).toString();
  const semesterFilter = normalizeSemesterFilter(semester);

  try {
    const { books, pagination } = await bookRepository.findBooks({
      page,
      limit,
      semester: semesterFilter,
      category,
      search,
      isAdminView: false,
    });

    return renderCachedPage(req, res, {
      view: "mainPages/index.handlebars",
      data: {
        books,
        pagination,
        filters: { semester: semesterFilter, category, search },
      },
      cacheKey: `index:${queryString}`,
      ttl: 120,
      sMaxAge: 120,
      staleWhileRevalidate: 60,
      headers: { "X-Query-Params": queryString },
    });
  } catch (err) {
    console.error("Error fetching books for index:", err);
    return res.status(500).send("Internal Server Error");
  }
}

// Admin dashboard view
export async function renderDashboard(req, res) {
  await renderUnilibBooks(req, res, "mainPages/Book.handlebars");
}

// Admin edit book page
export async function renderEditBookPage(req, res) {
  try {
    const book = await bookRepository.findById(req.params.id);
    if (!book) return res.status(404).json({ error: "Book not found" });

    return renderPage(req, res, "mainPages/BookForm.handlebars", true, {
      isEdit: true,
      id: req.params.id,
      book,
    });
  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
}

// Admin update book API
export async function editBook(req, res) {
  const bookId = req.params.id;
  const { name, category, description, imageURL, link, semester, main, visible } = req.body;

  try {
    await bookRepository.update(bookId, {
      name,
      category,
      description,
      imageURL,
      link,
      semester,
      main,
      visible,
    });

    Promise.all([invalidateBookCache(bookId), invalidateIndexCaches()]).catch((e) =>
      console.error("Cache invalidation error after edit:", e)
    );

    res.status(200).json({ message: "Book updated successfully!" });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
}

// Admin delete book API
export async function deleteBook(req, res) {
  const bookId = req.params.id;
  try {
    await bookRepository.delete(bookId);
    Promise.all([invalidateBookCache(bookId), invalidateIndexCaches()]).catch((e) =>
      console.error("Cache invalidation error after delete:", e)
    );
    res.status(200).json({ message: "Book deleted successfully!" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
}

// Admin bulk book visibility toggle
export async function bulkVisibility(req, res) {
  const { bookIds, visible } = req.body;

  if (!Array.isArray(bookIds) || bookIds.length === 0) {
    return res.status(400).json({ error: "Invalid book IDs" });
  }
  if (typeof visible !== "boolean") {
    return res.status(400).json({ error: "Visible must be a boolean value" });
  }

  try {
    const updatedCount = await bookRepository.bulkUpdateVisibility(bookIds, visible);
    Promise.all([invalidateIndexCaches(), invalidateBookCaches(bookIds)]).catch((e) =>
      console.error("Cache invalidation error after bulk visibility update:", e)
    );

    res.status(200).json({
      message: `${updatedCount} book(s) ${visible ? "shown" : "hidden"} successfully!`,
      count: updatedCount,
    });
  } catch (error) {
    console.error("Error updating book visibility:", error);
    res.status(500).json({ error: "Failed to update book visibility" });
  }
}

// Admin render add book page
export async function renderAddBookPage(req, res) {
  return renderPage(req, res, "mainPages/BookForm.handlebars", true, {
    isEdit: false,
    book: null,
  });
}

// Admin add book API
export async function addBook(req, res) {
  const { name, category, description, imageURL, link, semester, main, visible } = req.body;

  try {
    await bookRepository.create({
      name,
      category,
      description,
      imageURL,
      link,
      semester,
      main,
      visible: visible ?? true,
      userName: req.session?.user?.username || null,
    });

    invalidateIndexCaches().catch((e) => console.error("Cache invalidation error after add:", e));
    res.status(201).json({ message: "Book added successfully!" });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Failed to add book" });
  }
}

// Admin export all books as JSON
export async function exportBooks(_req, res) {
  try {
    const books = await bookRepository.getAllForExport();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="unilib-books-${timestamp}.json"`);
    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      count: books.length,
      filters: "none",
      books,
      sections: books.map((b) => ({ bookId: b.id, sections: b.sections || [] })),
    });
  } catch (error) {
    console.error("Error exporting books:", error);
    return res.status(500).json({ error: "Failed to export books" });
  }
}

// Single book view
export async function renderSingleBook(req, res) {
  const bookId = req.params.id;

  try {
    const book = await bookRepository.findById(bookId, { mustBeVisible: true });
    if (!book) {
      return renderError(res, req, {
        layout: false,
        code: 404,
        error: "Book Not Found",
        message: "The Book you are looking for does not exist.",
        pagename: "Home",
        page: "/",
      });
    }

    return renderCachedPage(req, res, {
      view: "mainPages/index.handlebars",
      data: {
        books: [book],
        singleBookView: true,
        bookId,
        sections: book.sections || [],
        pagination: { page: 1, limit: 1, total: 1, pages: 1 },
        filters: { semester: book.semester, category: book.category, search: "" },
      },
      cacheKey: `book:${bookId}`,
      ttl: 300,
      sMaxAge: 300,
      staleWhileRevalidate: 120,
    });
  } catch (err) {
    console.error("Error fetching book:", err);
    return res.status(500).send("Internal Server Error");
  }
}

// Generic book action tracking (view / download)
async function handleTrackAction(req, res, actionType) {
  const bookId = req.params.id;
  try {
    const exists = await bookRepository.exists(bookId, { mustBeVisible: true });
    if (!exists) return res.status(404).json({ error: "Book not found" });

    res.json({ success: true });

    setImmediate(async () => {
      try {
        await bookRepository.incrementViews(bookId);
        await invalidateBookCache(bookId);
      } catch (error) {
        console.error(`Error tracking book ${actionType}:`, error);
      }
    });
  } catch (error) {
    console.error(`Error in ${actionType} tracking API:`, error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

export const trackBookView = (req, res) => handleTrackAction(req, res, "view");
export const trackBookDownload = (req, res) => handleTrackAction(req, res, "download");

export default {
  renderUnilibBooks,
  renderIndex,
  renderDashboard,
  renderEditBookPage,
  editBook,
  deleteBook,
  bulkVisibility,
  renderAddBookPage,
  addBook,
  exportBooks,
  renderSingleBook,
  trackBookView,
  trackBookDownload,
};
