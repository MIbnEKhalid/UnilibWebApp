import { renderPage, getUserContext, sendSuccess, sendError } from "mbkutils";
import { config } from "../config/env.js";
import courseRepository from "../repositories/course.repository.js";
import resourceRepository from "../repositories/resource.repository.js";
import resourceService, { formatBytes, getFileIcon } from "../services/resource.service.js";
import cacheService from "../services/cache.service.js";
import pdfSliceService from "../services/pdf-slice.service.js";

/**
 * 1. Main Admin Dashboard / Resource Listing
 * GET /admin or GET /admin/unilib
 */
export async function renderAdminDashboard(req, res) {
  try {
    const { q, course_code, type, semester } = req.query;
    const courses = await courseRepository.findAll();
    const totalCourses = await courseRepository.getCount();
    const totalResources = await resourceRepository.getCount();
    const totalViews = await resourceRepository.getTotalViews();
    const rawStorage = await resourceRepository.getTotalStorageSize();
    const userContext = getUserContext(req);

    // Filter resources based on query parameters (including hidden for admins)
    const filterOptions = {
      search: q ? q.trim() : null,
      course_code: course_code ? course_code.trim().toUpperCase() : null,
      type: type || null,
      semester: semester ? parseInt(semester, 10) : null,
      limit: 100,
      includeHidden: true,
    };

    const resources = await resourceRepository.findAllWithCourses(filterOptions);
    const enrichedResources = resources.map((r) => ({
      ...r,
      formatted_size: formatBytes(r.file_size),
      file_badge: getFileIcon(r.mime_type, r.file_name),
    }));

    const stats = {
      courses: totalCourses,
      resources: totalResources,
      views: totalViews,
      storageFormatted: formatBytes(rawStorage),
      cacheDriver: cacheService.isRedisConnected() ? "Upstash Redis" : "In-Memory Store (Resilient)",
    };

    return renderPage(req, res, "admin.hbs", "layout", {
      title: `${config.appName} — Academic Materials Management`,
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "resources",
      stats,
      courses,
      resources: enrichedResources,
      query: q || "",
      selectedCourseCode: course_code ? course_code.trim().toUpperCase() : "",
      selectedType: type || "",
      selectedSemester: semester || "",
      userContext,
      successMsg: req.query.success || null,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("[Unilib Admin] Error rendering dashboard:", err);
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 2. Courses Listing Page
 * GET /admin/courses
 */
export async function renderCoursesPage(req, res) {
  try {
    const { semester, q } = req.query;
    const filterOptions = {
      semester: semester ? parseInt(semester, 10) : null,
      search: q ? q.trim() : null,
    };

    const courses = await courseRepository.findAll(filterOptions);
    const totalCourses = await courseRepository.getCount();
    const userContext = getUserContext(req);

    return renderPage(req, res, "admin-courses.hbs", "layout", {
      title: `${config.appName} — Course Directory Management`,
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "courses",
      courses,
      totalCourses,
      selectedSemester: semester || "",
      query: q || "",
      userContext,
      successMsg: req.query.success || null,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("[Unilib Admin] Error rendering courses page:", err);
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 3. Course Create Form Page
 * GET /admin/courses/new
 */
export async function renderCreateCoursePage(req, res) {
  try {
    const userContext = getUserContext(req);

    return renderPage(req, res, "admin-course-form.hbs", "layout", {
      title: "Add New Course — Unilib Admin",
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "courses",
      isEdit: false,
      userContext,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 4. Course Edit Form Page
 * GET /admin/courses/:id/edit
 */
export async function renderEditCoursePage(req, res) {
  try {
    const courseCode = req.params.id;
    const course = await courseRepository.findByCode(courseCode);

    if (!course) {
      return res.redirect("/admin/courses?error=Course+not+found.");
    }

    const userContext = getUserContext(req);

    return renderPage(req, res, "admin-course-form.hbs", "layout", {
      title: `Edit Course ${course.code} — Unilib Admin`,
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "courses",
      isEdit: true,
      course,
      userContext,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 5. Handle Course Creation
 * POST /admin/courses
 */
export async function createCourse(req, res) {
  try {
    const { code, title, semester } = req.body;

    if (!code || !title || !semester) {
      return res.redirect("/admin/courses/new?error=Course+code,+title,+and+semester+are+required.");
    }

    await courseRepository.create({
      code,
      title,
      semester,
    });

    await cacheService.del("unilib:homepage:summary");
    await cacheService.del("unilib:semesters:summary");

    return res.redirect(`/admin/courses?success=Course+${encodeURIComponent(code)}+created+successfully.`);
  } catch (err) {
    console.error("[Unilib Admin] Error creating course:", err);
    return res.redirect(`/admin/courses/new?error=${encodeURIComponent(err.message || "Failed to create course.")}`);
  }
}

/**
 * 6. Handle Course Update
 * POST /admin/courses/:id/edit
 */
export async function editCourse(req, res) {
  try {
    const courseCode = req.params.id;
    const { code, title, semester } = req.body;

    const existing = await courseRepository.findByCode(courseCode);
    if (!existing) {
      return res.redirect("/admin/courses?error=Course+not+found.");
    }

    await courseRepository.update(courseCode, {
      code,
      title,
      semester,
    });

    await resourceService.invalidateCourseCaches(existing.code);
    if (code && code !== existing.code) {
      await resourceService.invalidateCourseCaches(code);
    }

    return res.redirect(`/admin/courses?success=Course+${encodeURIComponent(code || existing.code)}+updated+successfully.`);
  } catch (err) {
    console.error("[Unilib Admin] Error updating course:", err);
    return res.redirect(`/admin/courses/${req.params.id}/edit?error=${encodeURIComponent(err.message || "Failed to update course.")}`);
  }
}

/**
 * 7. Handle Course Deletion
 * POST /admin/courses/:id/delete
 */
export async function deleteCourse(req, res) {
  try {
    const courseCode = req.params.id;
    const course = await courseRepository.findByCode(courseCode);
    if (!course) {
      return res.redirect("/admin/courses?error=Course+not+found.");
    }

    // Delete associated resource files from storage first
    const resources = await resourceRepository.findByCourseCode(courseCode);
    for (const r of resources) {
      try {
        await resourceService.deleteResource(r.id);
      } catch (e) {
        console.warn(`[Unilib] Could not clean up resource ${r.id}:`, e.message);
      }
    }

    await courseRepository.delete(courseCode);
    await resourceService.invalidateCourseCaches(course.code);

    return res.redirect(`/admin/courses?success=Course+${encodeURIComponent(course.code)}+and+all+its+resources+deleted.`);
  } catch (err) {
    console.error("[Unilib Admin] Error deleting course:", err);
    return res.redirect(`/admin/courses?error=${encodeURIComponent(err.message || "Failed to delete course.")}`);
  }
}

/**
 * 8. Resource Upload Form Page
 * GET /admin/resources/new
 */
export async function renderUploadResourcePage(req, res) {
  try {
    const courses = await courseRepository.findAll();
    const userContext = getUserContext(req);
    const preselectedCourseCode = (req.query.course_code || "").toUpperCase().trim();

    let linkableParents = [];
    let availableSolutions = [];
    if (preselectedCourseCode) {
      [linkableParents, availableSolutions] = await Promise.all([
        resourceRepository.findLinkableParents(preselectedCourseCode),
        resourceRepository.findAvailableSolutions(preselectedCourseCode),
      ]);
    }
    const textbooks = linkableParents.filter((p) => p.type === "textbook");
    const quizzes = linkableParents.filter((p) => p.type === "quiz_assignment");

    return renderPage(req, res, "admin-resource-form.hbs", "layout", {
      title: "Upload Academic Resource — Unilib Admin",
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "resources",
      isEdit: false,
      courses,
      selectedCourseCode: preselectedCourseCode,
      linkableParents,
      textbooks,
      quizzes,
      availableSolutions,
      userContext,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 9. Resource Edit Form Page
 * GET /admin/resources/:id/edit
 */
export async function renderEditResourcePage(req, res) {
  try {
    const resourceId = req.params.id;
    const resource = await resourceRepository.findById(resourceId);

    if (!resource) {
      return res.redirect("/admin?error=Resource+not+found.");
    }

    const [courses, linkableParents, availableSolutions, linkedSolution] = await Promise.all([
      courseRepository.findAll(),
      resourceRepository.findLinkableParents(resource.course_code),
      resourceRepository.findAvailableSolutions(resource.course_code),
      resource.type === "textbook" ? resourceRepository.findSolutionForTextbook(resource.id) : null,
    ]);

    const textbooks = linkableParents.filter((p) => p.type === "textbook");
    const quizzes = linkableParents.filter((p) => p.type === "quiz_assignment");
    const userContext = getUserContext(req);

    const enriched = {
      ...resource,
      formatted_size: formatBytes(resource.file_size),
      file_badge: getFileIcon(resource.mime_type, resource.file_name),
    };

    return renderPage(req, res, "admin-resource-form.hbs", "layout", {
      title: `Edit ${resource.title} — Unilib Admin`,
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "resources",
      isEdit: true,
      resource: enriched,
      sectionsJson: JSON.stringify(resource.sections || []),
      selectedCourseCode: resource.course_code,
      courses,
      linkableParents,
      textbooks,
      quizzes,
      availableSolutions,
      linkedSolutionId: linkedSolution?.id || null,
      userContext,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 10. Handle Resource Upload
 * POST /admin/resources/upload
 */
export async function uploadResource(req, res) {
  try {
    const { course_code, type, title, description, parent_resource_id, solution_resource_id, drive_url, sections, is_visible } = req.body;
    const file = req.file;
    const selectedCourseCode = (course_code || "").trim().toUpperCase();

    if (!file) {
      return res.redirect("/admin/resources/new?error=Please+select+a+file+to+upload.");
    }
    if (!selectedCourseCode || !type) {
      return res.redirect("/admin/resources/new?error=Course+and+Resource+Type+are+required.");
    }

    let parsedSections = null;
    if (sections) {
      try {
        parsedSections = typeof sections === "string" ? JSON.parse(sections) : sections;
      } catch {
        parsedSections = null;
      }
    }

    const uploader = req.session?.user?.username || req.session?.user?.name || "admin";
    const isVisible = is_visible !== undefined
      ? (is_visible === "on" || is_visible === "true" || is_visible === true || is_visible === "1")
      : true;

    const newResource = await resourceService.uploadResource({
      courseCode: selectedCourseCode,
      type,
      title: title || file.originalname,
      description,
      parentResourceId: parent_resource_id || null,
      driveUrl: (drive_url || "").trim() || null,
      sections: parsedSections,
      isVisible,
      file,
      uploaderId: uploader,
    });

    if (type === "textbook" && solution_resource_id) {
      await resourceRepository.setParentForSolution(parseInt(solution_resource_id, 10), newResource.id);
      await resourceService.invalidateCourseCaches(selectedCourseCode);
    }

    return res.redirect("/admin?success=Resource+uploaded+and+cataloged+successfully.");
  } catch (err) {
    console.error("[Unilib Admin] Error uploading resource:", err);
    return res.redirect(`/admin/resources/new?error=${encodeURIComponent(err.message || "Upload failed.")}`);
  }
}

/**
 * 11. Handle Resource Update
 * POST /admin/resources/:id/edit
 */
export async function editResource(req, res) {
  try {
    const resourceId = req.params.id;
    const { course_code, type, title, description, parent_resource_id, solution_resource_id, drive_url, sections, is_visible } = req.body;
    const file = req.file;
    const selectedCourseCode = (course_code || "").trim().toUpperCase();

    let parsedSections = undefined;
    if (sections !== undefined) {
      if (sections) {
        try {
          parsedSections = typeof sections === "string" ? JSON.parse(sections) : sections;
        } catch {
          parsedSections = [];
        }
      } else {
        parsedSections = [];
      }
    }

    const isVisible = is_visible !== undefined
      ? (is_visible === "on" || is_visible === "true" || is_visible === true || is_visible === "1")
      : false; // if form was submitted with checkbox omitted, checkbox was unchecked

    await resourceService.updateResource(
      resourceId,
      {
        course_code: selectedCourseCode,
        type,
        title,
        description,
        parent_resource_id: parent_resource_id || null,
        drive_url: drive_url !== undefined ? ((drive_url || "").trim() || null) : undefined,
        sections: parsedSections,
        is_visible: isVisible,
      },
      file || null
    );

    if (type === "textbook") {
      if (solution_resource_id) {
        await resourceRepository.unlinkSolutionsFromParent(resourceId);
        await resourceRepository.setParentForSolution(parseInt(solution_resource_id, 10), resourceId);
      } else if (solution_resource_id === "") {
        await resourceRepository.unlinkSolutionsFromParent(resourceId);
      }
      await resourceService.invalidateCourseCaches(selectedCourseCode);
    }

    return res.redirect("/admin?success=Resource+details+updated+successfully.");
  } catch (err) {
    console.error("[Unilib Admin] Error updating resource:", err);
    return res.redirect(`/admin/resources/${req.params.id}/edit?error=${encodeURIComponent(err.message || "Update failed.")}`);
  }
}

/**
 * 11b. Visual PDF Slicer Studio Page
 * GET /admin/slicer or GET /admin/resources/:id/slicer
 */
export async function renderResourceSlicerPage(req, res) {
  try {
    const requestedId = req.params.id || req.query.resource_id || null;
    const allResources = await resourceRepository.findAllWithCourses({
      limit: 500,
      includeHidden: true,
    });

    const pdfResources = allResources
      .filter(
        (r) =>
          (r.mime_type || "").toLowerCase().includes("pdf") ||
          (r.file_name || "").toLowerCase().endsWith(".pdf")
      )
      .map((r) => ({
        ...r,
        formatted_size: formatBytes(r.file_size),
      }));

    let resource = null;
    if (requestedId) {
      resource = await resourceRepository.findById(requestedId);
      if (!resource) {
        return res.redirect("/admin/slicer?error=Requested+resource+not+found.");
      }
    } else if (pdfResources.length > 0) {
      resource = await resourceRepository.findById(pdfResources[0].id);
    }

    const userContext = getUserContext(req);
    const enriched = resource
      ? {
          ...resource,
          formatted_size: formatBytes(resource.file_size),
          file_badge: getFileIcon(resource.mime_type, resource.file_name),
        }
      : null;

    return renderPage(req, res, "admin-pdf-slicer.hbs", "layout", {
      title: enriched
        ? `PDF Slicer Studio: ${enriched.title} — Unilib Admin`
        : `${config.appName} — Visual PDF Chapter Slicer`,
      appName: config.appName,
      isAdmin: true,
      activeAdminTab: "slicer",
      resource: enriched,
      pdfResources,
      sectionsJson: JSON.stringify(enriched?.sections || []),
      userContext,
      successMsg: req.query.success || null,
      errorMsg: req.query.error || null,
      currentYear: new Date().getFullYear(),
    });
  } catch (err) {
    console.error("[Unilib Admin] Error rendering PDF slicer studio:", err);
    return renderPage(req, res, "error.hbs", "layout", {
      title: "Admin Error — Unilib",
      appName: config.appName,
      error: err.message,
    });
  }
}

/**
 * 11c. Save PDF Slices / Chapters
 * POST /admin/resources/:id/slicer
 */
export async function saveResourceSlices(req, res) {
  const wantsJson = (req.headers?.accept || "").includes("application/json");
  try {
    const resourceId = req.params.id;
    const existing = await resourceRepository.findById(resourceId);
    if (!existing) {
      if (wantsJson) {
        return sendError(res, new Error("Resource not found."), { req, statusCode: 404 });
      }
      return res.redirect("/admin?error=Resource+not+found.");
    }

    const { sections } = req.body;
    let parsedSections = [];
    if (sections) {
      try {
        parsedSections = typeof sections === "string" ? JSON.parse(sections) : sections;
        if (!Array.isArray(parsedSections)) parsedSections = [];
      } catch {
        parsedSections = [];
      }
    }

    const updated = await resourceService.updateResource(resourceId, {
      sections: parsedSections,
    });

    if (wantsJson) {
      return sendSuccess(
        res,
        {
          id: updated.id,
          sections: updated.sections || [],
          sectionsCount: (updated.sections || []).length,
        },
        { req }
      );
    }

    return res.redirect(
      `/admin/resources/${resourceId}/slicer?success=${encodeURIComponent(
        `Saved ${(updated.sections || []).length} chapter slices successfully.`
      )}`
    );
  } catch (err) {
    console.error("[Unilib Admin] Error saving resource slices:", err);
    if (wantsJson) {
      return sendError(res, err, { req, statusCode: 500 });
    }
    return res.redirect(
      `/admin/resources/${req.params.id}/slicer?error=${encodeURIComponent(err.message || "Failed to save chapters.")}`
    );
  }
}

/**
 * 11d. Get PDF Page Count & Metadata for Slicer
 * GET /admin/resources/:id/pdf-info
 */
export async function getResourcePdfInfo(req, res) {
  try {
    const resourceId = req.params.id;
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      return sendError(res, new Error("Resource not found."), { req, statusCode: 404 });
    }

    const buffer = await resourceService.getResourcePdfBuffer(resource);
    const pageCount = await pdfSliceService.getPdfPageCount(buffer);

    return sendSuccess(
      res,
      {
        id: resource.id,
        title: resource.title,
        fileName: resource.file_name,
        pageCount,
        sections: resource.sections || [],
      },
      { req }
    );
  } catch (err) {
    console.error("[Unilib Admin] Error inspecting PDF info:", err);
    return sendError(res, err, { req, statusCode: 500 });
  }
}

/**
 * 12. Handle Resource Deletion
 * POST /admin/resources/:id/delete
 */
export async function deleteResource(req, res) {
  try {
    const resourceId = req.params.id;
    const deleted = await resourceService.deleteResource(resourceId);

    if (!deleted) {
      return res.redirect("/admin?error=Resource+not+found.");
    }

    return res.redirect("/admin?success=Resource+and+attached+file+deleted+successfully.");
  } catch (err) {
    console.error("[Unilib Admin] Error deleting resource:", err);
    return res.redirect(`/admin?error=${encodeURIComponent(err.message || "Delete failed.")}`);
  }
}

/**
 * 12b. Handle Resource Visibility Toggle
 * POST /admin/resources/:id/toggle-visibility
 */
export async function toggleResourceVisibility(req, res) {
  try {
    const resourceId = req.params.id;
    const updated = await resourceRepository.toggleVisibility(resourceId);
    if (!updated) {
      return res.redirect("/admin?error=Resource+not+found.");
    }

    await resourceService.invalidateCourseCaches(updated.course_code);
    const statusText = updated.is_visible ? "visible to students" : "hidden from students";
    return res.redirect(`/admin?success=Resource+is+now+${encodeURIComponent(statusText)}.`);
  } catch (err) {
    console.error("[Unilib Admin] Error toggling visibility:", err);
    return res.redirect(`/admin?error=${encodeURIComponent(err.message || "Failed to toggle visibility.")}`);
  }
}

/**
 * 13. Dynamic Quiz/Assignment Fetching for Solution Parent Linking
 * GET /admin/quizzes/:courseCode
 */
export async function getCourseQuizzes(req, res) {
  try {
    const courseCode = req.params.courseCode;
    const [quizzes, linkableParents, availableSolutions] = await Promise.all([
      resourceRepository.findQuizzesAndAssignments(courseCode),
      resourceRepository.findLinkableParents(courseCode),
      resourceRepository.findAvailableSolutions(courseCode),
    ]);
    const textbooks = linkableParents.filter((p) => p.type === "textbook");
    return sendSuccess(
      res,
      {
        quizzes,
        textbooks,
        parents: linkableParents,
        solutions: availableSolutions,
      },
      { req }
    );
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

/**
 * 14. Metrics JSON API
 * GET /admin/metrics
 */
export async function getAdminMetrics(req, res) {
  try {
    const totalCourses = await courseRepository.getCount();
    const totalResources = await resourceRepository.getCount();
    const totalViews = await resourceRepository.getTotalViews();
    const rawStorage = await resourceRepository.getTotalStorageSize();

    return sendSuccess(
      res,
      {
        courses: totalCourses,
        resources: totalResources,
        views: totalViews,
        storageBytes: rawStorage,
        storageFormatted: formatBytes(rawStorage),
        cacheDriver: cacheService.isRedisConnected() ? "Upstash Redis" : "In-Memory Store",
        systemStatus: "healthy",
        uptime: process.uptime(),
      },
      { req }
    );
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

export default {
  renderAdminDashboard,
  renderCoursesPage,
  renderCreateCoursePage,
  renderEditCoursePage,
  createCourse,
  editCourse,
  deleteCourse,
  renderUploadResourcePage,
  renderEditResourcePage,
  renderResourceSlicerPage,
  saveResourceSlices,
  getResourcePdfInfo,
  uploadResource,
  editResource,
  deleteResource,
  toggleResourceVisibility,
  getCourseQuizzes,
  getAdminMetrics,
};
