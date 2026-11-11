import app from './app.js';
import { config } from './config/env.js';

if (!process.env.VERCEL) {
    app.listen(config.port, () => {
        console.log(`[${config.appName}] Server running at ${config.baseUrl}`);
        console.log(`[${config.appName}] Environment: ${config.isProduction ? 'Production' : 'Development'}`);
        console.log(`[${config.appName}] Database Type: ${config.dbType}`);
    });
}

export default app;
