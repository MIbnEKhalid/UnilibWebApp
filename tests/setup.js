/**
 * Global test setup for UnilibWebApp — runs before every test file.
 */

// Force in-memory SQLite mode
process.env.NODE_ENV = "test";
process.env.DB_TYPE = "sqlite";
process.env.SQLITE_PATH = ":memory:";

// Disable Redis in tests
process.env.REDIS_ENABLED = "false";

// Test secrets
process.env.MAIN_SECRET_TOKEN = "test-secret-token-unilib";
process.env.SESSION_SECRET = "test-session-secret-unilib";
