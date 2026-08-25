import express from "express";
import { streamPdfFromDrive } from "../controllers/pdf.controller.js";

const router = express.Router();

// Stream PDF from Google Drive
router.get("/:bookId/:filename", streamPdfFromDrive);

export default router;
