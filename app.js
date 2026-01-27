import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import cors from "cors";
import { engine } from "express-handlebars";
import unilibRoutes from "./routes/main.js";
import pdfRoutes from "./routes/pdf.js";

// Sync job for tasjeel subjects/materials
import cron from 'node-cron';
import { syncTasjeel, getLatestSession } from './tool/syncTasjeel.js';
import mbkautheRouter from "mbkauthe";
import { renderError } from "mbkauthe";
import rateLimit from "express-rate-limit";
import { readFileSync } from "fs";

// Read version from package.json for cache busting
const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
const APP_VERSION = packageJson.version;

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression());
app.set("trust proxy", 1);

app.use("/", express.static(path.join(__dirname, "public/"), { maxAge: "1y" }));

app.engine("handlebars", engine({
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: [
    path.join(__dirname, "views/templates"),
    path.join(__dirname, "views/notice"),
    path.join(__dirname, "views"),
    path.join(__dirname, "node_modules/mbkauthe/views"),
  ], cache: false,
  helpers: {
    formatNumber: function (num) {
      if (num == null) return '';
      if (num < 1000) return num;
      if (num < 1000000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'k';
      if (num < 1000000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M';
      return (num / 1000000000).toFixed(num % 1000000000 === 0 ? 0 : 1) + 'B';
    },
    // Truncate string and add ellipsis if longer than maxLen
    truncate: function (str, maxLen = 100) {
      if (str == null) return '';
      const s = String(str);
      if (s.length <= maxLen) return s;
      return s.slice(0, maxLen - 1).trimEnd() + '…';
    },

    section: function (name, options) {
      if (!this._sections) this._sections = {};
      this._sections[name] = options.fn(this);
      return null;
    },
    json: function (context) {
      return JSON.stringify(context);
    },
    eq: function (a, b) {
      return a === b;
    },
    includes: function (arr, val) {
      if (Array.isArray(arr)) return arr.includes(val);
      return arr === val;
    },
    join: function (arr, sep = ', ') {
      if (Array.isArray(arr)) return arr.join(sep);
      return arr || '';
    },
    or: function (a, b) {
      return a || b;
    },
    gt: function (a, b) {
      return a > b;
    }, lt: function (a, b) {
      return a < b;
    }, add: function (a, b) {
      return a + b;
    }, subtract: function (a, b) {
      return a - b;
    }, multiply: function (a, b) {
      return a * b;
    }, min: function (a, b) {
      return Math.min(a, b);
    }, max: function (a, b) {
      return Math.max(a, b);
    }, range: function (start, end) {
      const range = [];
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      return range;
    }, encodeURIComponent: function (str) {
      return encodeURIComponent(str);
    },
    validPageRange: function (current, total, delta = 2) {
      const range = [];
      let start = Math.max(1, current - delta);
      let end = Math.min(total, current + delta);
      for (let i = start; i <= end; i++) {
        range.push(i);
      }
      return range;
    }, substr: function (str, start, len) {
      if (str == null) return '';
      return String(str).substr(start, len);
    }
  }
}));

app.set("view engine", "handlebars");

app.set("views", [
  path.join(__dirname, "views"),
  path.join(__dirname, "node_modules/mbkauthe/views")
]);

app.use(mbkautheRouter);

// Make app version available to all views for cache busting
app.use((req, res, next) => {
  res.locals.appVersion = APP_VERSION;
  next();
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 25,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

app.use("/", unilibRoutes);
app.use("/pdf", pdfRoutes);

app.use((req, res) => {
  console.log(`Path not found: ${req.url}`);
  return renderError(res, req, {
    layout: false,
    code: 404,
    error: "Page Not Found",
    message: "The page you are looking for does not exist.",
    pagename: "Home",
    page: `/`,
  });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  if (process.env.NODE_ENV != 'development') {
    // Schedule tasjeel sync using cron expression from env or default every 6 hours
    const cronExpr = process.env.TASJEEL_SYNC_CRON || '0 */6 * * *';
    console.log(`Scheduling tasjeel sync with cron: ${cronExpr}`);
    try {
      // run once immediately on startup
      await syncTasjeel(await getLatestSession());

      if (cron.validate(cronExpr)) {
        cron.schedule(cronExpr, async () => {
          try {
            await syncTasjeel(await getLatestSession());
          } catch (err) {
            console.error('Scheduled sync failed:', err);
          }
        });
      } else {
        console.warn('Invalid cron expression for TASJEEL_SYNC_CRON; skipping schedule.');
      }
    } catch (err) {
      console.error('Error initializing tasjeel sync schedule:', err);
    }
  }
});

export default app;