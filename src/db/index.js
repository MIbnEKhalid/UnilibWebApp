import { PostgresAdapter, SqliteAdapter, postgresDialect, BaseRepository, defaultAdapter as mbkDefaultAdapter } from "mbkauthe";
import { config } from "../config/env.js";
import { pool, testDbConnection } from "./connection.js";

// Dynamically resolve adapter based on runtime config
let activeAdapter = mbkDefaultAdapter;
if (config.dbType === "sqlite") {
  activeAdapter = new SqliteAdapter(config.sqlitePath);
}

export {
  pool,
  testDbConnection,
  PostgresAdapter,
  SqliteAdapter,
  postgresDialect,
  BaseRepository,
  activeAdapter as defaultAdapter,
  activeAdapter as adapter,
};

export default activeAdapter;
