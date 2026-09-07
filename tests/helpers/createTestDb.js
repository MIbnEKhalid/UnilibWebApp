import { initDatabase, closeDatabase } from "../../src/db/index.js";
import { getSqliteConnection } from "../../src/db/connection.js";
import { initSqliteSchema } from "../../src/db/schema/init.js";

/**
 * Creates an isolated in-memory SQLite database instance with the Unilib schema applied.
 * @returns {Promise<Object>} Repositories object { bookRepository, sectionRepository, tasjeelRepository }
 */
export async function createTestDb() {
  const sqliteDb = await getSqliteConnection(":memory:");
  initSqliteSchema(sqliteDb);

  const repos = await initDatabase({
    dbType: "sqlite",
    sqlitePath: ":memory:",
  });

  return repos;
}

/**
 * Close database connections gracefully.
 */
export async function cleanupTestDb() {
  try {
    await closeDatabase();
  } catch {
    // ignore
  }
}
