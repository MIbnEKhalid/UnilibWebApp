import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { applySchema } from "mbkauthe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes SQLite schema tables and indexes.
 * @param {object} db
 */
export async function initSqliteSchema(db) {
  try {
    const schemaPath = path.join(__dirname, "sqlite.sql");
    await applySchema(db, schemaPath, { name: "unilib-sqlite" });
    console.log("SQLite schema initialized successfully.");
  } catch (error) {
    console.error("Error initializing SQLite schema:", error);
    throw error;
  }
}

/**
 * Initializes PostgreSQL schema tables and indexes if needed.
 * @param {import("pg").Pool} pool
 */
export async function initPostgresSchema(pool) {
  if (!pool) return;
  try {
    const schemaPath = path.join(__dirname, "postgres.sql");
    await applySchema(pool, schemaPath, { name: "unilib-postgres" });
    console.log("PostgreSQL schema initialized successfully.");
  } catch (error) {
    console.warn("Notice during PostgreSQL schema initialization:", error.message);
  }
}

export default { initSqliteSchema, initPostgresSchema };
