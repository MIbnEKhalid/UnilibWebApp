import fs from "fs";
import path from "path";
import config from "../config/index.js";
import {
  dblogin,
  defaultAdapter,
  SqliteAdapter,
  postgresDialect,
  sqliteDialect,
  registerGracefulShutdown,
  closeAllConnections,
} from "mbkauthe";

let sqliteDb = null;
let sqlitePool = null;

// Utilize same connection pool as mbkauthe (dblogin)
export const pool = dblogin;

/**
 * Get or initialize SQLite DatabaseSync connection
 */
export async function getSqliteConnection(customPath = null) {
  if (sqliteDb) return sqliteDb;

  const Database = (await import("better-sqlite3")).default;
  const dbPath = customPath || config.sqlitePath || "./data/unilib.sqlite";

  if (dbPath !== ":memory:") {
    const resolvedPath = path.resolve(dbPath);
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    sqliteDb = new Database(resolvedPath);
    sqliteDb.pragma("journal_mode = WAL");
    sqliteDb.pragma("foreign_keys = ON");
    console.log(`Connected to SQLite database at: ${resolvedPath}`);
  } else {
    sqliteDb = new Database(":memory:");
    sqliteDb.pragma("foreign_keys = ON");
    console.log("Connected to in-memory SQLite database!");
  }

  return sqliteDb;
}

/**
 * Get or initialize SQLite Pool
 */
export async function getSqlitePool(customPath = null) {
  if (sqlitePool) return { pool: sqlitePool, dialect: sqliteDialect };
  const db = await getSqliteConnection(customPath);
  sqlitePool = new SqliteAdapter(db, {
    dialect: sqliteDialect,
    jsonColumns: ["sections", "semester"],
    booleanColumns: ["main", "visible"],
  });
  registerGracefulShutdown(sqlitePool);
  return { pool: sqlitePool, dialect: sqliteDialect };
}

/**
 * Get or initialize PostgreSQL connection pool (utilizing shared dblogin from mbkauthe)
 */
export async function getPostgresConnection() {
  return { pool: dblogin, dialect: postgresDialect };
}

/**
 * Get the active database connection pool and dialect based on dbType
 */
export async function getActiveDatabase(options = {}) {
  const dbType = (options.dbType || config.dbType || "sqlite").toLowerCase();

  if (dbType === "sqlite") {
    return await getSqlitePool(options.sqlitePath);
  } else if (dbType === "postgres" || dbType === "postgresql") {
    return await getPostgresConnection();
  } else {
    throw new Error(`Unsupported database type: ${dbType}`);
  }
}

export async function closeConnections() {
  await closeAllConnections();
  sqlitePool = null;
  sqliteDb = null;
}

export default {
  getSqliteConnection,
  getSqlitePool,
  getPostgresConnection,
  getActiveDatabase,
  closeConnections,
  pool,
  defaultAdapter,
};
