import { postgresDialect } from "./dialects/postgres.js";

/**
 * Normalizes semester value from DB representation (PG array, PG string, SQLite JSON string) into a JS Array of strings
 */
export function normalizeSemester(val) {
  if (!val) return ["Semester 3"];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1);
      return inner.length
        ? inner.split(",").map((x) => x.trim().replace(/^"|"$/g, ""))
        : [];
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((x) => x.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [String(val)];
}

/**
 * Normalizes sections value from DB representation into a JS Array of objects
 */
export function normalizeSections(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Expands semester strings so that 'Semester4' matches 'Semester 4' and vice versa
 */
export function expandSemesterValues(semesters) {
  if (!semesters || semesters === "all") return "all";
  const arr = Array.isArray(semesters) ? semesters : [semesters];
  const expanded = new Set();
  for (const s of arr) {
    if (!s) continue;
    const str = String(s).trim();
    expanded.add(str);
    const m1 = str.match(/^Semester(\d+)$/i);
    if (m1) {
      expanded.add(`Semester ${m1[1]}`);
    }
    const m2 = str.match(/^Semester\s+(\d+)$/i);
    if (m2) {
      expanded.add(`Semester${m2[1]}`);
    }
  }
  return Array.from(expanded);
}

/**
 * Normalizes a book record to ensure uniform types across engines
 */
export function normalizeBook(book) {
  if (!book) return null;
  return {
    ...book,
    id: Number(book.id),
    name: book.name,
    category: book.category,
    description: book.description || "",
    imageURL: book.imageURL || "BookCover_Template.webp",
    link: book.link,
    semester: normalizeSemester(book.semester),
    main: Boolean(book.main),
    visible: Boolean(book.visible),
    views: Number(book.views || 0),
    sections: normalizeSections(book.sections),
    UserName: book.UserName || null,
    created_at: book.created_at,
  };
}

export class BaseRepository {
  constructor({ db, dialect = postgresDialect } = {}) {
    this.db = db;
    this.dialect = dialect;
  }

  setDb(db, dialect = this.dialect) {
    this.db = db;
    this.dialect = dialect;
  }

  quoteIdentifier(name) {
    return this.dialect.quoteIdentifier(name);
  }

  async executeRaw({ text, values = [] }) {
    return this.db.query({ text, values });
  }

  async query(text, values = []) {
    return this.db.query(text, values);
  }

  cloneWithDb(client) {
    return new this.constructor({ db: client, dialect: this.dialect });
  }

  /**
   * Runs `fn(txRepo)` inside a BEGIN..COMMIT transaction block on a dedicated client.
   */
  async withTransaction(fn) {
    if (!this.db || typeof this.db.connect !== "function") {
      return fn(this);
    }

    const client = await this.db.connect();
    const txRepo = this.cloneWithDb(client);

    try {
      await client.query("BEGIN");
      const result = await fn(txRepo);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }
}

export default BaseRepository;
