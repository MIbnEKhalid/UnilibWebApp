import config from "../src/config/index.js";
import { getSqliteConnection, getPostgresConnection, closeConnections } from "../src/db/connection.js";
import { initSqliteSchema, initPostgresSchema } from "../src/db/schema/init.js";

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

  // Default to the engine configured in the environment when no explicit type is given
  if (!dbType) dbType = config.dbType;

  if (dbType === "sqlite") {
    const dbPath = customSqlitePath || config.sqlitePath || "./data/unilib.sqlite";
    console.log(`\n[SQLite] Initializing schema at: ${dbPath}...`);
    const sqliteDb = await getSqliteConnection(dbPath);
    try {
      await initSqliteSchema(sqliteDb);
      console.log("✓ SQLite database initialized successfully!");
    } finally {
      await closeConnections();
    }
  } else if (dbType === "postgres" || dbType === "postgresql") {
    console.log(`\n[PostgreSQL] Initializing schema on database...`);
    if (!config.postgresUrl) {
      console.warn("⚠ PostgreSQL URL not configured; skipping.");
    } else {
      const { pool } = await getPostgresConnection();
      try {
        await initPostgresSchema(pool);
        console.log("✓ PostgreSQL database initialized successfully!");
      } finally {
        await closeConnections();
      }
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
