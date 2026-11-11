/**
 * Global test setup for Unilib — runs before test suites.
 */
import { vi } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { SqliteAdapter } from "mbkauthe";
import { initSqliteSchema } from "../src/db/schema/init.js";

const testDbPath = path.resolve("./data/unilib.test.db");
const testStoragePath = path.resolve("./data/storage_test");

process.env.NODE_ENV = "test";
process.env.SESSION_SECRET = "test-session-secret-unilib";
process.env.MAIN_SECRET_TOKEN = "12345";
process.env.DB_TYPE = "sqlite";
process.env.SQLITE_PATH = testDbPath;
process.env.REDIS_CACHE_ENABLED = "false"; // Test using resilient in-memory cache
process.env.DEFAULT_BUCKET = "Local_Disk";
process.env.BucketConnection = JSON.stringify({
  Local_Disk: { type: "local", basePath: testStoragePath },
});

const { storageManager } = await import("mbkbucket");
storageManager.reloadFromEnv();
storageManager.setDefaultConnectionName("Local_Disk");

// Clean and initialize test database
if (fs.existsSync(testDbPath)) {
  try { fs.unlinkSync(testDbPath); } catch {}
}
fs.mkdirSync(path.dirname(testDbPath), { recursive: true });

const adapter = new SqliteAdapter(testDbPath);
await initSqliteSchema(adapter);
adapter.close();

// Mock sessPerm for deterministic testing
vi.mock("mbkauthe", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    sessPerm: (permission) => (req, res, next) => {
      // If client supplied admin test role, allow
      if (req.headers["x-test-auth-role"] === "admin") {
        req.session = req.session || {};
        req.session.user = {
          user_id: 1,
          username: "admin_test",
          role: "admin",
          allowed_apps: ["unilib"],
        };
        return next();
      }

      // If user is logged in as admin in session
      if (req.session?.user?.role === "admin") {
        return next();
      }

      // Deny unauthorized access
      if (req.path.startsWith("/api")) {
        return res.status(403).json({ success: false, error: "Access denied: Unauthorized operation." });
      }
      return res.redirect(302, "/login");
    },
    validateSessionAndRole: (role = "Any") => (req, res, next) => {
      if (!req.session?.user && req.headers["x-test-auth-role"] !== "admin") {
        return res.status(401).json({ message: "Unauthorized" });
      }
      next();
    },
  };
});
