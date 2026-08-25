import {
  BaseRepository,
  normalizeBook,
  expandSemesterValues,
} from "./BaseRepository.js";

export class BookRepository extends BaseRepository {
  async findBooks({ page = 1, limit = 12, semester = "all", category = "all", search = "", isAdminView = false }) {
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 12;
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (!isAdminView) {
      conditions.push(this.dialect.name === "sqlite" ? "visible = 1" : "visible = true");
    }

    if (semester && semester !== "all" && semester.length > 0) {
      const expanded = expandSemesterValues(semester);
      if (this.dialect.name === "sqlite") {
        const placeholders = expanded.map((_, idx) => `$${params.length + idx + 1}`).join(", ");
        conditions.push(`EXISTS (SELECT 1 FROM json_each(unilibbook.semester) WHERE value IN (${placeholders}))`);
        params.push(...expanded);
      } else {
        conditions.push(`semester::text[] && $${params.length + 1}::text[]`);
        params.push(expanded);
      }
    }

    if (category && category.toLowerCase() !== "all") {
      if (this.dialect.name === "sqlite") {
        conditions.push(`LOWER(category) = LOWER($${params.length + 1})`);
      } else {
        conditions.push(`category::text ILIKE $${params.length + 1}`);
      }
      params.push(category);
    }

    if (search && search.trim()) {
      conditions.push(this.dialect.ilike("name", `$${params.length + 1}`));
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length ? " WHERE " + conditions.join(" AND ") : "";
    const countQuery = `SELECT COUNT(*) AS total FROM unilibbook${whereClause}`;
    const countParams = [...params];

    const selectQuery = `SELECT id, name, category, description, "imageURL", link, semester, main, visible, views FROM unilibbook${whereClause} ORDER BY main DESC, name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const [result, countResult] = await Promise.all([
      this.query(selectQuery, params),
      this.query(countQuery, countParams),
    ]);

    const total = parseInt(countResult.rows?.[0]?.total || 0, 10);

    return {
      books: (result.rows || []).map(normalizeBook),
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    };
  }

  async findById(id, { mustBeVisible = false } = {}) {
    let query =
      'SELECT id, "UserName", name, category, description, "imageURL", link, semester, main, visible, views, sections, created_at FROM "unilibbook" WHERE id = $1';
    if (mustBeVisible) {
      query += this.dialect.name === "sqlite" ? " AND visible = 1" : " AND visible = true";
    }
    const result = await this.query(query, [id]);
    return normalizeBook(result.rows?.[0]);
  }

  async create({ name, category, description, imageURL, link, semester, main, visible, userName }) {
    const query = `
      INSERT INTO "unilibbook" (name, category, description, "imageURL", link, semester, main, visible, "UserName")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, category, description, "imageURL", link, semester, main, visible, "UserName", created_at;
    `;
    const values = [
      name,
      category,
      description || null,
      imageURL || "BookCover_Template.webp",
      link,
      this.dialect.serializeSemester(semester),
      Boolean(main && main !== "false"),
      visible !== false && visible !== "false" && visible !== 0 && visible !== "0",
      userName || null,
    ];

    const result = await this.query(query, values);
    return normalizeBook(result.rows?.[0]);
  }

  async update(id, { name, category, description, imageURL, link, semester, main, visible }) {
    const query = `
      UPDATE "unilibbook"
      SET name = $1, category = $2, description = $3, "imageURL" = $4, link = $5, semester = $6, main = $7, visible = $8
      WHERE id = $9;
    `;
    const values = [
      name,
      category,
      description || null,
      imageURL || "BookCover_Template.webp",
      link,
      this.dialect.serializeSemester(semester),
      Boolean(main && main !== "false"),
      visible !== false && visible !== "false" && visible !== 0 && visible !== "0",
      id,
    ];

    const result = await this.query(query, values);
    return result.rowCount > 0;
  }

  async delete(id) {
    const result = await this.query('DELETE FROM "unilibbook" WHERE id = $1', [id]);
    return result.rowCount > 0;
  }

  async bulkUpdateVisibility(bookIds, visible) {
    if (!bookIds || bookIds.length === 0) return 0;
    const result = await this.query('UPDATE "unilibbook" SET visible = $1 WHERE id = ANY($2)', [
      Boolean(visible),
      bookIds,
    ]);
    return result.rowCount || 0;
  }

  async getAllForExport() {
    const query =
      'SELECT id, name, category, description, "imageURL", link, semester, main, visible, views, sections FROM unilibbook ORDER BY main DESC, name ASC';
    const result = await this.query(query);
    return (result.rows || []).map(normalizeBook);
  }

  async incrementViews(id) {
    const visibilityCheck = this.dialect.name === "sqlite" ? " AND visible = 1" : " AND visible = true";
    await this.query(`UPDATE unilibbook SET views = views + 1 WHERE id = $1${visibilityCheck}`, [id]);
  }

  async exists(id, { mustBeVisible = false } = {}) {
    let query = "SELECT id FROM unilibbook WHERE id = $1";
    if (mustBeVisible) {
      query += this.dialect.name === "sqlite" ? " AND visible = 1" : " AND visible = true";
    }
    const result = await this.query(query, [id]);
    return (result.rows || []).length > 0;
  }
}

export default BookRepository;
