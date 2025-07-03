import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import cors from "cors";
import { engine } from "express-handlebars";
import Handlebars from "handlebars";
import unilibRoutes from "./routes/main.js";
import mbkautheRouter from "mbkauthe";
import { pool } from "./routes/pool.js";
import rateLimit from "express-rate-limit";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression());
app.set("trust proxy", 1);

app.use("/Assets/Images", express.static(path.join(__dirname, "public/Assets/Images"), { maxAge: "7d" }));

app.use("/", express.static(path.join(__dirname, "public/")));

app.engine("handlebars", engine({
  defaultLayout: false,
  partialsDir: [
    path.join(__dirname, "views/templates"),
    path.join(__dirname, "views/notice"),
    path.join(__dirname, "views"),
    path.join(__dirname, "node_modules/mbkauthe/views"),
  ], cache: false,
  helpers: {
    eq: function (a, b) {
      return a === b;
    }, gt: function (a, b) {
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
    }
  }
}));

app.set("view engine", "handlebars");

app.set("views", [
  path.join(__dirname, "views"),
  path.join(__dirname, "node_modules/mbkauthe/views")
]);

app.use(mbkautheRouter);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 15,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);

app.get(["/login", "/signin"], (req, res) => {
  const queryParams = new URLSearchParams(req.query).toString();
  const redirectUrl = `/mbkauthe/login${queryParams ? `?${queryParams}` : ''}`;
  return res.redirect(redirectUrl);
});

app.use("/", unilibRoutes);

app.use((req, res) => {
  console.log(`Path not found: ${req.url}`);
  return res.status(404).render("Error/dError.handlebars", {
    layout: false,
    code: 404,
    error: "Page Not Found",
    message: "The page you are looking for does not exist.",
    pagename: "Home",
    page: `/`,
  });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;