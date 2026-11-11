import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { pool } from "../src/db/connection.js";
import { initPostgresSchema, initSqliteSchema } from "../src/db/schema/init.js";
import { SqliteAdapter } from "mbkauthe";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

async function main() {
  const args = process.argv.slice(2);
  let dbType = null;
  let customSqlitePath = null;

  for (const arg of args) {
    if (arg.startsWith("--type=")) {
      dbType = arg.split("=")[1].toLowerCase();
    } else if (arg.startsWith("--path=")) {
      customSqlitePath = arg.split("=")[1];
    } else if (!arg.startsWith("--") && !customSqlitePath) {
      customSqlitePath = arg;
    }
  }

  if (!dbType) {
    dbType = (process.env.DB_TYPE || "sqlite").toLowerCase();
  }

  if (dbType === "sqlite") {
    const dbPath = customSqlitePath || process.env.SQLITE_PATH || path.join(ROOT_DIR, "data", "app.db");
    console.log(`\n[SQLite] Initializing schema at: ${dbPath}...`);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.dirname(dbPath), { recursive: true }).catch(() => {});
    const adapter = new SqliteAdapter(dbPath);
    try {
      await initSqliteSchema(adapter);
    } finally {
      adapter.close();
    }
  } else if (dbType === "postgres" || dbType === "postgresql") {
    console.log(`\n[PostgreSQL] Initializing schema on database...`);
    if (!process.env.NEON_POSTGRES && !process.env.DATABASE_URL) {
      console.warn("⚠️ PostgreSQL connection string (NEON_POSTGRES / DATABASE_URL) not configured; skipping.");
    } else {
      await initPostgresSchema(pool);
    }
  } else {
    console.error("Error: Please specify --type=sqlite or --type=postgres");
    process.exit(1);
  }

  console.log("\nDatabase initialization complete!\n");
  process.exit(0);
}

main().catch((err) => {
  console.error("Database initialization failed:", err);
  process.exit(1);
});
