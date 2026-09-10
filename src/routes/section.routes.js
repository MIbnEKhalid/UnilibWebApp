import express from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { renderSectionsPage, addSection, editSection, deleteSection, bulkDeleteSections, downloadSectionPdf } from "../controllers/section.controller.js";

const router = express.Router();

// Public section download route
router.get("/book/:bookId/section/:sectionId/download", downloadSectionPdf);

// Admin section management routes
router.get("/dashboard/Book/:bookId/Sections", sessPerm(Permissions.sections.view), renderSectionsPage);
router.post("/api/admin/Book/:bookId/Section/Add", sessPerm(Permissions.sections.create), addSection);
router.post("/api/admin/Section/Edit/:sectionId", sessPerm(Permissions.sections.edit), editSection);
router.post("/api/admin/Section/Delete/:sectionId", sessPerm(Permissions.sections.delete), deleteSection);
router.post("/api/admin/Book/:bookId/Sections/BulkDelete", sessPerm(Permissions.sections.delete), bulkDeleteSections);

export default router;
