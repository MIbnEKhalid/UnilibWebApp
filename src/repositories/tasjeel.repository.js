import { BaseRepository } from "mbkauthe";

export class TasjeelRepository extends BaseRepository {
  async getAllSubjects() {
    const result = await this.query("SELECT id, course_id, subject, href, semester FROM unilib_subjects ORDER BY subject ASC");
    return result.rows || [];
  }

  async getSubjectsBySemester(semester) {
    const result = await this.query(
      "SELECT id, course_id, subject, href, semester FROM unilib_subjects WHERE semester = $1 ORDER BY subject ASC",
      [semester]
    );
    return result.rows || [];
  }

  async getMaterialCounts() {
    const countsQuery = `
      SELECT s.course_id AS course_id, COUNT(m.id) AS count
      FROM unilib_subjects s
      LEFT JOIN unilib_materials m ON m.subject_id = s.id
      GROUP BY s.course_id
    `;
    const result = await this.query(countsQuery);
    const counts = {};
    (result.rows || []).forEach((r) => {
      counts[r.course_id] = parseInt(r.count, 10);
    });
    return counts;
  }

  async getMaterialsByCourseId(courseId) {
    const query = `
      SELECT m.name, m.href
      FROM unilib_materials m
      JOIN unilib_subjects s ON m.subject_id = s.id
      WHERE s.course_id = $1 OR CAST(s.id AS TEXT) = $1
      ORDER BY m.name ASC
    `;
    const result = await this.query(query, [String(courseId)]);
    return result.rows || [];
  }

  async upsertSubject(courseId, subject, href, semester = "Semester 1") {
    const query = `
      INSERT INTO unilib_subjects (course_id, subject, href, semester, last_synced)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (course_id) DO UPDATE SET 
        subject = EXCLUDED.subject, 
        href = EXCLUDED.href, 
        last_synced = EXCLUDED.last_synced
      RETURNING id;
    `;
    const result = await this.query(query, [courseId, subject, href, semester, new Date()]);
    return result.rows?.[0]?.id;
  }

  async updateSubjectSemester(courseId, semester) {
    const query = `
      UPDATE unilib_subjects
      SET semester = $1
      WHERE course_id = $2 OR CAST(id AS TEXT) = $2
      RETURNING id, course_id, subject, href, semester;
    `;
    const result = await this.query(query, [semester, String(courseId)]);
    return result.rows?.[0] || null;
  }

  async upsertMaterials(subjectId, materials) {
    if (!materials || materials.length === 0) {
      await this.query("DELETE FROM unilib_materials WHERE subject_id = $1", [subjectId]);
      return;
    }
    return this.withTransaction(async (tx) => {
      await tx.query("DELETE FROM unilib_materials WHERE subject_id = $1", [subjectId]);
      const now = new Date();
      const valuePlaceholders = [];
      const params = [];
      materials.forEach((m, idx) => {
        const offset = idx * 4;
        valuePlaceholders.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
        params.push(subjectId, m.name, m.href, now);
      });
      await tx.query(
        `INSERT INTO unilib_materials (subject_id, name, href, last_synced) VALUES ${valuePlaceholders.join(", ")}`,
        params
      );
    });
  }

  async getSubjectByIdOrCourseId(idOrCourseId) {
    const query = "SELECT id, course_id, subject, href, semester FROM unilib_subjects WHERE course_id = $1 OR CAST(id AS TEXT) = $1 LIMIT 1";
    const result = await this.query(query, [String(idOrCourseId)]);
    return result.rows?.[0] || null;
  }

  async deleteSubject(courseIdOrId) {
    const s = await this.getSubjectByIdOrCourseId(courseIdOrId);
    if (!s) return false;

    return this.withTransaction(async (tx) => {
      await tx.query("DELETE FROM unilib_materials WHERE subject_id = $1", [s.id]);
      const res = await tx.query("DELETE FROM unilib_subjects WHERE id = $1", [s.id]);
      return (res.rowCount || 0) > 0;
    });
  }

  async addMaterial(subjectId, name, href) {
    const query = `
      INSERT INTO unilib_materials (subject_id, name, href, last_synced)
      VALUES ($1, $2, $3, $4)
      RETURNING id, subject_id, name, href, last_synced;
    `;
    const result = await this.query(query, [subjectId, name, href || "", new Date()]);
    return result.rows?.[0] || null;
  }

  async deleteMaterial(materialId) {
    const result = await this.query("DELETE FROM unilib_materials WHERE id = $1 RETURNING id", [materialId]);
    return (result.rowCount || 0) > 0;
  }

  async getLatestSession() {
    try {
      const primaryQuery = "SELECT session FROM unilib_custlogin WHERE id = 1";
      let result = await this.query(primaryQuery);

      if (!result.rows || result.rows.length === 0) {
        result = await this.query("SELECT session FROM unilib_custlogin ORDER BY id DESC LIMIT 1");
      }

      return result.rows?.[0]?.session || "";
    } catch (error) {
      console.error("Error fetching session from DB:", error.message);
      return "";
    }
  }
}

export default TasjeelRepository;
