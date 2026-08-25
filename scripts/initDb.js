import config from "../src/config/index.js";
import {
  getSqliteConnection,
  getPostgresConnection,
  closeConnections,
} from "../src/db/connection.js";
import {
  initSqliteSchema,
  initPostgresSchema,
} from "../src/db/schema/init.js";

async function main() {
  const args = process.argv.slice(2);
  let dbTypeArg = null;
  let customSqlitePath = null;

  for (const arg of args) {
    if (arg.startsWith("--type=")) {
      dbTypeArg = arg.split("=")[1].toLowerCase();
    } else if (arg.startsWith("--path=")) {
      customSqlitePath = arg.split("=")[1];
    } else if (arg === "--all") {
      dbTypeArg = "all";
    }
  }

  const targetType = dbTypeArg || config.dbType || "sqlite";

  console.log(`\n--- Starting Database Initialization (Target: ${targetType}) ---`);

  if (targetType === "sqlite" || targetType === "all") {
    console.log(`\n[SQLite] Initializing schema at: ${customSqlitePath || config.sqlitePath}...`);
    try {
      const sqliteDb = await getSqliteConnection(customSqlitePath || config.sqlitePath);
      initSqliteSchema(sqliteDb);
      console.log("✓ SQLite database initialized successfully!");
    } catch (err) {
      console.error("✗ Failed to initialize SQLite schema:", err.message);
      if (targetType !== "all") process.exit(1);
    }
  }

  if (targetType === "postgres" || targetType === "postgresql" || targetType === "all") {
    console.log(`\n[PostgreSQL] Initializing schema on database...`);
    if (!config.postgresUrl) {
      console.warn("⚠ NEON_POSTGRES is not configured in environment; skipping PostgreSQL init.");
    } else {
      try {
        const { pool, pool2 } = await getPostgresConnection();
        await initPostgresSchema(pool);
        if (pool2 && pool2 !== pool) {
          await initPostgresSchema(pool2);
        }
        console.log("✓ PostgreSQL database initialized successfully!");
      } catch (err) {
        console.error("✗ Failed to initialize PostgreSQL schema:", err.message);
        if (targetType !== "all") process.exit(1);
      }
    }
  }

  await closeConnections();
  console.log("\nDatabase initialization complete!\n");
}

main().catch((err) => {
  console.error("Fatal error during database init:", err);
  process.exit(1);
});
