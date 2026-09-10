import express from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { renderIndex, renderDashboard, renderEditBookPage, editBook, deleteBook, bulkVisibility, renderAddBookPage, addBook, exportBooks, renderSingleBook, trackBookView, trackBookDownload } from "../controllers/book.controller.js";

const router = express.Router();

// Public routes
router.get("/", renderIndex);
router.get("/book/:id", renderSingleBook);
router.post("/api/book/:id/view", trackBookView);
router.post("/api/book/:id/download", trackBookDownload);

// Admin dashboard routes
router.get(["/dashboard/Unilib", "/dashboard"], sessPerm(Permissions.books.view), renderDashboard);
router.get("/dashboard/Book/Add", sessPerm(Permissions.books.create), renderAddBookPage);
router.get("/dashboard/Book/Edit/:id", sessPerm(Permissions.books.edit), renderEditBookPage);

// Admin book API routes
router.post("/api/admin/Unilib/Book/Add", sessPerm(Permissions.books.create), addBook);
router.post("/api/admin/Unilib/Book/Edit/:id", sessPerm(Permissions.books.edit), editBook);
router.post("/api/admin/Unilib/Book/Delete/:id", sessPerm(Permissions.books.delete), deleteBook);
router.post("/api/admin/Unilib/Book/BulkVisibility", sessPerm(Permissions.books.edit), bulkVisibility);
router.get("/api/admin/Unilib/Book/Export", sessPerm(Permissions.books.export), exportBooks);

export default router;
