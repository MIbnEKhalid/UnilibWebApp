import { renderPage, getUserContext } from "mbkutils";
import { config } from "../config/env.js";
import resourceService, { formatBytes, getFileIcon } from "../services/resource.service.js";
import courseRepository from "../repositories/course.repository.js";
import resourceRepository from "../repositories/resource.repository.js";

export async function renderHome(req, res) {
  try {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=86400");
    const data = await resourceService.getHomepageData();
    const userContext = getUserContext(req);

    return renderPage(req, res, "index.hbs", "layout", {
      title: `${config.appName} — University Academic Resource Library`,
      appName: config.appName,
      baseUrl: config.baseUrl,
      semesters: data.semesters,
      allMaterials: data.allMaterials,
      currentSemester: data.currentSemester,
      recent: data.recent,
      stats: data.stats,
      userContext,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("[Unilib Web] Error rendering home:", err);
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

export async function renderCourse(req, res) {
  try {
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=86400");
    const courseCode = req.params.code || req.params.codeOrId;
    const data = await resourceService.getCourseWithResources(courseCode);

    if (!data || !data.course) {
      res.status(404);
      return renderPage(req, res, "error.hbs", "layout", {
        title: "Course Not Found — Unilib",
        appName: config.appName,
        status: 404,
        error: `The requested course "${courseCode}" could not be found.`,
      });
    }

    const userContext = getUserContext(req);

    return renderPage(req, res, "course.hbs", "layout", {
      title: `${data.course.code}: ${data.course.title} — Unilib`,
      appName: config.appName,
      course: data.course,
      resources: data.resources,
      counts: data.counts,
      userContext,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("[Unilib Web] Error rendering course:", err);
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

export async function downloadResource(req, res) {
  const resourceId = req.params.id;
  await resourceService.serveFile(resourceId, res, { inline: false });
}

export async function previewResource(req, res) {
  const resourceId = req.params.id;
  await resourceService.serveFile(resourceId, res, { inline: true });
}

export async function downloadSection(req, res) {
  const { id, sectionId } = req.params;
  await resourceService.serveSectionFile(id, sectionId, res, { inline: false });
}

export async function previewSection(req, res) {
  const { id, sectionId } = req.params;
  await resourceService.serveSectionFile(id, sectionId, res, { inline: true });
}

export default {
  renderHome,
  renderCourse,
  downloadResource,
  previewResource,
  downloadSection,
  previewSection,
};
