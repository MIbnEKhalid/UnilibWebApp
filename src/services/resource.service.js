import { pipeline } from "node:stream/promises";
import path from "node:path";
import { renderPage } from "mbkutils";
import { config } from "../config/env.js";
import courseRepository from "../repositories/course.repository.js";
import resourceRepository from "../repositories/resource.repository.js";
import storageService from "./storage.service.js";
import cacheService from "./cache.service.js";
import pdfSliceService from "./pdf-slice.service.js";

function sanitizeFilename(originalName) {
  const ext = path.extname(originalName) || "";
  const name = path.basename(originalName, ext);
  const clean = name
    .replace(/[^a-zA-Z0-9_\-\s]/g, "")
    .trim()
    .replace(/\s+/g, "_");
  return `${clean || "file"}_${Date.now()}${ext.toLowerCase()}`;
}

export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function getFileIcon(mimeType, fileName) {
  const lowerName = (fileName || "").toLowerCase();
  const lowerMime = (mimeType || "").toLowerCase();

  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) {
    return { icon: "fa-solid fa-file-pdf", color: "text-red-500", label: "PDF" };
  }
  if (
    lowerMime.includes("word") ||
    lowerMime.includes("officedocument") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx")
  ) {
    return { icon: "fa-solid fa-file-word", color: "text-blue-500", label: "DOC" };
  }
  if (
    lowerMime.startsWith("image/") ||
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp")
  ) {
    return { icon: "fa-solid fa-file-image", color: "text-emerald-500", label: "IMG" };
  }
  if (
    lowerMime.includes("zip") ||
    lowerMime.includes("rar") ||
    lowerMime.includes("tar") ||
    lowerName.endsWith(".zip") ||
    lowerName.endsWith(".rar")
  ) {
    return { icon: "fa-solid fa-file-zipper", color: "text-amber-500", label: "ZIP" };
  }
  return { icon: "fa-solid fa-file-lines", color: "text-slate-400", label: "FILE" };
}

function sendBufferWithRange(req, res, buffer, { mimeType, fileName, inline, etag }) {
  const total = buffer.length;
  const disposition = inline ? "inline" : "attachment";
  const cleanFileName = (fileName || "download")
    .replace(/["\\]/g, "")
    .replace(/[^\x20-\x7E]/g, "_");

  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
  if (etag) {
    res.setHeader("ETag", etag);
    if (req?.headers && req.headers["if-none-match"] === etag) {
      return res.status(304).end();
    }
  }

  res.setHeader("Content-Type", mimeType || "application/octet-stream");
  res.setHeader(
    "Content-Disposition",
    `${disposition}; filename="${cleanFileName}"; filename*=UTF-8''${encodeURIComponent(fileName || cleanFileName)}`
  );

  const range = req?.headers?.range;
  if (range && range.startsWith("bytes=")) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;

    if (!isNaN(start) && start < total && (isNaN(end) || end < total) && start <= end) {
      const chunk = buffer.subarray(start, end + 1);
      res.status(206);
      res.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
      res.setHeader("Content-Length", chunk.length);
      return res.send(chunk);
    } else {
      res.status(416);
      res.setHeader("Content-Range", `bytes */${total}`);
      return res.end();
    }
  }

  res.setHeader("Content-Length", total);
  return res.send(buffer);
}

export class ResourceService {
  async getHomepageData() {
    return cacheService.wrap("unilib:homepage:summary", 900, async () => {
      // 1. Fetch course map and raw course definitions
      const courseMap = await courseRepository.getMap();
      const rawCourses = courseRepository._loadCourses();

      // 2. Optimized parallel DB queries: materials list + aggregate stats + course counts
      const { rawMaterials, countsMap, stats } = await resourceRepository.getLandingSummary(200);

      // 3. Map materials with course metadata & file badges
      const enrichedMaterials = rawMaterials.map((r) => {
        const cleanCode = (r.course_code || "").toUpperCase();
        const course = courseMap.get(cleanCode);
        return {
          ...r,
          course_code: cleanCode,
          course_title: course?.title || cleanCode,
          course_semester: course?.semester || 1,
          formatted_size: formatBytes(r.file_size),
          file_badge: getFileIcon(r.mime_type, r.file_name),
          solutions: [],
        };
      });

      // Map potential parent resources (textbooks, quizzes, assignments, lab manuals) to attach child solutions
      const parentMap = new Map();
      for (const item of enrichedMaterials) {
        if (item.type === "textbook" || item.type === "quiz_assignment" || item.type === "lab_manual") {
          parentMap.set(item.id, item);
        }
      }

      // Track linked solution IDs to nest under parent resource instead of duplicating top-level
      const linkedSolutionIds = new Set();
      for (const item of enrichedMaterials) {
        if (item.type === "solution" && item.parent_resource_id) {
          const parent = parentMap.get(item.parent_resource_id);
          if (parent) {
            parent.solutions.push(item);
            linkedSolutionIds.add(item.id);
          }
        }
      }

      // Filter out linked solutions so they display nested under their parent Textbook / Quiz
      const allMaterials = enrichedMaterials.filter((m) => !linkedSolutionIds.has(m.id));

      const currentSemNum = config.currentSemester || 1;

      // 4. Construct sorted course list with counts directly from countsMap
      const courses = rawCourses.map((c) => ({
        id: c.code,
        code: c.code,
        title: c.title,
        semester: parseInt(c.semester, 10),
        resource_count: countsMap.get(c.code.toUpperCase()) || 0,
      })).sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));

      // 5. Build semester partitions
      const semesters = [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
        const semCourses = courses.filter((c) => c.semester === sem);
        const semMaterials = allMaterials.filter((m) => m.course_semester === sem);
        return {
          semester: sem,
          isCurrent: sem === currentSemNum,
          course_count: semCourses.length,
          resource_count: semMaterials.length,
          courses: semCourses,
          materials: semMaterials,
        };
      });

      const currentSemesterMaterials = allMaterials.filter((m) => m.course_semester === currentSemNum);

      return {
        semesters,
        allMaterials,
        currentSemester: currentSemNum,
        currentSemesterMaterials,
        recent: allMaterials.slice(0, 8),
        stats: {
          courses: courses.length,
          resources: stats.resources,
          views: stats.views || 0,
        },
      };
    });
  }

  async getCourseWithResources(identifier) {
    const cacheKey = `unilib:course:${identifier}:details`;
    return cacheService.wrap(cacheKey, 1800, async () => {
      const course = await courseRepository.findByCode(identifier);
      if (!course) return null;

      const rawResources = await resourceRepository.findByCourseCode(course.code);

      // Separate into types and map linked solutions
      const textbooks = [];
      const labManuals = [];
      const quizzesAssignments = [];
      const standaloneSolutions = [];

      // Create a map of potential parents (textbooks, lab manuals, quizzes/assignments)
      const parentMap = new Map();
      for (const item of rawResources) {
        if (item.type !== "solution") {
          const enriched = {
            ...item,
            formatted_size: formatBytes(item.file_size),
            file_badge: getFileIcon(item.mime_type, item.file_name),
            solutions: [],
          };
          parentMap.set(item.id, enriched);

          if (item.type === "textbook") {
            textbooks.push(enriched);
          } else if (item.type === "lab_manual") {
            labManuals.push(enriched);
          } else if (item.type === "quiz_assignment") {
            quizzesAssignments.push(enriched);
          }
        }
      }

      for (const item of rawResources) {
        if (item.type === "solution") {
          const enriched = {
            ...item,
            formatted_size: formatBytes(item.file_size),
            file_badge: getFileIcon(item.mime_type, item.file_name),
            solutions: [],
          };

          if (item.parent_resource_id && parentMap.has(item.parent_resource_id)) {
            const parent = parentMap.get(item.parent_resource_id);
            parent.solutions.push(enriched);
          } else {
            standaloneSolutions.push(enriched);
          }
        }
      }

      return {
        course,
        counts: {
          total: rawResources.length,
          textbooks: textbooks.length,
          labManuals: labManuals.length,
          quizzesAssignments: quizzesAssignments.length,
          standaloneSolutions: standaloneSolutions.length,
        },
        resources: {
          textbooks,
          labManuals,
          quizzesAssignments,
          standaloneSolutions,
        },
      };
    });
  }

  async uploadResource({
    courseCode,
    type,
    title,
    description = "",
    parentResourceId = null,
    driveUrl = null,
    sections = null,
    isVisible = true,
    file,
    uploaderId = "admin",
  }) {
    if (!file || !file.buffer) {
      throw new Error("No file provided for upload.");
    }

    const code = String(courseCode || "").trim().toUpperCase();
    const course = await courseRepository.findByCode(code);
    if (!course) {
      throw new Error(`Course with code ${code} not found.`);
    }

    const safeFilename = sanitizeFilename(file.originalname);
    const storageKey = `unilib/${course.code.toLowerCase()}/${type}/${safeFilename}`;

    // Upload to mbkbucket
    await storageService.upload(storageKey, file.buffer, file.mimetype);

    const actualSize = Buffer.isBuffer(file.buffer) ? file.buffer.length : (file.size || 0);

    // Save record to database
    const resource = await resourceRepository.create({
      course_code: course.code,
      type,
      title: title || file.originalname,
      description,
      file_key: storageKey,
      file_name: file.originalname,
      file_size: actualSize,
      mime_type: file.mimetype,
      parent_resource_id: parentResourceId ? parseInt(parentResourceId, 10) : null,
      drive_url: driveUrl || null,
      sections: sections || null,
      is_visible: isVisible,
      uploader_id: uploaderId,
    });

    // Invalidate caches
    await this.invalidateCourseCaches(course.code);

    return resource;
  }

  async updateResource(id, data, file = null) {
    const existing = await resourceRepository.findById(id);
    if (!existing) {
      throw new Error(`Resource ${id} not found.`);
    }

    const code = String(data.course_code || existing.course_code).trim().toUpperCase();
    let fileKey = existing.file_key;
    let fileName = existing.file_name;
    let fileSize = existing.file_size;
    let mimeType = existing.mime_type;

    if (file) {
      const sanitizedKey = `unilib/${String(code).toLowerCase()}/${data.type || existing.type}/${sanitizeFilename(file.originalname)}`;
      await storageService.upload(sanitizedKey, file.buffer, file.mimetype);

      if (existing.file_key && existing.file_key !== sanitizedKey) {
        try {
          await storageService.delete(existing.file_key);
        } catch (e) {
          console.warn("[Unilib] Could not delete old file on update:", e.message);
        }
      }

      fileKey = sanitizedKey;
      fileName = file.originalname;
      fileSize = Buffer.isBuffer(file.buffer) ? file.buffer.length : (file.size || 0);
      mimeType = file.mimetype;
    }

    const updated = await resourceRepository.update(id, {
      title: data.title || existing.title,
      description: data.description !== undefined ? data.description : existing.description,
      course_code: code,
      type: data.type || existing.type,
      parent_resource_id: data.parent_resource_id !== undefined ? data.parent_resource_id : existing.parent_resource_id,
      drive_url: data.drive_url !== undefined ? data.drive_url : (data.driveUrl !== undefined ? data.driveUrl : undefined),
      sections: data.sections !== undefined ? data.sections : undefined,
      is_visible: data.is_visible !== undefined ? data.is_visible : undefined,
    });

    if (file) {
      await resourceRepository.query(
        `UPDATE unilib_resources SET file_key = $1, file_name = $2, file_size = $3, mime_type = $4 WHERE id = $5`,
        [fileKey, fileName, fileSize, mimeType, id]
      );
    }

    await this.invalidateCourseCaches(existing.course_code);
    if (code && code.toUpperCase() !== existing.course_code.toUpperCase()) {
      await this.invalidateCourseCaches(code);
    }

    return updated;
  }

  async deleteResource(id) {
    const resource = await resourceRepository.findById(id);
    if (!resource) return false;

    // Delete physical file from storage
    try {
      await storageService.delete(resource.file_key);
    } catch (err) {
      console.warn(`[Unilib] Could not delete physical file ${resource.file_key}:`, err.message);
    }

    // Delete record from database
    await resourceRepository.delete(id);

    // Invalidate caches
    await this.invalidateCourseCaches(resource.course_code);

    return true;
  }

  async invalidateCourseCaches(courseCode) {
    courseRepository.invalidateCountsCache();
    await cacheService.del("unilib:homepage:summary");
    await cacheService.del("unilib:semesters:summary");
    await cacheService.delPattern("unilib:slice:*");
    if (courseCode) {
      await cacheService.delPattern(`unilib:course:${courseCode}:*`);
      await cacheService.delPattern(`unilib:course:${String(courseCode).toLowerCase()}:*`);
      await cacheService.delPattern(`unilib:course:${String(courseCode).toUpperCase()}:*`);
    }
  }

  isDriveBlocked(req) {
    if (!req) return false;

    // 1. Explicit query parameter override (e.g. ?source=mbkbucket or ?source=drive)
    if (req.query?.source === "mbkbucket" || req.query?.source === "local") return true;
    if (req.query?.source === "drive" || req.query?.source === "gdrive") return false;

    // 2. Client-observed Google Drive reachability cookie
    const cookieHeader = req.headers?.cookie || "";
    const match = cookieHeader.match(/(?:^|;\s*)gdrive_status=([^;]*)/);
    if (match) {
      const status = decodeURIComponent(match[1]);
      if (status === "blocked") return true;
      if (status === "ok") return false;
    }

    // 3. Client custom header
    if (req.headers && req.headers["x-gdrive-status"] === "blocked") {
      return true;
    }

    return false;
  }

  getDriveDownloadUrl(driveUrl) {
    if (!driveUrl) return null;
    const folderMatch = driveUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (folderMatch) {
      return driveUrl;
    }
    const fileIdMatch = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || driveUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://drive.usercontent.google.com/uc?id=${fileIdMatch[1]}&export=download`;
    }
    return driveUrl;
  }

  async serveFile(resourceId, res, { inline = false } = {}) {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      res.status(404);
      if (res.req) {
        return renderPage(res.req, res, "error.hbs", "layout", {
          title: "Not Found — Unilib",
          status: 404,
          error: "Academic resource file not found.",
          appName: "Unilib",
        });
      }
      return res.status(404).send("Academic resource file not found.");
    }

    // Smart Dual Mirror Routing:
    // If resource has a Google Drive companion URL and Google Drive is accessible,
    // route to Google Drive directly to save university server bandwidth.
    // If Google Drive is blocked (e.g. campus Wi-Fi firewall), fallback to streaming via MBKBucket.
    if (resource.drive_url) {
      const isDriveBlocked = this.isDriveBlocked(res.req);
      if (!isDriveBlocked) {
        resourceRepository.incrementViewsCount(resource.id).catch((e) => {
          console.warn("[Unilib] Could not increment views count:", e.message);
        });

        const targetUrl = inline
          ? resource.drive_url
          : this.getDriveDownloadUrl(resource.drive_url);

        return res.redirect(targetUrl);
      }
    }

    const etag = `W/"res-${resource.id}-${resource.file_size}-${Date.parse(resource.updated_at || resource.created_at) || 0}"`;
    if (res.req?.headers && res.req.headers["if-none-match"] === etag) {
      res.setHeader("ETag", etag);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.status(304).end();
    }

    // Increment views count asynchronously
    resourceRepository.incrementViewsCount(resource.id).catch((e) => {
      console.warn("[Unilib] Could not increment views count:", e.message);
    });

    try {
      const buffer = await this.getResourcePdfBuffer(resource);
      return sendBufferWithRange(res.req, res, buffer, {
        mimeType: resource.mime_type,
        fileName: resource.file_name,
        inline,
        etag,
      });
    } catch (err) {
      console.error("[Unilib] Error streaming resource file:", err);
      if (!res.headersSent) {
        res.status(500);
        if (res.req) {
          return renderPage(res.req, res, "error.hbs", "layout", {
            title: "Download Error — Unilib",
            status: 500,
            error: "Failed to download the requested resource.",
            appName: "Unilib",
          });
        }
        return res.status(500).send("Failed to download the requested resource.");
      }
    }
  }

  async getFileBuffer(storageKey) {
    const result = await storageService.download(storageKey);
    if (Buffer.isBuffer(result)) {
      return result;
    }
    const stream = result?.Body || result?.stream || (typeof result?.[Symbol.asyncIterator] === "function" ? result : null);
    if (stream && (typeof stream.pipe === "function" || typeof stream[Symbol.asyncIterator] === "function")) {
      const chunks = [];
      for await (const chunk of stream) {
        chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
      }
      return Buffer.concat(chunks);
    }
    if (result && result.buffer && Buffer.isBuffer(result.buffer)) {
      return result.buffer;
    }
    throw new Error("Unable to read storage response into buffer.");
  }

  async fetchRemotePdfBuffer(url) {
    if (!url) return null;
    const cleanUrl = String(url).trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      return null;
    }

    // Special handling for Google Drive links (extract file ID and query usercontent/uc endpoint)
    const fileIdMatch = cleanUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || cleanUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      const candidates = [
        `https://drive.usercontent.google.com/uc?id=${fileId}&export=download`,
        `https://drive.google.com/uc?id=${fileId}&export=download&confirm=t`,
        `https://docs.google.com/uc?export=download&id=${fileId}`,
      ];

      for (const candidate of candidates) {
        try {
          const resp = await fetch(candidate, {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
            redirect: "follow",
          });
          if (!resp.ok) continue;
          const buf = Buffer.from(await resp.arrayBuffer());
          if (buf.length > 10 && buf.subarray(0, 5).toString() === "%PDF-") {
            return buf;
          }
          // Handle Google Drive virus warning page for large files
          const text = buf.toString("utf-8", 0, Math.min(buf.length, 5000));
          const confirmMatch =
            text.match(/confirm=([0-9A-Za-z_-]+)/) ||
            text.match(/name="confirm"\s+value="([0-9A-Za-z_-]+)"/);
          if (confirmMatch && confirmMatch[1]) {
            const confirmUrl = `https://drive.google.com/uc?export=download&confirm=${confirmMatch[1]}&id=${fileId}`;
            const confirmResp = await fetch(confirmUrl, { redirect: "follow" });
            if (confirmResp.ok) {
              const confirmBuf = Buffer.from(await confirmResp.arrayBuffer());
              if (confirmBuf.subarray(0, 5).toString() === "%PDF-") {
                return confirmBuf;
              }
            }
          }
        } catch (e) {
          console.warn(`[Unilib] Failed to fetch Drive candidate ${candidate}:`, e.message);
        }
      }
    }

    // Direct HTTP/HTTPS fetch (e.g. CDN or direct link)
    try {
      const resp = await fetch(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        redirect: "follow",
      });
      if (resp.ok) {
        const buf = Buffer.from(await resp.arrayBuffer());
        if (buf.length > 10 && buf.subarray(0, 5).toString() === "%PDF-") {
          return buf;
        }
      }
    } catch (e) {
      console.warn(`[Unilib] Direct remote PDF fetch failed for ${cleanUrl}:`, e.message);
    }

    return null;
  }

  async getResourcePdfBuffer(resource) {
    if (!resource) throw new Error("Resource not found");

    // 1. Check cache
    const cacheKey = `unilib:fullpdf:${resource.id}:${resource.file_size || 0}`;
    try {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        if (Buffer.isBuffer(cached)) return cached;
        if (cached.data) return Buffer.from(cached.data);
      }
    } catch {}

    // 2. Try MBKBucket storage if file_key is set
    if (resource.file_key) {
      try {
        const buffer = await this.getFileBuffer(resource.file_key);
        if (buffer && buffer.length > 0) {
          cacheService.set(cacheKey, buffer, 1800).catch(() => {});
          return buffer;
        }
      } catch (storageErr) {
        console.warn(`[Unilib] MBKBucket download skipped/failed for ${resource.file_key}:`, storageErr.message);
      }
    }

    // 3. Try Google Drive companion URL
    if (resource.drive_url) {
      const driveBuffer = await this.fetchRemotePdfBuffer(resource.drive_url);
      if (driveBuffer && driveBuffer.length > 0) {
        cacheService.set(cacheKey, driveBuffer, 1800).catch(() => {});
        return driveBuffer;
      }
    }

    throw new Error("Unable to retrieve source PDF from MBKBucket storage or Google Drive.");
  }

  async serveSectionFile(resourceId, sectionId, res, { inline = false } = {}) {
    const resource = await resourceRepository.findById(resourceId);
    if (!resource) {
      res.status(404);
      if (res.req) {
        return renderPage(res.req, res, "error.hbs", "layout", {
          title: "Not Found — Unilib",
          status: 404,
          error: "Academic resource file not found.",
          appName: "Unilib",
        });
      }
      return res.status(404).send("Academic resource file not found.");
    }

    const section = (resource.sections || []).find((s) => String(s.id) === String(sectionId));
    if (!section) {
      res.status(404);
      if (res.req) {
        return renderPage(res.req, res, "error.hbs", "layout", {
          title: "Section Not Found — Unilib",
          status: 404,
          error: "Requested chapter / section not found in this resource.",
          appName: "Unilib",
        });
      }
      return res.status(404).send("Requested chapter / section not found.");
    }

    // Google Drive & MBKBucket Smart Routing for Chapter Slices:
    // Only redirect if the section itself has an individual companion Drive URL
    const isDriveBlocked = this.isDriveBlocked(res.req);
    const forceMbk = res.req?.query?.source === "mbkbucket";

    if (section.drive_url && !forceMbk && !isDriveBlocked) {
      resourceRepository.incrementViewsCount(resource.id).catch((e) => {
        console.warn("[Unilib] Could not increment views count for section:", e.message);
      });
      const targetUrl = inline
        ? section.drive_url
        : this.getDriveDownloadUrl(section.drive_url);
      return res.redirect(targetUrl);
    }

    const isPdf =
      (resource.mime_type || "").toLowerCase().includes("pdf") ||
      (resource.file_name || "").toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      res.status(400);
      if (res.req) {
        return renderPage(res.req, res, "error.hbs", "layout", {
          title: "Format Unsupported — Unilib",
          status: 400,
          error: "Page range slicing is only supported on PDF documents.",
          appName: "Unilib",
        });
      }
      return res.status(400).send("Page range slicing is only supported on PDF documents.");
    }

    const etag = `W/"res-${resource.id}-sec-${section.id}-${section.start_page}-${section.end_page}-${resource.file_size}"`;
    if (res.req?.headers && res.req.headers["if-none-match"] === etag) {
      res.setHeader("ETag", etag);
      res.setHeader("Accept-Ranges", "bytes");
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      return res.status(304).end();
    }

    // Increment views count asynchronously
    resourceRepository.incrementViewsCount(resource.id).catch((e) => {
      console.warn("[Unilib] Could not increment views count for section:", e.message);
    });

    try {
      const sliceCacheKey = `unilib:slice:${resource.id}:${section.id}:${resource.file_size}`;
      let sliced = await cacheService.get(sliceCacheKey);
      if (!sliced || !sliced.buffer) {
        const sourceBuffer = await this.getResourcePdfBuffer(resource);
        sliced = await pdfSliceService.extractPageRange(
          sourceBuffer,
          section.start_page,
          section.end_page
        );
        await cacheService.set(sliceCacheKey, sliced, 3600);
      }

      const rawBase = path.basename(
        resource.file_name || "document",
        path.extname(resource.file_name || "document")
      );
      const cleanSectionTitle = (section.title || `chapter_${sliced.startPage}_${sliced.endPage}`)
        .replace(/[^a-zA-Z0-9_\-\s]/g, "")
        .trim()
        .replace(/\s+/g, "_");
      const downloadFileName = `${rawBase}_${cleanSectionTitle}_p${sliced.startPage}-${sliced.endPage}.pdf`;

      const sliceBuffer = Buffer.isBuffer(sliced.buffer) ? sliced.buffer : Buffer.from(sliced.buffer);

      return sendBufferWithRange(res.req, res, sliceBuffer, {
        mimeType: "application/pdf",
        fileName: downloadFileName,
        inline,
        etag,
      });
    } catch (err) {
      console.error("[Unilib] Error slicing PDF section from MBKBucket:", err);

      // Only fallback to Drive if this section specifically has its own Drive mirror
      if (!res.headersSent && section.drive_url && !isDriveBlocked) {
        console.warn(`[Unilib] MBKBucket extraction failed; falling back to section Drive mirror for section ${section.id}`);
        const targetUrl = inline ? section.drive_url : this.getDriveDownloadUrl(section.drive_url);
        return res.redirect(targetUrl);
      }

      if (!res.headersSent) {
        res.status(500);
        if (res.req) {
          return renderPage(res.req, res, "error.hbs", "layout", {
            title: "Extraction Error — Unilib",
            status: 500,
            error: "Failed to extract and serve requested pages from document.",
            appName: "Unilib",
          });
        }
        return res.status(500).send("Failed to extract pages from document.");
      }
    }
  }
}

export const resourceService = new ResourceService();
export default resourceService;
