import express from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { renderSectionsPage, addSection, editSection, deleteSection, bulkDeleteSections, downloadSectionPdf } from "../controllers/section.controller.js";

const router = express.Router();

// Public section download route
router.get("/books/:book_id/sections/:section_id/download", downloadSectionPdf);

// Admin section management page
router.get("/dashboard/books/:book_id/sections", sessPerm(Permissions.sections.view), renderSectionsPage);

// Admin section management API routes
router.post("/api/admin/books/:book_id/sections", sessPerm(Permissions.sections.create), addSection);
router.put("/api/admin/sections/:id", sessPerm(Permissions.sections.edit), editSection);
router.delete("/api/admin/sections/:id", sessPerm(Permissions.sections.delete), deleteSection);
router.post("/api/admin/books/:book_id/sections/bulk-delete", sessPerm(Permissions.sections.delete), bulkDeleteSections);

export default router;
