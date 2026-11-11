import path from "node:path";
import { fileURLToPath } from "node:url";
import { applySchema } from "mbkauthe";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Initializes PostgreSQL schema for the application.
 * @param {import("pg").Pool} pool
 */
export async function initPostgresSchema(pool) {
  if (!pool) return;
  const schemaPath = path.join(__dirname, "postgres.sql");
  await applySchema(pool, schemaPath, { name: "template-postgres" });
  try {
    await pool.query("ALTER TABLE unilib_resources ADD COLUMN IF NOT EXISTS drive_url TEXT");
    await pool.query("ALTER TABLE unilib_resources ADD COLUMN IF NOT EXISTS sections JSONB");
    await pool.query("ALTER TABLE unilib_resources ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT TRUE");
    await pool.query("ALTER TABLE unilib_resources ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_sections ON unilib_resources USING GIN (sections)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_visible ON unilib_resources(is_visible)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_created ON unilib_resources(course_code, created_at DESC)");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_upper_course ON unilib_resources(UPPER(course_code))");
    await pool.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_upper_course_type ON unilib_resources(UPPER(course_code), type)");
  } catch {}
  console.log("[MBKTemplate] PostgreSQL schema initialized successfully.");
}

/**
 * Initializes SQLite schema for the application.
 * @param {object} db - Sqlite adapter or instance
 */
export async function initSqliteSchema(db) {
  if (!db) return;
  const schemaPath = path.join(__dirname, "sqlite.sql");
  await applySchema(db, schemaPath, { name: "template-sqlite" });
  try {
    await db.query("ALTER TABLE unilib_resources ADD COLUMN drive_url TEXT");
  } catch {}
  try {
    await db.query("ALTER TABLE unilib_resources ADD COLUMN sections TEXT");
  } catch {}
  try {
    await db.query("ALTER TABLE unilib_resources ADD COLUMN is_visible INTEGER DEFAULT 1");
  } catch {}
  try {
    await db.query("ALTER TABLE unilib_resources ADD COLUMN views_count INTEGER DEFAULT 0");
  } catch {}
  try {
    await db.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_visible ON unilib_resources(is_visible)");
    await db.query("CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_created ON unilib_resources(course_code, created_at DESC)");
  } catch {}
  console.log("[MBKTemplate] SQLite schema initialized successfully.");
}

export default { initPostgresSchema, initSqliteSchema };
