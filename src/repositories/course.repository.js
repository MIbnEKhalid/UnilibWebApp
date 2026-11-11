import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAdapter } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COURSES_FILE_PATH = path.resolve(__dirname, "../config/courses.json");

/**
 * CourseRepository
 * Reads and manages courses directly from src/config/courses.json.
 * No separate database table is required for courses.
 */
export class CourseRepository {
  constructor(filePath = COURSES_FILE_PATH, db = defaultAdapter) {
    this.filePath = filePath;
    this.db = db;
    this._coursesCache = null;
    this._countsCache = null;
    this._countsCacheTime = 0;
  }

  _loadCourses() {
    if (this._coursesCache) {
      return this._coursesCache;
    }
    try {
      if (!fs.existsSync(this.filePath)) {
        return [];
      }
      const raw = fs.readFileSync(this.filePath, "utf-8");
      this._coursesCache = JSON.parse(raw);
      return this._coursesCache;
    } catch (err) {
      console.error("[CourseRepository] Error reading courses.json:", err);
      return this._coursesCache || [];
    }
  }

  _saveCourses(courses) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(courses, null, 2), "utf-8");
      this._coursesCache = courses;
      this.invalidateCountsCache();
    } catch (err) {
      console.error("[CourseRepository] Error writing courses.json:", err);
      throw err;
    }
  }

  invalidateCountsCache() {
    this._countsCache = null;
    this._countsCacheTime = 0;
  }

  async _getResourceCounts() {
    if (this._countsCache && Date.now() - this._countsCacheTime < 30000) {
      return this._countsCache;
    }
    try {
      const { rows } = await this.db.query(
        `SELECT course_code, COUNT(id) as count FROM unilib_resources GROUP BY course_code`
      );
      const counts = new Map();
      for (const r of rows) {
        if (r.course_code) {
          counts.set(r.course_code.toUpperCase(), parseInt(r.count || 0, 10));
        }
      }
      this._countsCache = counts;
      this._countsCacheTime = Date.now();
      return counts;
    } catch {
      return this._countsCache || new Map();
    }
  }

  async findAll(options = {}) {
    const rawCourses = this._loadCourses();
    const counts = await this._getResourceCounts();

    let list = rawCourses.map((c) => ({
      id: c.code,
      code: c.code,
      title: c.title,
      semester: parseInt(c.semester, 10),
      resource_count: counts.get(c.code.toUpperCase()) || 0,
    }));

    if (options.semester) {
      const semNum = parseInt(options.semester, 10);
      list = list.filter((c) => c.semester === semNum);
    }

    if (options.search) {
      const term = options.search.toLowerCase();
      list = list.filter(
        (c) =>
          c.code.toLowerCase().includes(term) ||
          c.title.toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
    return list;
  }

  async findByCode(code, { includeCounts = true } = {}) {
    if (!code) return null;
    const cleanCode = String(code).trim().toUpperCase();
    const rawCourses = this._loadCourses();
    const found = rawCourses.find((c) => c.code.toUpperCase() === cleanCode);
    if (!found) return null;

    let resourceCount = 0;
    if (includeCounts) {
      const counts = await this._getResourceCounts();
      resourceCount = counts.get(found.code.toUpperCase()) || 0;
    }

    return {
      id: found.code,
      code: found.code,
      title: found.title,
      semester: parseInt(found.semester, 10),
      resource_count: resourceCount,
    };
  }

  async findById(id) {
    return this.findByCode(id);
  }

  async findByCodeOrId(codeOrId) {
    return this.findByCode(codeOrId);
  }

  async getMap() {
    const rawCourses = this._loadCourses();
    const map = new Map();
    for (const c of rawCourses) {
      map.set(c.code.toUpperCase(), {
        id: c.code,
        code: c.code,
        title: c.title,
        semester: parseInt(c.semester, 10),
      });
    }
    return map;
  }

  async getCount() {
    const list = this._loadCourses();
    return list.length;
  }

  async getSemesterSummary() {
    const courses = await this.findAll();
    return [1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
      const semCourses = courses.filter((c) => c.semester === sem);
      const totalResources = semCourses.reduce((sum, c) => sum + (c.resource_count || 0), 0);
      return {
        semester: sem,
        course_count: semCourses.length,
        resource_count: totalResources,
        courses: semCourses,
      };
    });
  }

  async create(data) {
    const { code, title, semester } = data;
    if (!code || !title) {
      throw new Error("Course code and title are required.");
    }
    const cleanCode = code.trim().toUpperCase();
    const courses = this._loadCourses();

    if (courses.some((c) => c.code.toUpperCase() === cleanCode)) {
      throw new Error(`Course with code ${cleanCode} already exists.`);
    }

    const newCourse = {
      code: cleanCode,
      title: title.trim(),
      semester: parseInt(semester, 10) || 1,
    };

    courses.push(newCourse);
    courses.sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
    this._saveCourses(courses);

    return {
      id: newCourse.code,
      ...newCourse,
      resource_count: 0,
    };
  }

  async update(code, data) {
    if (!code) throw new Error("Course code is required for update.");
    const cleanCode = String(code).trim().toUpperCase();
    const courses = this._loadCourses();
    const idx = courses.findIndex((c) => c.code.toUpperCase() === cleanCode);
    if (idx === -1) return null;

    const existing = courses[idx];
    const updatedCode = data.code ? data.code.trim().toUpperCase() : existing.code;

    // Check conflict if code changed
    if (updatedCode !== cleanCode && courses.some((c) => c.code.toUpperCase() === updatedCode)) {
      throw new Error(`Course with code ${updatedCode} already exists.`);
    }

    // If course code changed, also update any attached resources in DB
    if (updatedCode !== cleanCode) {
      try {
        await this.db.query(
          `UPDATE unilib_resources SET course_code = $1 WHERE UPPER(course_code) = $2`,
          [updatedCode, cleanCode]
        );
      } catch (err) {
        console.warn("[CourseRepository] Could not cascade course_code update:", err.message);
      }
    }

    courses[idx] = {
      code: updatedCode,
      title: data.title ? data.title.trim() : existing.title,
      semester: data.semester ? parseInt(data.semester, 10) : existing.semester,
    };

    courses.sort((a, b) => a.semester - b.semester || a.code.localeCompare(b.code));
    this._saveCourses(courses);

    return {
      id: courses[idx].code,
      ...courses[idx],
    };
  }

  async delete(code) {
    if (!code) return false;
    const cleanCode = String(code).trim().toUpperCase();
    const courses = this._loadCourses();
    const filtered = courses.filter((c) => c.code.toUpperCase() !== cleanCode);
    if (filtered.length === courses.length) return false;

    this._saveCourses(filtered);
    return true;
  }
}

export const courseRepository = new CourseRepository();
export default courseRepository;
