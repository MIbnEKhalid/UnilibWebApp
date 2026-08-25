import fetch from "node-fetch";
import { tasjeelRepository } from "../db/index.js";
import renderPage from "../utils/render.util.js";
import { syncTasjeel, isLoginPageHtml } from "../services/tasjeel.service.js";
import { config } from "../config/index.js";

const ALL_SEMESTERS = Array.from({ length: 8 }, (_, i) => `Semester ${i + 1}`);

const mapSubjectRow = (r) => ({
  id: r.id,
  href: r.href,
  subject: r.subject,
  courseId: r.course_id,
  semester: r.semester || "Semester 1",
});

// API: Get all subjects
export async function getAllSubjects(req, res) {
  try {
    const rows = await tasjeelRepository.getAllSubjects();
    return res.json({ success: true, links: rows.map(mapSubjectRow) });
  } catch (err) {
    console.error("Error querying subjects from DB:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch subjects from DB", error: err.message });
  }
}

// API: Aggregated material counts for all subjects
export async function getAllMaterialsCounts(_req, res) {
  try {
    const counts = await tasjeelRepository.getMaterialCounts();
    return res.json({ success: true, counts });
  } catch (err) {
    console.error("Error querying material counts from DB:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch material counts", error: err.message });
  }
}

// API: Per-subject materials
export async function getMaterialsBySubject(req, res) {
  try {
    const materials = await tasjeelRepository.getMaterialsByCourseId(req.params.id);
    return res.json({ success: true, materials });
  } catch (err) {
    console.error("Error querying materials from DB:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch materials from DB", error: err.message });
  }
}

// API: Update subject semester assignment
export async function updateSubjectSemester(req, res) {
  const { semester } = req.body;
  if (!semester) return res.status(400).json({ success: false, message: "Semester is required" });

  try {
    const updated = await tasjeelRepository.updateSubjectSemester(req.params.id, semester);
    if (!updated) return res.status(404).json({ success: false, message: "Subject not found" });

    return res.json({ success: true, message: `Subject semester updated to ${semester}`, subject: updated });
  } catch (err) {
    console.error("Error updating subject semester:", err);
    return res.status(500).json({ success: false, message: "Failed to update subject semester", error: err.message });
  }
}

// Proxy route for downloading materials from tasjeel
export async function downloadMaterialProxy(req, res) {
  try {
    const id = req.params.id;
    const url = `https://tasjeel.cust.edu.pk/student/class/material/download/${id}`;
    const session = await tasjeelRepository.getLatestSession();

    const upstream = await fetch(url, {
      method: "GET",
      headers: { Cookie: `session_id=${session}` },
      redirect: "follow",
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => "");
      return res.status(upstream.status).send(body || "Download failed");
    }

    const contentType = upstream.headers.get("content-type") || "";
    const contentDisposition = upstream.headers.get("content-disposition");
    if (contentDisposition) res.setHeader("content-disposition", contentDisposition);

    if (contentType.includes("text/html")) {
      const text = await upstream.text().catch(() => "");
      if (isLoginPageHtml(text)) {
        return res.status(401).json({ success: false, message: "Not authenticated with Tasjeel; session invalid or expired" });
      }
      res.setHeader("content-type", "text/html; charset=utf-8");
      return res.send(text);
    }

    if (contentType) res.setHeader("content-type", contentType);

    if (upstream.body && typeof upstream.body.pipe === "function") {
      upstream.body.pipe(res);
    } else {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.end(buffer);
    }
  } catch (err) {
    console.error("Download proxy error:", err);
    res.status(500).json({ success: false, message: "Download failed", error: err.message });
  }
}

// Page showing all subjects and their materials
export async function renderMaterialsPage(req, res) {
  try {
    const rows = await tasjeelRepository.getAllSubjects();
    renderPage(req, res, "mainPages/subjects.handlebars", true, {
      page: "Subjects & Materials",
      subjects: rows.map(mapSubjectRow),
      defaultSemester: config.defaultSemester,
      selectedSemester: req.query.semester || config.defaultSemester,
      allSemesters: ALL_SEMESTERS,
    });
  } catch (err) {
    console.error("Error building subjects page from DB:", err);
    renderPage(req, res, "mainPages/subjects.handlebars", true, {
      page: "Subjects & Materials",
      subjects: [],
      error: err.message,
    });
  }
}

// Admin Page showing full materials management console
export async function renderAdminMaterialsPage(req, res) {
  try {
    const [rows, counts, session] = await Promise.all([
      tasjeelRepository.getAllSubjects(),
      tasjeelRepository.getMaterialCounts(),
      tasjeelRepository.getLatestSession(),
    ]);

    const subjects = rows.map((r) => ({
      ...mapSubjectRow(r),
      materialsCount: counts[r.course_id] || 0,
    }));

    renderPage(req, res, "mainPages/MaterialsAdmin.handlebars", true, {
      page: "Materials Management",
      subjects,
      sessionExists: Boolean(session),
      defaultSemester: config.defaultSemester,
      selectedSemester: req.query.semester || config.defaultSemester,
      allSemesters: ALL_SEMESTERS,
    });
  } catch (err) {
    console.error("Error building admin materials page from DB:", err);
    renderPage(req, res, "mainPages/MaterialsAdmin.handlebars", true, {
      page: "Materials Management",
      subjects: [],
      error: err.message,
    });
  }
}

// Admin API: Create new subject
export async function addSubject(req, res) {
  const { courseId, subject, semester, href } = req.body;
  if (!courseId || !subject) {
    return res.status(400).json({ success: false, message: "Course Code and Subject Name are required" });
  }

  try {
    const defaultHref = href || `/student/course/info/${encodeURIComponent(courseId)}`;
    const subjectId = await tasjeelRepository.upsertSubject(
      courseId.trim(),
      subject.trim(),
      defaultHref,
      semester || "Semester 1"
    );

    return res.json({
      success: true,
      message: "Subject created successfully",
      subject: { id: subjectId, courseId, subject, semester: semester || "Semester 1", href: defaultHref },
    });
  } catch (err) {
    console.error("Error creating subject:", err);
    return res.status(500).json({ success: false, message: "Failed to create subject", error: err.message });
  }
}

// Admin API: Delete subject
export async function deleteSubject(req, res) {
  try {
    const deleted = await tasjeelRepository.deleteSubject(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Subject not found" });
    return res.json({ success: true, message: "Subject deleted successfully" });
  } catch (err) {
    console.error("Error deleting subject:", err);
    return res.status(500).json({ success: false, message: "Failed to delete subject", error: err.message });
  }
}

// Admin API: Add material to subject
export async function addMaterialToSubject(req, res) {
  const { name, href } = req.body;
  if (!name) return res.status(400).json({ success: false, message: "Material name is required" });

  try {
    const subject = await tasjeelRepository.getSubjectByIdOrCourseId(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: "Subject not found" });

    const material = await tasjeelRepository.addMaterial(subject.id, name.trim(), href ? href.trim() : "");
    return res.json({ success: true, message: "Material added successfully", material });
  } catch (err) {
    console.error("Error adding material:", err);
    return res.status(500).json({ success: false, message: "Failed to add material", error: err.message });
  }
}

// Admin API: Delete material
export async function deleteMaterial(req, res) {
  try {
    const deleted = await tasjeelRepository.deleteMaterial(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: "Material not found" });
    return res.json({ success: true, message: "Material deleted successfully" });
  } catch (err) {
    console.error("Error deleting material:", err);
    return res.status(500).json({ success: false, message: "Failed to delete material", error: err.message });
  }
}

// Manual sync endpoint (protected)
export async function manualSyncTasjeel(_req, res) {
  try {
    const session = await tasjeelRepository.getLatestSession();
    const result = await syncTasjeel(`session_id=${session}`);
    return res.json(result);
  } catch (err) {
    console.error("Manual sync failed:", err);
    return res.status(500).json({ success: false, error: err.message });
  }
}

export default {
  getAllSubjects,
  getAllMaterialsCounts,
  getMaterialsBySubject,
  updateSubjectSemester,
  downloadMaterialProxy,
  renderMaterialsPage,
  renderAdminMaterialsPage,
  addSubject,
  deleteSubject,
  addMaterialToSubject,
  deleteMaterial,
  manualSyncTasjeel,
};
