import dotenv from 'dotenv';

dotenv.config();

export const config = {
    port: parseInt(process.env.PORT || '3090', 10),
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3090}`,
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
    currentSemester: parseInt(process.env.CURRENT_SEMESTER || '1', 10),
    dbType: (process.env.NODE_ENV === 'test' ? 'sqlite' : (process.env.DB_TYPE || 'sqlite')).toLowerCase(),
    sqlitePath: process.env.SQLITE_PATH || './data/unilib.db',
    databaseUrl: process.env.NEON_POSTGRES || process.env.DATABASE_URL,
    appName: process.env.APP_NAME || 'Unilib',
    redisUrl: process.env.REDIS_URL || '',
    redisCacheEnabled: process.env.NODE_ENV !== 'test' && process.env.REDIS_CACHE_ENABLED !== 'false',
};

export default config;
