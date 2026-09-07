import express from "express";
import { validateSessionAndRole } from "mbkauthe";
import { renderIndex, renderDashboard, renderEditBookPage, editBook, deleteBook, bulkVisibility, renderAddBookPage, addBook, exportBooks, renderSingleBook, trackBookView, trackBookDownload } from "../controllers/book.controller.js";

const router = express.Router();

// Public routes
router.get("/", renderIndex);
router.get("/book/:id", renderSingleBook);
router.post("/api/book/:id/view", trackBookView);
router.post("/api/book/:id/download", trackBookDownload);

// Admin dashboard routes
router.get(["/dashboard/Unilib", "/dashboard"], validateSessionAndRole("any"), renderDashboard);
router.get("/dashboard/Book/Add", validateSessionAndRole("Any"), renderAddBookPage);
router.get("/dashboard/Book/Edit/:id", validateSessionAndRole("Any"), renderEditBookPage);

// Admin book API routes
router.post("/api/admin/Unilib/Book/Add", validateSessionAndRole("Any"), addBook);
router.post("/api/admin/Unilib/Book/Edit/:id", validateSessionAndRole("Any"), editBook);
router.post("/api/admin/Unilib/Book/Delete/:id", validateSessionAndRole("Any"), deleteBook);
router.post("/api/admin/Unilib/Book/BulkVisibility", validateSessionAndRole("Any"), bulkVisibility);
router.get("/api/admin/Unilib/Book/Export", validateSessionAndRole("Any"), exportBooks);

export default router;
