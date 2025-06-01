import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import compression from "compression";
import cors from "cors";
import { engine } from "express-handlebars";
import Handlebars from "handlebars";
import unilibRoutes from "./routes/main.js";
import mbkautheRouter from "mbkauthe";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(compression());

app.use(
  "/Assets/Images",
  express.static(path.join(__dirname, "public/Assets/Images"), {
    maxAge: "7d" // Cache for 7 days
  })
);

// Serve all other static files (no cache or default)
app.use("/", express.static(path.join(__dirname, "public/")));

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});
Handlebars.registerHelper('encodeURIComponent', function (str) {
  return encodeURIComponent(str);
});

// Configure Handlebars
app.engine("handlebars", engine({
  defaultLayout: false,
  partialsDir: [
    path.join(__dirname, "views/templates"),
    path.join(__dirname, "views/notice"),
    path.join(__dirname, "views")
  ], cache: false // Disable cache for development

}));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));
app.use(mbkautheRouter);

app.get("/", (req, res) => {
  return res.render("mainPages/uniDomain/index.handlebars");
});

app.get("/login", (req, res) => {
  return res.render("mainPages/login.handlebars");
});

app.use("/", unilibRoutes);

app.use((req, res) => {
  console.log(`Path not found: ${req.url}`);
  res.render("mainPages/404.handlebars");
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
export default app;