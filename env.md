## Environment Variables

- **NEON_POSTGRES**  
    Connection string for the Neon Postgres database.  
    Example:
    ```bash
    NEON_POSTGRES=postgres://username:password@host:port/database
    ```

- **MBKAUTHE_VAR**  
    API key for the admin panel (mbkauthe).  
    For setup and usage details, see:  
    https://github.com/MIbnEKhalid/mbkauthe
    Example:
    ```bash
        mbkautheVar='{
        "APP_NAME": "MBKAUTH",
        "SESSION_SECRET_KEY": "your-session-secret-key",
        "IS_DEPLOYED": "true",
        "LOGIN_DB": "postgres://username:password@host:port/database",
        "MBKAUTH_TWO_FA_ENABLE": "false",
        "COOKIE_EXPIRE_TIME": 2,
        "DOMAIN": "yourdomain.com",
    }'
    ```

- **UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN**  
    When using Upstash Redis for caching, set these two variables. Example values are shown for reference only:
    ```bash
    UPSTASH_REDIS_REST_URL=https://us1-redis.upstash.io
    UPSTASH_REDIS_REST_TOKEN=xxxxxx-your-token-xxxxxx
    ```
    If these are not set, Redis caching will be disabled and the app will fall back to DB queries.

- **REDIS_ENABLED**  
    Optional flag to explicitly enable or disable Redis caching. Default behavior: Redis is enabled when `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are present. To disable Redis regardless of those values, set:
    ```bash
    REDIS_ENABLED=false
    ```
    Accepts `false` or `0` (case-insensitive) to disable; any other value enables it.

- **TASJEEL_SYNC_CRON**  
    Cron expression for scheduling tasjeel sync job (default every 6 hours):
    ```bash
    TASJEEL_SYNC_CRON="0 */6 * * *"
    ```

- **TASJEEL_SYNC_COOKIE**  
    Optional cookie string to use for authenticated requests to tasjeel when syncing subjects and materials. Example:
    ```bash
    TASJEEL_SYNC_COOKIE="session_id=abc123..."
    ```

Notes:
- To apply the SQL migration(s) run the migration runner:
  ```bash
  node tool/runMigrations.js
  ```
  This will execute all SQL files in `migrations/` (idempotent if files use IF NOT EXISTS).
- The sync tool will also attempt to create required tables automatically when it runs, so the scheduler won't fail on a missing table. However it is recommended to run migrations explicitly in production.
- In serverless environments (Vercel) in-memory caches are ephemeral; prefer setting `TASJEEL_SYNC_COOKIE` and relying on scheduled sync to keep DB up-to-date.