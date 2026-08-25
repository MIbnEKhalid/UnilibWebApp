import express from "express";
import { validateSessionAndRole } from "mbkauthe";
import {
  renderSectionsPage,
  addSection,
  editSection,
  deleteSection,
  bulkDeleteSections,
  downloadSectionPdf,
} from "../controllers/section.controller.js";

const router = express.Router();

// Public section download route
router.get("/book/:bookId/section/:sectionId/download", downloadSectionPdf);

// Admin section management routes
router.get("/dashboard/Book/:bookId/Sections", validateSessionAndRole("Any"), renderSectionsPage);
router.post("/api/admin/Book/:bookId/Section/Add", validateSessionAndRole("Any"), addSection);
router.post("/api/admin/Section/Edit/:sectionId", validateSessionAndRole("Any"), editSection);
router.post("/api/admin/Section/Delete/:sectionId", validateSessionAndRole("Any"), deleteSection);
router.post("/api/admin/Book/:bookId/Sections/BulkDelete", validateSessionAndRole("Any"), bulkDeleteSections);

export default router;
