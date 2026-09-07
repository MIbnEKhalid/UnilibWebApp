import fs from "fs";
import path from "path";
import config from "../config/index.js";
import { SqliteAdapter, postgresDialect, sqliteDialect, registerGracefulShutdown, closeAllConnections } from "mbkauthe";

let sqliteDb = null;
let sqlitePool = null;
let postgresPool = null;

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

  try {
    const { initSqliteSchema } = await import("./schema/init.js");
    await initSqliteSchema(sqliteDb);
  } catch (schemaErr) {
    console.warn("Notice during SQLite schema initialization:", schemaErr.message);
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
 * Get or initialize PostgreSQL connection pool
 */
export async function getPostgresConnection() {
  if (postgresPool) return { pool: postgresPool, dialect: postgresDialect };

  const pkg = await import("pg");
  const { Pool } = pkg.default || pkg;

  const poolConfig = {
    connectionString: config.postgresUrl,
    ssl: {
      rejectUnauthorized: true,
    },
  };

  postgresPool = new Pool(poolConfig);

  try {
    const client = await postgresPool.connect();
    console.log("Connected to PostgreSQL database!");
    client.release();
  } catch (err) {
    console.error("Database connection error:", err.message);
  }

  try {
    const { initPostgresSchema } = await import("./schema/init.js");
    await initPostgresSchema(postgresPool);
  } catch (schemaErr) {
    console.warn("Notice during PostgreSQL schema initialization:", schemaErr.message);
  }

  registerGracefulShutdown([postgresPool].filter(Boolean));

  return { pool: postgresPool, dialect: postgresDialect };
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
  postgresPool = null;
}

export default {
  getSqliteConnection,
  getSqlitePool,
  getPostgresConnection,
  getActiveDatabase,
  closeConnections,
};
