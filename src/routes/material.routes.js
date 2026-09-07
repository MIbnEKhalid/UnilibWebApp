import express from "express";
import { validateSessionAndRole } from "mbkauthe";
import { getAllSubjects, getAllMaterialsCounts, getMaterialsBySubject, updateSubjectSemester, downloadMaterialProxy, renderMaterialsPage, renderAdminMaterialsPage, addSubject, deleteSubject, addMaterialToSubject, deleteMaterial, manualSyncTasjeel } from "../controllers/material.controller.js";

const router = express.Router();

// Admin Console - Materials Management View
router.get("/dashboard/Materials", validateSessionAndRole("Any"), renderAdminMaterialsPage);

// Admin Material & Subject Management APIs
router.post("/api/admin/subject/add", validateSessionAndRole("Any"), addSubject);
router.post("/api/admin/subject/:id/delete", validateSessionAndRole("Any"), deleteSubject);
router.post("/api/admin/subject/:id/material/add", validateSessionAndRole("Any"), addMaterialToSubject);
router.post("/api/admin/material/:id/delete", validateSessionAndRole("Any"), deleteMaterial);
router.post("/api/admin/subject/:id/semester", validateSessionAndRole("Any"), updateSubjectSemester);
router.get("/api/admin/sync/tasjeel", validateSessionAndRole("Any"), manualSyncTasjeel);

// Public / Archive Material APIs
router.get("/api/get/all/subjects", validateSessionAndRole("superadmin"), getAllSubjects);
router.get("/api/get/all/materials-counts", validateSessionAndRole("superadmin"), getAllMaterialsCounts);
router.get("/api/get/all/materials/:id", validateSessionAndRole("superadmin"), getMaterialsBySubject);
router.get("/student/class/material/download/:id", validateSessionAndRole("superadmin"), downloadMaterialProxy);
router.get("/materials", validateSessionAndRole("superadmin"), renderMaterialsPage);

export default router;