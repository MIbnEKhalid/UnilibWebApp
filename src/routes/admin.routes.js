import { Router } from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import adminController from "../controllers/admin.controller.js";
import { uploadResourceMiddleware } from "../middleware/upload.js";
import { createAdminDbSubRouter } from "../db/admindb.js";

const router = Router();

// ==========================================
// 1. Dashboard & Materials Listing
// ==========================================
router.get("/", sessPerm(Permissions.admin.view), adminController.renderAdminDashboard);
router.get("/unilib", sessPerm(Permissions.admin.view), adminController.renderAdminDashboard);

// ==========================================
// 2. Course Management (Feature-based Pages)
// ==========================================
router.get("/courses", sessPerm(Permissions.admin.view), adminController.renderCoursesPage);
router.get("/courses/new", sessPerm(Permissions.courses.create), adminController.renderCreateCoursePage);
router.post("/courses", sessPerm(Permissions.courses.create), adminController.createCourse);
router.get("/courses/:id/edit", sessPerm(Permissions.courses.edit), adminController.renderEditCoursePage);
router.post("/courses/:id/edit", sessPerm(Permissions.courses.edit), adminController.editCourse);
router.post("/courses/:id/delete", sessPerm(Permissions.courses.delete), adminController.deleteCourse);

// ==========================================
// 3. Resource Management (Feature-based Pages)
// ==========================================
router.get("/resources/new", sessPerm(Permissions.resources.create), adminController.renderUploadResourcePage);
router.post("/resources/upload-url", sessPerm(Permissions.resources.create), adminController.createResourceUploadUrl);
router.post("/resources/upload", sessPerm(Permissions.resources.create), uploadResourceMiddleware.single("file"), adminController.uploadResource);
router.get("/resources/:id/edit", sessPerm(Permissions.resources.edit), adminController.renderEditResourcePage);
router.post("/resources/:id/edit", sessPerm(Permissions.resources.edit), uploadResourceMiddleware.single("file"), adminController.editResource);
router.get("/slicer", sessPerm(Permissions.resources.edit), adminController.renderResourceSlicerPage);
router.get("/resources/:id/slicer", sessPerm(Permissions.resources.edit), adminController.renderResourceSlicerPage);
router.post("/resources/:id/slicer", sessPerm(Permissions.resources.edit), adminController.saveResourceSlices);
router.get("/resources/:id/pdf-info", sessPerm(Permissions.admin.view), adminController.getResourcePdfInfo);
router.post("/resources/:id/toggle-visibility", sessPerm(Permissions.resources.edit), adminController.toggleResourceVisibility);
router.post("/resources/:id/delete", sessPerm(Permissions.resources.delete), adminController.deleteResource);

// ==========================================
// 4. APIs & Introspection
// ==========================================
router.get("/quizzes/:courseCode", sessPerm(Permissions.admin.view), adminController.getCourseQuizzes);
router.get("/metrics", sessPerm(Permissions.admin.manage), adminController.getAdminMetrics);

// Database administration console (/admin/db)
const adminDbRouter = createAdminDbSubRouter("/admin/db");
if (adminDbRouter) {
  router.use("/db", sessPerm(Permissions.admindb.access), adminDbRouter);
}

export default router;