import { sendSuccess, sendError } from "mbkutils";
import { testDbConnection } from "../db/connection.js";
import courseRepository from "../repositories/course.repository.js";
import resourceRepository from "../repositories/resource.repository.js";
import resourceService from "../services/resource.service.js";
import cacheService from "../services/cache.service.js";

export async function getHealth(req, res) {
  try {
    const dbOk = await testDbConnection();
    let storageStatus = "connected";

    if (process.env.NODE_ENV !== "test") {
      try {
        const hasConn = !!(process.env.StorageConnection || process.env.BucketConnection);
        storageStatus = hasConn ? "connected" : "degraded";
      } catch {
        storageStatus = "degraded";
      }
    }

    const data = {
      status: dbOk ? "ok" : "degraded",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: dbOk ? "connected" : "unreachable",
      storage: storageStatus,
      cacheDriver: cacheService.isRedisConnected() ? "upstash-redis" : "memory-fallback",
      version: process.env.npm_package_version || "1.0.0",
      node: process.version,
    };
    return sendSuccess(res, data, { req, message: "Unilib service healthy" });
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

export async function getCourses(req, res) {
  try {
    const semester = req.query.semester ? parseInt(req.query.semester, 10) : undefined;
    const courses = await courseRepository.findAll({ semester });
    return sendSuccess(res, { courses, count: courses.length }, { req });
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

export async function getCourse(req, res) {
  try {
    const identifier = req.params.code || req.params.codeOrId;
    const data = await resourceService.getCourseWithResources(identifier);
    if (!data) {
      return sendError(res, new Error("Course not found"), { req, statusCode: 404 });
    }
    return sendSuccess(res, data, { req });
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

export async function getCourseQuizzes(req, res) {
  try {
    const courseCode = req.params.courseCode;
    const quizzes = await resourceRepository.findQuizzesAndAssignments(courseCode);
    return sendSuccess(res, { quizzes }, { req });
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

export async function uploadResourceApi(req, res) {
  try {
    const { course_code, type, title, description, parent_resource_id } = req.body;
    const file = req.file;
    const selectedCourseCode = (course_code || "").trim().toUpperCase();

    if (!file) {
      return sendError(res, new Error("File is required for upload."), { req, statusCode: 400 });
    }
    if (!selectedCourseCode || !type) {
      return sendError(res, new Error("course_code and type are required."), { req, statusCode: 400 });
    }

    const uploader = req.session?.user?.username || req.session?.user?.name || "admin";
    const resource = await resourceService.uploadResource({
      courseCode: selectedCourseCode,
      type,
      title: title || file.originalname,
      description,
      parentResourceId: parent_resource_id || null,
      file,
      uploaderId: uploader,
    });

    return sendSuccess(res, { resource }, { req, statusCode: 201, message: "Resource uploaded successfully" });
  } catch (err) {
    return sendError(res, err, { req, statusCode: 400 });
  }
}

export async function deleteResourceApi(req, res) {
  try {
    const deleted = await resourceService.deleteResource(req.params.id);
    if (!deleted) {
      return sendError(res, new Error("Resource not found"), { req, statusCode: 404 });
    }
    return sendSuccess(res, { success: true }, { req, message: "Resource deleted successfully" });
  } catch (err) {
    return sendError(res, err, { req, statusCode: 500 });
  }
}

export default {
  getHealth,
  getCourses,
  getCourse,
  getCourseQuizzes,
  uploadResourceApi,
  deleteResourceApi,
};
