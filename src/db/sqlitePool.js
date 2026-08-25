import { translatePgToSqlite } from "./sqlSqliteTranslate.js";

class Mutex {
  constructor() {
    this._tail = Promise.resolve();
  }

  acquire() {
    const prev = this._tail;
    let release;
    this._tail = new Promise((resolve) => {
      let released = false;
      release = () => {
        if (released) return;
        released = true;
        resolve();
      };
    });
    return prev.then(() => release);
  }
}

class SqliteClient {
  constructor(db, releaseLock) {
    this.db = db;
    this._releaseLock = releaseLock;
  }

  async query(queryOrText, maybeValues) {
    const { text, values } = normalizeQueryArgs(queryOrText, maybeValues);
    return runQuery(this.db, text, values);
  }

  release() {
    this._releaseLock();
  }
}

function normalizeQueryArgs(queryOrText, maybeValues) {
  if (typeof queryOrText === "string") {
    return { text: queryOrText, values: maybeValues || [] };
  }
  return {
    text: queryOrText?.text ?? "",
    values: queryOrText?.values ?? (maybeValues || []),
  };
}

function coerceBindValue(value) {
  if (value === undefined) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object" && value !== null && !Buffer.isBuffer(value)) {
    return JSON.stringify(value);
  }
  return value;
}

const JSON_COLUMNS = new Set(["sections", "semester"]);
const BOOLEAN_COLUMNS = new Set(["main", "visible"]);

function normalizeRow(row) {
  if (!row) return row;
  const copy = { ...row };
  for (const key of Object.keys(copy)) {
    const value = copy[key];
    if (JSON_COLUMNS.has(key) && typeof value === "string") {
      try {
        copy[key] = JSON.parse(value);
      } catch {
        // Keep raw value if not valid JSON
      }
    } else if (BOOLEAN_COLUMNS.has(key)) {
      copy[key] = Boolean(value);
    }
  }
  return copy;
}

function runQuery(db, rawText, rawValues) {
  const trimmed = rawText.trim();
  const upper = trimmed.toUpperCase();

  if (upper === "BEGIN" || upper === "COMMIT" || upper === "ROLLBACK") {
    db.exec(upper);
    return { rows: [], rowCount: 0, command: upper };
  }

  const { text, values } = translatePgToSqlite(trimmed, rawValues);
  const stmt = db.prepare(text);
  const bindValues = values.map(coerceBindValue);

  // If query returns rows (SELECT or queries with RETURNING)
  const isSelectOrReturning =
    /^\s*SELECT\b/i.test(text) || /\bRETURNING\b/i.test(text);

  if (isSelectOrReturning) {
    let rows = [];
    try {
      rows = stmt.all(...bindValues).map(normalizeRow);
    } catch {
      // If statement doesn't support .all()
      const info = stmt.run(...bindValues);
      return { rows: [], rowCount: info.changes, command: "EXECUTE" };
    }
    return { rows, rowCount: rows.length, command: "SELECT" };
  }

  const info = stmt.run(...bindValues);
  return {
    rows: [],
    rowCount: info.changes,
    command: "EXECUTE",
    lastInsertRowid: info.lastInsertRowid,
  };
}

export class SqlitePool {
  constructor(db) {
    this.db = db;
    try {
      this.db.exec("PRAGMA journal_mode = WAL;");
      this.db.exec("PRAGMA foreign_keys = ON;");
    } catch {}
    this.mutex = new Mutex();
  }

  async query(queryOrText, maybeValues) {
    const { text, values } = normalizeQueryArgs(queryOrText, maybeValues);
    const release = await this.mutex.acquire();
    try {
      return runQuery(this.db, text, values);
    } finally {
      release();
    }
  }

  async connect() {
    const release = await this.mutex.acquire();
    return new SqliteClient(this.db, release);
  }

  execScript(sql) {
    this.db.exec(sql);
  }

  async end() {
    try {
      this.db.close();
    } catch {}
  }
}

export default SqlitePool;
