import { Router } from "express";
import webController from "../controllers/web.controller.js";

const router = Router();

// Public homepage with Semester tabs and recent resources
router.get("/", webController.renderHome);

// Public course resource catalog
router.get("/courses/:code", webController.renderCourse);

// Public file download and preview streams
router.get("/resources/:id/download", webController.downloadResource);
router.get("/resources/:id/preview", webController.previewResource);

// Page range sliced chapter/experiment download and preview streams
router.get("/resources/:id/sections/:sectionId/download", webController.downloadSection);
router.get("/resources/:id/sections/:sectionId/preview", webController.previewSection);

export default router;
