import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const idleTimeoutMillisV = 60000; // 60 seconds
const connectionTimeoutMillisV = 50000; // 50 seconds

const poolConfig = {
  connectionString: process.env.NEON_POSTGRES,
  ssl: {
    rejectUnauthorized: true,
  },
};

export const pool = new Pool(poolConfig);

(async () => {
  try {
    const client = await pool.connect();
    console.log("Connected to PostgreSQL database (pool)!");
    client.release();
  } catch (err) {
    console.error("Database connection error (pool):", err);
  }
})();

// PostgreSQL connection pool for pool3
const pool2Config = {
  connectionString: process.env.NEON_POSTGRES2,
  ssl: {
    rejectUnauthorized: true,
  },
  max: 20, // Maximum number of connections
  idleTimeoutMillis: idleTimeoutMillisV,
  connectionTimeoutMillis: connectionTimeoutMillisV,
};

export const pool2 = new Pool(pool2Config);

// Test connection for pool2
(async () => {
  try {
    const client = await pool2.connect();
    console.log("Connected to neon PostgreSQL database (pool2)!");
    client.release();
  } catch (err) {
    console.error("Database connection error (pool2):", err);
  }
})();