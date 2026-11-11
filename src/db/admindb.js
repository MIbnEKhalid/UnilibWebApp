import fs from 'fs';
import path from 'path';
import { createRouter as createAdminDbRouter } from 'admindb';
import { config } from '../config/env.js';

export const ADMINDB_BASE_PATH = '/admin/db';

/**
 * Creates the AdminDB Express router configured for this template application.
 * Supports both SQLite and PostgreSQL backends based on config.
 */
export function createAdminDbSubRouter(basePath = ADMINDB_BASE_PATH) {
    try {
        const isPostgres = config.dbType === 'postgres' || (config.databaseUrl && /^postgres(ql)?:\/\//i.test(config.databaseUrl));

        if (isPostgres && config.databaseUrl) {
            return createAdminDbRouter({
                connection: config.databaseUrl,
                basePath,
                auth: false,
                logLevel: 'warn',
            });
        }

        // SQLite Mode (default)
        let sqlitePath = config.sqlitePath || './data/app.db';
        if (sqlitePath !== ':memory:') {
            sqlitePath = path.resolve(sqlitePath);
            const dbDir = path.dirname(sqlitePath);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
        }

        return createAdminDbRouter({
            dbPath: sqlitePath,
            basePath,
            auth: false,
            logLevel: 'warn',
        });
    } catch (err) {
        console.warn('[mbktemplate] Failed to initialize AdminDB router:', err?.message || err);
        return null;
    }
}

export default createAdminDbSubRouter;
