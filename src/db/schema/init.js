import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes SQLite schema tables and indexes.
 * @param {import("node:sqlite").DatabaseSync} db
 */
export function initSqliteSchema(db) {
  try {
    // Auto-migration for existing tables before executing indexes
    try {
      const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='subjects';").get();
      if (tableCheck) {
        const columns = db.prepare("PRAGMA table_info(subjects);").all();
        const hasSemester = columns.some((c) => c.name === "semester");
        if (!hasSemester) {
          db.exec("ALTER TABLE subjects ADD COLUMN semester TEXT NOT NULL DEFAULT 'Semester 1';");
          console.log("Migrated SQLite schema: added semester column to subjects table.");
        }
      }
    } catch (migErr) {
      console.warn("Notice checking SQLite subjects semester column:", migErr.message);
    }

    const schemaSql = fs.readFileSync(path.join(__dirname, "sqlite.sql"), "utf-8");
    db.exec(schemaSql);
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
    // Auto-migration: Ensure subjects table has semester column before index creation
    try {
      await pool.query(
        `DO $$ BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN 
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'semester') THEN 
              ALTER TABLE subjects ADD COLUMN semester TEXT NOT NULL DEFAULT 'Semester 1'; 
            END IF; 
          END IF; 
        END $$;`
      );
    } catch (migErr) {
      console.warn("Notice checking Postgres subjects semester column:", migErr.message);
    }

    const schemaSql = fs.readFileSync(path.join(__dirname, "postgres.sql"), "utf-8");
    await pool.query(schemaSql);
    console.log("PostgreSQL schema initialized successfully.");
  } catch (error) {
    console.warn("Notice during PostgreSQL schema initialization:", error.message);
  }
}

export default { initSqliteSchema, initPostgresSchema };
