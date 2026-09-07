import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import cors from "cors";
import mbkautheRouter, { sessRole } from "mbkauthe";
import mbkbucket from "mbkbucket";
import { createRouter as createAdminDbRouter } from "admindb";

import config from "./config/index.js";
import configureHandlebars from "./config/handlebars.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import { notFoundHandler, errorHandler } from "./middlewares/errorHandler.js";
import appRoutes from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(compression());
app.set("trust proxy", 1);

// Static assets
app.use("/", express.static(path.join(__dirname, "../public/"), { maxAge: "1y" }));

// Template engine setup
configureHandlebars(app);

// Global view locals for cache busting and default config
app.use((req, res, next) => {
  res.locals.appVersion = config.appVersion;
  res.locals.defaultSemester = config.defaultSemester;
  const currentUrl = req.originalUrl || req.url || "";
  res.locals.currentUrl = currentUrl;
  res.locals.isAdminPage = currentUrl.startsWith("/dashboard");
  res.locals.isBooksAdmin = currentUrl === "/dashboard" || currentUrl.startsWith("/dashboard/Unilib") || currentUrl.startsWith("/dashboard/Book");
  res.locals.isMaterialsAdmin = currentUrl.startsWith("/dashboard/Materials");
  res.locals.isAddBookPage = currentUrl === "/dashboard/Book/Add";
  res.locals.isDbAdmin = currentUrl.startsWith("/dashboard/db");
  next();
});

// Rate limiter
app.use(rateLimiter);

// Auth middleware & routes
app.use(mbkautheRouter);

// Application routes
app.use(appRoutes);

// AdminDB SQLite database management UI
try {
  const adminDbPath = path.resolve(config.sqlitePath || "./data/unilib.sqlite");
  app.use(
    "/dashboard/db",
    sessRole("superadmin"),
    createAdminDbRouter({
      dbPath: adminDbPath,
      basePath: "/dashboard/db",
      auth: false,
    })
  );
} catch (adminDbErr) {
  console.warn("Could not mount AdminDB router:", adminDbErr.message);
}

// Storage bucket integration
app.use(mbkbucket);

// 404 & Global error handlers
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
