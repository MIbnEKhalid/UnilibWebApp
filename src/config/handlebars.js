import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { setupViewEngine, commonHandlebarsHelpers } from "mbkutils";
import config from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const projectRoot = fs.existsSync(path.join(process.cwd(), "views"))
  ? process.cwd()
  : path.resolve(__dirname, "../../");
const viewsPath = path.join(projectRoot, "views");
const nodeModulesPath = path.join(projectRoot, "node_modules");

function resolvePackageViews(pkgName) {
  try {
    const pkgJson = require.resolve(`${pkgName}/package.json`);
    const p = path.join(path.dirname(pkgJson), "views");
    if (fs.existsSync(p)) return p;
  } catch {}
  const fallback = path.join(nodeModulesPath, pkgName, "views");
  return fs.existsSync(fallback) ? fallback : null;
}

function parseSemesterNumbers(sem) {
  if (!sem) return null;
  let arr = sem;
  if (typeof sem === "string") {
    if (sem.toLowerCase() === "all") return "ALL";
    try {
      const parsed = JSON.parse(sem);
      arr = Array.isArray(parsed) ? parsed : sem.split(",");
    } catch {
      arr = sem.split(",");
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  if (arr.some((s) => String(s).toLowerCase() === "all") || arr.length >= 8) return "ALL";

  const nums = arr
    .map((s) => {
      const m = String(s).match(/\d+/);
      return m ? parseInt(m[0], 10) : null;
    })
    .filter((n) => n !== null && !isNaN(n))
    .sort((a, b) => a - b);

  return nums.length ? nums : null;
}

export const handlebarsHelpers = {
  ...commonHandlebarsHelpers,
  formatSemesterBadge: (sem) => {
    const nums = parseSemesterNumbers(sem);
    if (!nums) return sem || "";
    if (nums === "ALL") return "All Semesters";

    const ranges = [];
    let start = nums[0];
    let prev = nums[0];

    for (let i = 1; i < nums.length; i++) {
      const curr = nums[i];
      if (curr === prev + 1) {
        prev = curr;
      } else {
        ranges.push(start === prev ? String(start) : prev === start + 1 ? `${start}, ${prev}` : `${start}–${prev}`);
        start = prev = curr;
      }
    }
    ranges.push(start === prev ? String(start) : prev === start + 1 ? `${start}, ${prev}` : `${start}–${prev}`);
    return `Sem ${ranges.join(", ")}`;
  },
  formatSemesterChips: (sem) => {
    const chipHtml = (text) => `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">${text}</span>`;
    const nums = parseSemesterNumbers(sem);
    if (!nums) return "";
    if (nums === "ALL") return chipHtml("All Semesters");
    return nums.map((n) => chipHtml(`Sem ${n}`)).join(" ");
  },
  hasSemester: (bookSemester, target) => {
    if (!bookSemester) return false;
    const targetNums = parseSemesterNumbers(target);
    const bookNums = parseSemesterNumbers(bookSemester);
    if (!bookNums) return false;
    if (targetNums === "ALL") return bookNums === "ALL";
    if (bookNums === "ALL") return true;
    if (!targetNums || !targetNums.length) return false;
    return targetNums.some((n) => bookNums.includes(n));
  },
};

export const configureHandlebars = (app) => {
  const extraViewsDirs = [
    resolvePackageViews("mbkauthe"),
    resolvePackageViews("mbkbucket"),
    resolvePackageViews("mbkutils"),
  ].filter(Boolean);

  setupViewEngine(app, {
    rootDir: projectRoot,
    viewsDir: viewsPath,
    defaultLayout: "main",
    cache: config.nodeEnv === "production",
    additionalViewsDirs: extraViewsDirs,
    additionalPartialsDirs: extraViewsDirs,
    helpers: handlebarsHelpers,
  });
};

export default configureHandlebars;
