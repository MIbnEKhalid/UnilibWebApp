import { BaseRepository } from "mbkauthe";
import { defaultAdapter } from "../db/index.js";
import courseRepository from "./course.repository.js";

export function parseSections(rawSections) {
  if (!rawSections) return [];
  let parsed = rawSections;
  if (typeof rawSections === "string") {
    try {
      parsed = JSON.parse(rawSections);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.map((sec, idx) => {
    const start = Math.max(1, parseInt(sec.start_page || sec.startPage || 1, 10));
    const end = Math.max(start, parseInt(sec.end_page || sec.endPage || start, 10));
    const pageSpan = end - start + 1;
    const driveUrl = sec.drive_url && typeof sec.drive_url === "string" ? sec.drive_url.trim() : null;
    return {
      id: sec.id || `sec-${idx + 1}`,
      title: (sec.title || `Section ${idx + 1}`).trim(),
      start_page: start,
      end_page: end,
      page_count: pageSpan,
      page_range_label: start === end ? `Page ${start}` : `Pages ${start}–${end}`,
      page_span_label: `${pageSpan} ${pageSpan === 1 ? "page" : "pages"}`,
      drive_url: driveUrl,
    };
  });
}

export class ResourceRepository extends BaseRepository {
  constructor(db = defaultAdapter) {
    super("unilib_resources", db, {
      dateColumns: ["created_at", "updated_at"],
    });
  }

  async _enrichWithCourse(row, courseMap = null) {
    if (!row) return null;
    const cleanCode = (row.course_code || "").toUpperCase();
    let course = null;
    if (courseMap) {
      course = courseMap.get(cleanCode);
    }
    if (!course) {
      course = await courseRepository.findByCode(cleanCode, { includeCounts: false });
    }
    const parsedSections = parseSections(row.sections);
    const isVisible = row.is_visible !== false && row.is_visible !== 0 && row.is_visible !== "0";
    const viewsCount = parseInt(row.views_count || 0, 10);
    return {
      ...this.normalizeEntity(row),
      is_visible: isVisible,
      views_count: viewsCount,
      course_code: cleanCode,
      course_title: course?.title || cleanCode,
      course_semester: course?.semester || 1,
      sections: parsedSections,
      has_sections: parsedSections.length > 0,
      sections_count: parsedSections.length,
    };
  }

  async create(data) {
    const {
      course_code,
      type,
      title,
      description,
      file_key,
      file_name,
      file_size,
      mime_type,
      parent_resource_id,
      drive_url = null,
      sections,
      is_visible = true,
      views_count = 0,
      uploader_id = "admin",
    } = data;

    const code = String(course_code || "").trim().toUpperCase();
    const sectionsJson = sections
      ? (typeof sections === "string" ? sections : JSON.stringify(sections))
      : null;
    const isVisibleVal = is_visible === false || is_visible === 0 || is_visible === "0" || is_visible === "false" ? false : true;

    const { rows } = await this.query(
      `INSERT INTO unilib_resources (
        course_code, type, title, description,
        file_key, file_name, file_size, mime_type,
        parent_resource_id, drive_url, sections, is_visible, views_count, uploader_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id, course_code, type, title, description,
                file_key, file_name, file_size, mime_type, parent_resource_id, drive_url,
                sections, is_visible, views_count, uploader_id, created_at, updated_at`,
      [
        code,
        type,
        title.trim(),
        description || null,
        file_key,
        file_name,
        parseInt(file_size, 10) || 0,
        mime_type,
        parent_resource_id ? parseInt(parent_resource_id, 10) : null,
        drive_url || null,
        sectionsJson,
        isVisibleVal,
        parseInt(views_count, 10) || 0,
        uploader_id,
      ]
    );

    return this._enrichWithCourse(rows[0]);
  }

  async findByCourseCode(courseCode, options = {}) {
    const cleanCode = String(courseCode || "").trim().toUpperCase();
    let sql = `
      SELECT r.id, r.course_code, r.type, r.title, r.description,
             r.file_key, r.file_name, r.file_size, r.mime_type,
             r.parent_resource_id, r.drive_url, r.sections, r.is_visible,
             r.views_count,
             r.created_at, p.title as parent_title
      FROM unilib_resources r
      LEFT JOIN unilib_resources p ON r.parent_resource_id = p.id
      WHERE r.course_code = $1
    `;
    const params = [cleanCode];

    if (!options.includeHidden) {
      sql += ` AND r.is_visible IS NOT FALSE`;
    }

    if (options.type) {
      params.push(options.type);
      sql += ` AND r.type = $${params.length}`;
    }

    sql += ` ORDER BY r.created_at DESC`;

    const { rows } = await this.query(sql, params);
    const course = await courseRepository.findByCode(cleanCode, { includeCounts: false });

    return rows.map((r) => {
      const sec = parseSections(r.sections);
      const isVisible = r.is_visible !== false && r.is_visible !== 0 && r.is_visible !== "0";
      const viewsCount = parseInt(r.views_count || 0, 10);
      return {
        ...this.normalizeEntity(r),
        is_visible: isVisible,
        views_count: viewsCount,
        course_code: cleanCode,
        course_title: course?.title || cleanCode,
        course_semester: course?.semester || 1,
        sections: sec,
        has_sections: sec.length > 0,
        sections_count: sec.length,
      };
    });
  }

  async findQuizzesAndAssignments(courseCode, options = {}) {
    const cleanCode = String(courseCode || "").trim().toUpperCase();
    let sql = `SELECT id, title, type, is_visible, created_at
       FROM unilib_resources
       WHERE UPPER(course_code) = $1 AND type = 'quiz_assignment'`;
    if (!options.includeHidden) {
      sql += ` AND is_visible IS NOT FALSE`;
    }
    sql += ` ORDER BY created_at DESC`;
    const { rows } = await this.query(sql, [cleanCode]);
    return rows.map((r) => this.normalizeEntity(r));
  }

  async findLinkableParents(courseCode, options = {}) {
    const cleanCode = String(courseCode || "").trim().toUpperCase();
    let sql = `SELECT id, title, type, is_visible, created_at
       FROM unilib_resources
       WHERE UPPER(course_code) = $1 AND type IN ('textbook', 'quiz_assignment', 'lab_manual')`;
    if (!options.includeHidden) {
      sql += ` AND is_visible IS NOT FALSE`;
    }
    sql += ` ORDER BY type ASC, created_at DESC`;
    const { rows } = await this.query(sql, [cleanCode]);
    return rows.map((r) => this.normalizeEntity(r));
  }

  async findAvailableSolutions(courseCode, options = {}) {
    const cleanCode = String(courseCode || "").trim().toUpperCase();
    let sql = `SELECT id, title, type, parent_resource_id, is_visible, created_at
       FROM unilib_resources
       WHERE UPPER(course_code) = $1 AND type = 'solution'`;
    if (!options.includeHidden) {
      sql += ` AND is_visible IS NOT FALSE`;
    }
    sql += ` ORDER BY created_at DESC`;
    const { rows } = await this.query(sql, [cleanCode]);
    return rows.map((r) => this.normalizeEntity(r));
  }

  async findSolutionForTextbook(textbookId) {
    const { rows } = await this.query(
      `SELECT * FROM unilib_resources WHERE parent_resource_id = $1 AND type = 'solution' LIMIT 1`,
      [parseInt(textbookId, 10)]
    );
    return rows[0] ? this.normalizeEntity(rows[0]) : null;
  }

  async setParentForSolution(solutionId, parentId) {
    const { rows } = await this.query(
      `UPDATE unilib_resources
       SET parent_resource_id = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [parentId ? parseInt(parentId, 10) : null, parseInt(solutionId, 10)]
    );
    return rows[0] ? this.normalizeEntity(rows[0]) : null;
  }

  async unlinkSolutionsFromParent(parentId) {
    await this.query(
      `UPDATE unilib_resources
       SET parent_resource_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE parent_resource_id = $1 AND type = 'solution'`,
      [parseInt(parentId, 10)]
    );
  }

  async findSolutionsForParent(parentId, options = {}) {
    let sql = `SELECT id, title, type, file_key, file_name, file_size, mime_type, parent_resource_id, drive_url, is_visible, views_count, created_at
       FROM unilib_resources
       WHERE parent_resource_id = $1 AND type = 'solution'`;
    if (!options.includeHidden) {
      sql += ` AND is_visible IS NOT FALSE`;
    }
    sql += ` ORDER BY created_at DESC`;
    const { rows } = await this.query(sql, [parseInt(parentId, 10)]);
    return rows.map((r) => this.normalizeEntity(r));
  }

  async findById(id) {
    const { rows } = await this.query(
      `SELECT r.*, p.title as parent_title
       FROM unilib_resources r
       LEFT JOIN unilib_resources p ON r.parent_resource_id = p.id
       WHERE r.id = $1
       LIMIT 1`,
      [id]
    );
    if (!rows[0]) return null;
    return this._enrichWithCourse(rows[0]);
  }

  /**
   * High-performance parallelized retrieval for the landing page.
   * Runs materials projection, total stats aggregate, and course counts concurrently.
   */
  async getLandingSummary(limit = 200, options = {}) {
    const visibilityClause = !options.includeHidden
      ? ` WHERE is_visible IS NOT FALSE`
      : ``;

    const [materialsRes, statsRes, countsRes] = await Promise.all([
      this.query(
        `SELECT id, course_code, type, title, file_size, mime_type, file_name,
                drive_url, is_visible, views_count, parent_resource_id, sections, created_at
         FROM unilib_resources
         ${visibilityClause}
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      ),
      this.query(
        `SELECT COUNT(*) as total_resources,
                COALESCE(SUM(views_count), 0) as total_views
         FROM unilib_resources
         ${visibilityClause}`
      ),
      this.query(
        `SELECT UPPER(course_code) as course_code, COUNT(id) as count
         FROM unilib_resources
         ${visibilityClause}
         GROUP BY UPPER(course_code)`
      ),
    ]);

    const countsMap = new Map();
    for (const r of countsRes.rows) {
      if (r.course_code) {
        countsMap.set(r.course_code.toUpperCase(), parseInt(r.count || 0, 10));
      }
    }

    const totalResources = parseInt(statsRes.rows[0]?.total_resources || 0, 10);
    const totalViews = parseInt(statsRes.rows[0]?.total_views || 0, 10);

    return {
      rawMaterials: materialsRes.rows.map((r) => {
        const entity = this.normalizeEntity(r);
        const sec = parseSections(r.sections);
        const isVisible = r.is_visible !== false && r.is_visible !== 0 && r.is_visible !== "0";
        const viewsCount = parseInt(r.views_count || 0, 10);
        return {
          ...entity,
          is_visible: isVisible,
          views_count: viewsCount,
          sections: sec,
          has_sections: sec.length > 0,
          sections_count: sec.length,
        };
      }),
      countsMap,
      stats: {
        resources: totalResources,
        views: totalViews,
      },
    };
  }

  async findAllWithCourses(options = {}) {
    let sql = `
      SELECT r.*, p.title as parent_title
      FROM unilib_resources r
      LEFT JOIN unilib_resources p ON r.parent_resource_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (!options.includeHidden) {
      sql += ` AND r.is_visible IS NOT FALSE`;
    }

    const filterCourseCode = options.course_code || options.courseCode;
    if (filterCourseCode) {
      const code = String(filterCourseCode).trim().toUpperCase();
      params.push(code);
      sql += ` AND UPPER(r.course_code) = $${params.length}`;
    }

    if (options.type) {
      params.push(options.type);
      sql += ` AND r.type = $${params.length}`;
    }

    if (options.search) {
      params.push(`%${options.search}%`);
      sql += ` AND (LOWER(r.title) LIKE LOWER($${params.length}) OR LOWER(r.file_name) LIKE LOWER($${params.length}) OR LOWER(r.course_code) LIKE LOWER($${params.length}))`;
    }

    sql += ` ORDER BY r.created_at DESC`;

    if (options.limit) {
      params.push(parseInt(options.limit, 10));
      sql += ` LIMIT $${params.length}`;
    }

    const { rows } = await this.query(sql, params);
    const courseMap = await courseRepository.getMap();

    let enriched = rows.map((r) => {
      const cleanCode = (r.course_code || "").toUpperCase();
      const course = courseMap.get(cleanCode);
      const sec = parseSections(r.sections);
      const isVisible = r.is_visible !== false && r.is_visible !== 0 && r.is_visible !== "0";
      const viewsCount = parseInt(r.views_count || 0, 10);
      return {
        ...this.normalizeEntity(r),
        is_visible: isVisible,
        views_count: viewsCount,
        course_code: cleanCode,
        course_title: course?.title || cleanCode,
        course_semester: course?.semester || 1,
        sections: sec,
        has_sections: sec.length > 0,
        sections_count: sec.length,
      };
    });

    if (options.semester) {
      const semNum = parseInt(options.semester, 10);
      enriched = enriched.filter((r) => r.course_semester === semNum);
    }

    return enriched;
  }

  async findRecent(limit = 8) {
    return this.findAllWithCourses({ limit });
  }

  async search(query, limit = 50) {
    if (!query || !query.trim()) return [];
    return this.findAllWithCourses({ search: query.trim(), limit });
  }

  async update(id, data) {
    const { title, description, course_code, type, parent_resource_id, drive_url, sections, is_visible } = data;
    const updateSections = sections !== undefined;
    const sectionsJson = updateSections
      ? (sections ? (typeof sections === "string" ? sections : JSON.stringify(sections)) : null)
      : null;

    const updateVisibility = is_visible !== undefined;
    const isVisibleVal = updateVisibility
      ? (is_visible === false || is_visible === 0 || is_visible === "0" || is_visible === "false" ? false : true)
      : null;

    const updateDriveUrl = drive_url !== undefined;

    const { rows } = await this.query(
      `UPDATE unilib_resources
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           course_code = COALESCE($3, course_code),
           type = COALESCE($4, type),
           parent_resource_id = $5,
           drive_url = CASE WHEN $6 = 1 THEN $7 ELSE drive_url END,
           sections = CASE WHEN $8 = 1 THEN $9 ELSE sections END,
           is_visible = CASE WHEN $10 = 1 THEN $11 ELSE is_visible END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING id, course_code, type, title, description,
                 file_key, file_name, file_size, mime_type, parent_resource_id, drive_url,
                 sections, is_visible, views_count, uploader_id, created_at, updated_at`,
      [
        title ? title.trim() : null,
        description !== undefined ? description : null,
        course_code ? String(course_code).trim().toUpperCase() : null,
        type || null,
        parent_resource_id ? parseInt(parent_resource_id, 10) : null,
        updateDriveUrl ? 1 : 0,
        drive_url !== undefined ? (drive_url || null) : null,
        updateSections ? 1 : 0,
        sectionsJson,
        updateVisibility ? 1 : 0,
        isVisibleVal,
        id,
      ]
    );

    return rows[0] ? this._enrichWithCourse(rows[0]) : null;
  }

  async toggleVisibility(id) {
    const existing = await this.findById(id);
    if (!existing) return null;
    const nextVal = !existing.is_visible;
    const { rows } = await this.query(
      `UPDATE unilib_resources
       SET is_visible = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, course_code, type, title, description,
                 file_key, file_name, file_size, mime_type, parent_resource_id, drive_url,
                 sections, is_visible, views_count, uploader_id, created_at, updated_at`,
      [nextVal, id]
    );
    return rows[0] ? this._enrichWithCourse(rows[0]) : null;
  }

  async incrementViewsCount(id) {
    await this.query(
      `UPDATE unilib_resources
       SET views_count = COALESCE(views_count, 0) + 1
       WHERE id = $1`,
      [id]
    );
  }

  async incrementDownloadCount(id) {
    return this.incrementViewsCount(id);
  }

  async delete(id) {
    const { rows } = await this.query(
      `DELETE FROM unilib_resources WHERE id = $1 RETURNING id, file_key, course_code`,
      [id]
    );
    return rows[0] || null;
  }

  async deleteByCourseCode(courseCode) {
    const { rows } = await this.query(
      `DELETE FROM unilib_resources WHERE UPPER(course_code) = UPPER($1) RETURNING id, file_key`,
      [String(courseCode).trim()]
    );
    return rows;
  }

  async getCount() {
    const { rows } = await this.query(`SELECT COUNT(*) as count FROM unilib_resources`);
    return parseInt(rows[0]?.count || 0, 10);
  }

  async getTotalViews() {
    const { rows } = await this.query(`SELECT SUM(views_count) as total FROM unilib_resources`);
    return parseInt(rows[0]?.total || 0, 10);
  }

  async getTotalDownloads() {
    return this.getTotalViews();
  }

  async getTotalStorageSize() {
    const { rows } = await this.query(`SELECT SUM(file_size) as total FROM unilib_resources`);
    return parseInt(rows[0]?.total || 0, 10);
  }
}

export const resourceRepository = new ResourceRepository();
export default resourceRepository;
