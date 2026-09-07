import dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

// Read version from package.json for cache busting
const packageJson = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url))
);

export const config = {
  appVersion: packageJson.version,
  port: process.env.PORT || 3333,
  nodeEnv: process.env.NODE_ENV || "development",
  defaultLimit: process.env.DEFAULT_LIMIT || "12",
  defaultSemester: process.env.DEFAULT_SEMESTER || "Semester1",
  tasjeelSyncCron: process.env.TASJEEL_SYNC_CRON || "0 */6 * * *",
  get redisEnabled() {
    return !["false", "0"].includes((process.env.REDIS_ENABLED || "").toLowerCase());
  },
  redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  postgresUrl: process.env.NEON_POSTGRES,
  get dbType() {
    return (process.env.DB_TYPE || (process.env.NEON_POSTGRES ? "postgres" : "sqlite")).toLowerCase();
  },
  get sqlitePath() {
    return process.env.SQLITE_PATH || "./data/unilib.sqlite";
  },
};

export default config;
