import config from "../config/index.js";
import { getActiveDatabase, closeConnections } from "./connection.js";

import { BookRepository } from "../repositories/BookRepository.js";
import { SectionRepository } from "../repositories/SectionRepository.js";
import { TasjeelRepository } from "../repositories/TasjeelRepository.js";

export { PostgresAdapter, postgresDialect, SqliteAdapter, sqliteDialect, BaseRepository } from "mbkauthe";
export { getActiveDatabase, closeConnections };

let activeDbType = null;
let bookRepoInstance = null;
let sectionRepoInstance = null;
let tasjeelRepoInstance = null;

let isInitialized = false;

/**
 * Initializes database connection and repository singletons based on configured or provided dbType
 */
export async function initDatabase(options = {}) {
  const dbType = (options.dbType || config.dbType || "sqlite").toLowerCase();
  activeDbType = dbType;

  const { pool, dialect } = await getActiveDatabase({
    dbType,
    sqlitePath: options.sqlitePath || config.sqlitePath,
  });

  if (!bookRepoInstance) {
    bookRepoInstance = new BookRepository({ db: pool, dialect });
    sectionRepoInstance = new SectionRepository({ db: pool, dialect });
    tasjeelRepoInstance = new TasjeelRepository({ db: pool, dialect });
  } else {
    bookRepoInstance.setDb(pool, dialect);
    sectionRepoInstance.setDb(pool, dialect);
    tasjeelRepoInstance.setDb(pool, dialect);
  }

  isInitialized = true;
  return {
    dbType: activeDbType,
    bookRepository: bookRepoInstance,
    sectionRepository: sectionRepoInstance,
    tasjeelRepository: tasjeelRepoInstance,
  };
}

/**
 * Ensures database is initialized (lazy init fallback)
 */
async function ensureInitialized() {
  if (!isInitialized) {
    await initDatabase();
  }
}

// Proxied repositories that lazy-initialize if not explicitly initialized before first call
export const bookRepository = new Proxy({}, {
  get(target, prop) {
    if (!bookRepoInstance) {
      initDatabase().catch((e) => console.error("Database auto-init failed:", e));
    }
    return async (...args) => {
      await ensureInitialized();
      return bookRepoInstance[prop](...args);
    };
  },
});

export const sectionRepository = new Proxy({}, {
  get(target, prop) {
    if (!sectionRepoInstance) {
      initDatabase().catch((e) => console.error("Database auto-init failed:", e));
    }
    return async (...args) => {
      await ensureInitialized();
      return sectionRepoInstance[prop](...args);
    };
  },
});

export const tasjeelRepository = new Proxy({}, {
  get(target, prop) {
    if (!tasjeelRepoInstance) {
      initDatabase().catch((e) => console.error("Database auto-init failed:", e));
    }
    return async (...args) => {
      await ensureInitialized();
      return tasjeelRepoInstance[prop](...args);
    };
  },
});

export async function closeDatabase() {
  await closeConnections();
  isInitialized = false;
}

export function getActiveDbType() {
  return activeDbType || config.dbType;
}

export default {
  initDatabase,
  closeDatabase,
  getActiveDbType,
  bookRepository,
  sectionRepository,
  tasjeelRepository,
  BookRepository,
  SectionRepository,
  TasjeelRepository,
};
