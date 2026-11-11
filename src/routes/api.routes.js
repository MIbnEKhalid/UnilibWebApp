import { Router } from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { uploadResourceMiddleware } from "../middleware/upload.js";
import { apiCreationLimiter } from "../middleware/rate-limiter.js";
import apiController from "../controllers/api.controller.js";

const router = Router();

// Public health check endpoint
router.get("/health", apiController.getHealth);

// Public resource browsing API
router.get("/courses", apiController.getCourses);
router.get("/courses/:code", apiController.getCourse);
router.get("/courses/:courseCode/quizzes", apiController.getCourseQuizzes);

// Protected mutation endpoints
router.post("/resources/upload", sessPerm(Permissions.resources.create), apiCreationLimiter, uploadResourceMiddleware.single("file"), apiController.uploadResourceApi);
router.delete("/resources/:id", sessPerm(Permissions.resources.delete), apiController.deleteResourceApi);

export default router;