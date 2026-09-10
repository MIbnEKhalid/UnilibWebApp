import express from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { getAllSubjects, getAllMaterialsCounts, getMaterialsBySubject, updateSubjectSemester, downloadMaterialProxy, renderMaterialsPage, renderAdminMaterialsPage, addSubject, deleteSubject, addMaterialToSubject, deleteMaterial, manualSyncTasjeel } from "../controllers/material.controller.js";

const router = express.Router();

// Admin Console - Materials Management View
router.get("/dashboard/Materials", sessPerm(Permissions.materials.view), renderAdminMaterialsPage);

// Admin Material & Subject Management APIs
router.post("/api/admin/subject/add", sessPerm(Permissions.materials.manage), addSubject);
router.post("/api/admin/subject/:id/delete", sessPerm(Permissions.materials.manage), deleteSubject);
router.post("/api/admin/subject/:id/material/add", sessPerm(Permissions.materials.manage), addMaterialToSubject);
router.post("/api/admin/material/:id/delete", sessPerm(Permissions.materials.manage), deleteMaterial);
router.post("/api/admin/subject/:id/semester", sessPerm(Permissions.materials.manage), updateSubjectSemester);
router.get("/api/admin/sync/tasjeel", sessPerm(Permissions.materials.sync), manualSyncTasjeel);

// Public / Archive Material APIs
router.get("/api/get/all/subjects", sessPerm(Permissions.materials.view), getAllSubjects);
router.get("/api/get/all/materials-counts", sessPerm(Permissions.materials.view), getAllMaterialsCounts);
router.get("/api/get/all/materials/:id", sessPerm(Permissions.materials.view), getMaterialsBySubject);
router.get("/student/class/material/download/:id", sessPerm(Permissions.materials.view), downloadMaterialProxy);
router.get("/materials", sessPerm(Permissions.materials.view), renderMaterialsPage);

export default router;