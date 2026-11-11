import { dblogin } from 'mbkauthe';

// Re-use connection pool from mbkauthe
export const pool = dblogin;

export async function testDbConnection() {
    try {
        if (pool && typeof pool.connect === 'function') {
            const client = await pool.connect();
            client.release();
            return true;
        }
        return true;
    } catch (err) {
        console.error('Database connection test error:', err?.message || err);
        return false;
    }
}

export default pool;
