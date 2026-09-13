import express from "express";
import { sessPerm } from "mbkauthe";
import { Permissions } from "../permissions.js";
import { getAllSubjects, getAllMaterialsCounts, getMaterialsBySubject, updateSubjectSemester, downloadMaterialProxy, renderMaterialsPage, renderAdminMaterialsPage, addSubject, deleteSubject, addMaterialToSubject, deleteMaterial, manualSyncTasjeel } from "../controllers/material.controller.js";

const router = express.Router();

// Admin Console - Materials Management View
router.get("/dashboard/materials", sessPerm(Permissions.materials.view), renderAdminMaterialsPage);

// Admin Material & Subject Management APIs
router.post("/api/admin/subjects", sessPerm(Permissions.materials.manage), addSubject);
router.delete("/api/admin/subjects/:id", sessPerm(Permissions.materials.manage), deleteSubject);
router.post("/api/admin/subjects/:id/materials", sessPerm(Permissions.materials.manage), addMaterialToSubject);
router.delete("/api/admin/materials/:id", sessPerm(Permissions.materials.manage), deleteMaterial);
router.put("/api/admin/subjects/:id/semester", sessPerm(Permissions.materials.manage), updateSubjectSemester);
router.post("/api/admin/materials/sync-tasjeel", sessPerm(Permissions.materials.sync), manualSyncTasjeel);

// Public / Archive Material APIs
router.get("/api/subjects", sessPerm(Permissions.materials.view), getAllSubjects);
router.get("/api/materials/counts", sessPerm(Permissions.materials.view), getAllMaterialsCounts);
router.get("/api/subjects/:id/materials", sessPerm(Permissions.materials.view), getMaterialsBySubject);
router.get("/api/materials/:id/download", sessPerm(Permissions.materials.view), downloadMaterialProxy);
router.get("/materials", sessPerm(Permissions.materials.view), renderMaterialsPage);

export default router;