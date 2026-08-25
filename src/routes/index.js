import express from "express";
import bookRoutes from "./book.routes.js";
import sectionRoutes from "./section.routes.js";
import materialRoutes from "./material.routes.js";
import pdfRoutes from "./pdf.routes.js";

const router = express.Router();

router.use("/", bookRoutes);
router.use("/", sectionRoutes);
router.use("/", materialRoutes);
router.use("/pdf", pdfRoutes);

export default router;
