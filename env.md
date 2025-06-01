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
        "RECAPTCHA_SECRET_KEY": "your-recaptcha-secret-key",
        "RECAPTCHA_Enabled": "false",
        "BypassUsers": ["user1","user2"],
        "SESSION_SECRET_KEY": "your-session-secret-key",
        "IS_DEPLOYED": "true",
        "LOGIN_DB": "postgres://username:password@host:port/database",
        "MBKAUTH_TWO_FA_ENABLE": "false",
        "COOKIE_EXPIRE_TIME": 2,
        "DOMAIN": "yourdomain.com",
        "layout": false
    }'
    ```