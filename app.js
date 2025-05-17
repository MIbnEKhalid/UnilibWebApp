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
app.use("/", express.static(path.join(__dirname, "public/")));
app.use('/static', express.static(path.join(__dirname, 'node_modules')));

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});
Handlebars.registerHelper('encodeURIComponent', function (str) {
  return encodeURIComponent(str);
});
Handlebars.registerHelper('conditionalEnv', function (trueResult, falseResult) {
  console.log(`Checking conditionalEnv: ${process.env.localenv}`);
  return process.env.localenv ? trueResult : falseResult;
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