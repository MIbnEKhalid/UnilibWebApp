import express from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { renderIndex, renderDashboard, renderEditBookPage, editBook, deleteBook, bulkVisibility, renderAddBookPage, addBook, exportBooks, renderSingleBook, trackBookView, trackBookDownload } from "../controllers/book.controller.js";

const router = express.Router();

// Public catalog routes
router.get("/", renderIndex);
router.get("/books/:id", renderSingleBook);
router.post("/api/books/:id/view", trackBookView);
router.post("/api/books/:id/download", trackBookDownload);

// Admin dashboard pages
router.get("/dashboard/books", sessPerm(Permissions.books.view), renderDashboard);
router.get("/dashboard/books/new", sessPerm(Permissions.books.create), renderAddBookPage);
router.get("/dashboard/books/:id/edit", sessPerm(Permissions.books.edit), renderEditBookPage);

// Admin book API routes
router.post("/api/admin/books", sessPerm(Permissions.books.create), addBook);
router.put("/api/admin/books/:id", sessPerm(Permissions.books.edit), editBook);
router.delete("/api/admin/books/:id", sessPerm(Permissions.books.delete), deleteBook);
router.post("/api/admin/books/bulk-visibility", sessPerm(Permissions.books.edit), bulkVisibility);
router.get("/api/admin/books/export", sessPerm(Permissions.books.export), exportBooks);

export default router;
