import { engine } from "express-handlebars";
import path from "path";
import { fileURLToPath } from "url";
import config from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const viewsPath = path.join(__dirname, "../../views");
const nodeModulesPath = path.join(__dirname, "../../node_modules");

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
  formatNumber: (num) => {
    if (num == null) return "";
    if (num < 1000) return num;
    if (num < 1000000) return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + "k";
    if (num < 1000000000) return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + "M";
    return (num / 1000000000).toFixed(num % 1000000000 === 0 ? 0 : 1) + "B";
  },
  truncate: (str, maxLen = 100) => {
    if (str == null) return "";
    const s = String(str);
    return s.length <= maxLen ? s : s.slice(0, maxLen - 1).trimEnd() + "…";
  },
  section: function (name, options) {
    if (!this._sections) this._sections = {};
    this._sections[name] = options.fn(this);
    return null;
  },
  json: (c) => JSON.stringify(c),
  eq: (a, b) => a === b || (a != null && b != null && String(a) === String(b)),
  startsWith: (str, prefix) => typeof str === "string" && str.startsWith(prefix),
  includes: (arr, val) => (Array.isArray(arr) ? arr.includes(val) : arr === val),
  join: (arr, sep = ", ") => (Array.isArray(arr) ? arr.join(sep) : arr || ""),
  or: (a, b) => a || b,
  not: (a) => !a,
  gt: (a, b) => a > b,
  lt: (a, b) => a < b,
  add: (a, b) => a + b,
  subtract: (a, b) => a - b,
  multiply: (a, b) => a * b,
  min: (a, b) => Math.min(a, b),
  max: (a, b) => Math.max(a, b),
  range: (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i),
  encodeURIComponent: (str) => encodeURIComponent(str),
  validPageRange: (current, total, delta = 2) => {
    const start = Math.max(1, current - delta);
    const end = Math.min(total, current + delta);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  },
  substr: (str, start, len) => (str == null ? "" : String(str).substr(start, len)),
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
  app.engine("handlebars", engine({
    defaultLayout: "main",
    layoutsDir: path.join(viewsPath, "layouts"),
    partialsDir: [
      path.join(viewsPath, "templates"),
      path.join(viewsPath, "notice"),
      viewsPath,
      path.join(nodeModulesPath, "mbkauthe/views"),
    ],
    cache: config.nodeEnv === "production",
    helpers: handlebarsHelpers,
  }));

  app.set("view engine", "handlebars");
  app.set("views", [viewsPath, path.join(nodeModulesPath, "mbkauthe/views")]);
};

export default configureHandlebars;
