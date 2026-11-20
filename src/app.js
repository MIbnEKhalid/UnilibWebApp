import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { config } from './config/env.js';
import { setupViewEngine } from './config/view-engine.js';
import { compressionMiddleware } from './middleware/compression.js';
import { globalLimiter } from './middleware/rate-limiter.js';
import { securityHeadersMiddleware } from './middleware/security-headers.js';
import { botProtectionMiddleware } from './middleware/bot-protection.js';
import { responseTimeMiddleware } from './middleware/response-time.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import routes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../');

const app = express();

// Trust reverse proxy (essential behind Vercel / Nginx / Cloudflare)
app.set('trust proxy', 1);

// 1. Security Headers (Anti-Clickjacking, XSS, MIME sniffing)
app.use(securityHeadersMiddleware);

// 2. Bot Protection & Malicious Scanner Blocking
app.use(botProtectionMiddleware);

// 3. Compression
app.use(compressionMiddleware);

// 4. Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 5. Global baseline rate limiting
app.use(globalLimiter);

// 6. Handlebars view engine with mbkutils & mbkauthe integration
setupViewEngine(app);

// 7. Static assets serving with caching
const publicDir = path.join(rootDir, 'public');
app.use(
    express.static(publicDir, {
        maxAge: config.isProduction ? '1y' : '1d',
        immutable: config.isProduction,
        setHeaders: (res, filePath) => {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'public, max-age=0');
            } else {
                res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            }
        }
    })
);
app.use(
    '/assets',
    express.static(path.join(rootDir, 'assets'), {
        maxAge: config.isProduction ? '1y' : '1d',
        immutable: config.isProduction,
        setHeaders: (res, filePath) => {
            res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
        }
    })
);

// 8. Response latency tracking
app.use(responseTimeMiddleware);

// Global view locals for cache busting and application metadata
let appVersion = '1.0.0';
try {
    const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));
    if (pkg.version) appVersion = pkg.version;
} catch {}

app.use((req, res, next) => {
    res.locals.appVersion = appVersion;
    res.locals.cacheBust = `?v=${appVersion}`;
    res.locals.cachebust = `?v=${appVersion}`;
    res.locals.currentUrl = req.originalUrl || req.url || '';
    next();
});

// 9. Mount application routes
app.use(routes);

// 10. 404 Handler & Global Error Handler (from mbkutils)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
