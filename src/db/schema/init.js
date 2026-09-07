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
    // Auto-migration for existing tables before executing indexes
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('unilib_subjects', 'subjects');").get();
      if (tableCheck) {
        const tableName = tableCheck.name;
        const columns = db.prepare(`PRAGMA table_info(${tableName});`).all();
        const hasSemester = columns.some((c) => c.name === "semester");
        if (!hasSemester) {
          db.exec(`ALTER TABLE ${tableName} ADD COLUMN semester TEXT NOT NULL DEFAULT 'Semester 1';`);
          console.log(`Migrated SQLite schema: added semester column to ${tableName} table.`);
        }
      }
    } catch (migErr) {
      console.warn("Notice checking SQLite subjects semester column:", migErr.message);
    }

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
    // Auto-migration: Ensure unilib_subjects table has semester column before index creation
    try {
      await pool.query(
        `DO $$ BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name IN ('unilib_subjects', 'subjects')) THEN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name IN ('unilib_subjects', 'subjects') AND column_name = 'semester') THEN 
              ALTER TABLE unilib_subjects ADD COLUMN semester TEXT NOT NULL DEFAULT 'Semester 1'; 
            END IF; 
          END IF; 
        END $$;`
      );
    } catch (migErr) {
      console.warn("Notice checking Postgres subjects semester column:", migErr.message);
    }

    const schemaPath = path.join(__dirname, "postgres.sql");
    await applySchema(pool, schemaPath, { name: "unilib-postgres" });
    console.log("PostgreSQL schema initialized successfully.");
  } catch (error) {
    console.warn("Notice during PostgreSQL schema initialization:", error.message);
  }
}

export default { initSqliteSchema, initPostgresSchema };
