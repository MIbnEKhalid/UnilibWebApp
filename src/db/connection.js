import fs from "fs";
import path from "path";
import config from "../config/index.js";
import { SqliteAdapter, postgresDialect, sqliteDialect, registerGracefulShutdown, closeAllConnections } from "mbkauthe";

let sqliteDb = null;
let sqlitePool = null;
let postgresPool = null;
let postgresPool2 = null;

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
  if (sqlitePool) return { pool: sqlitePool, pool2: sqlitePool, dialect: sqliteDialect };
  const db = await getSqliteConnection(customPath);
  sqlitePool = new SqliteAdapter(db, {
    dialect: sqliteDialect,
    jsonColumns: ["sections", "semester"],
    booleanColumns: ["main", "visible"],
  });
  registerGracefulShutdown(sqlitePool);
  return { pool: sqlitePool, pool2: sqlitePool, dialect: sqliteDialect };
}

/**
 * Get or initialize PostgreSQL connection pools
 */
export async function getPostgresConnection() {
  if (postgresPool) return { pool: postgresPool, pool2: postgresPool2 || postgresPool, dialect: postgresDialect };

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
    console.log("Connected to PostgreSQL database (pool)!");
    client.release();
  } catch (err) {
    console.error("Database connection error (pool):", err.message);
  }

  const pool2Url = config.postgres2Url || config.postgresUrl;
  if (pool2Url) {
    const pool2Config = {
      connectionString: pool2Url,
      ssl: {
        rejectUnauthorized: true,
      },
      max: 20,
      idleTimeoutMillis: 60000,
      connectionTimeoutMillis: 50000,
    };
    postgresPool2 = new Pool(pool2Config);
    try {
      const client2 = await postgresPool2.connect();
      console.log("Connected to PostgreSQL database (pool2)!");
      client2.release();
    } catch (err) {
      console.error("Database connection error (pool2):", err.message);
    }
  } else {
    postgresPool2 = postgresPool;
  }

  try {
    const { initPostgresSchema } = await import("./schema/init.js");
    await initPostgresSchema(postgresPool);
    if (postgresPool2 && postgresPool2 !== postgresPool) {
      await initPostgresSchema(postgresPool2);
    }
  } catch (schemaErr) {
    console.warn("Notice during PostgreSQL schema initialization:", schemaErr.message);
  }

  registerGracefulShutdown([postgresPool, postgresPool2].filter(Boolean));

  return { pool: postgresPool, pool2: postgresPool2, dialect: postgresDialect };
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
  postgresPool2 = null;
}

export default {
  getSqliteConnection,
  getSqlitePool,
  getPostgresConnection,
  getActiveDatabase,
  closeConnections,
};
