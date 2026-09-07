/**
 * Normalizes semester value from DB representation (PG array, PG string, SQLite JSON string) into a JS Array of strings
 */
export function normalizeSemester(val) {
  if (!val) return ["Semester 3"];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map(String);
      } catch {}
    }
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const inner = trimmed.slice(1, -1);
      return inner.length
        ? inner.split(",").map((x) => x.trim().replace(/^"|"$/g, ""))
        : [];
    }
    if (trimmed.includes(",")) {
      return trimmed.split(",").map((x) => x.trim()).filter(Boolean);
    }
    return [trimmed];
  }
  return [String(val)];
}

/**
 * Normalizes sections value from DB representation into a JS Array of objects
 */
export function normalizeSections(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Expands semester strings so that 'Semester4' matches 'Semester 4' and vice versa
 */
export function expandSemesterValues(semesters) {
  if (!semesters || semesters === "all") return "all";
  const arr = Array.isArray(semesters) ? semesters : [semesters];
  const expanded = new Set();
  for (const s of arr) {
    if (!s) continue;
    const str = String(s).trim();
    expanded.add(str);
    const m1 = str.match(/^Semester(\d+)$/i);
    if (m1) {
      expanded.add(`Semester ${m1[1]}`);
    }
    const m2 = str.match(/^Semester\s+(\d+)$/i);
    if (m2) {
      expanded.add(`Semester${m2[1]}`);
    }
  }
  return Array.from(expanded);
}

/**
 * Normalizes a book record to ensure uniform types across engines
 */
export function normalizeBook(book) {
  if (!book) return null;
  return {
    id: Number(book.id),
    name: book.name,
    category: book.category,
    description: book.description || "",
    image_url: book.image_url || "BookCover_Template.webp",
    link: book.link,
    semester: normalizeSemester(book.semester),
    main: Boolean(book.main),
    visible: Boolean(book.visible),
    views: Number(book.views || 0),
    sections: normalizeSections(book.sections),
    username: book.username || null,
    created_at: book.created_at,
  };
}

/**
 * Serializes sections array into JSON string for DB persistence
 */
export function serializeSections(val) {
  return JSON.stringify(val || []);
}

/**
 * Serializes semester representation for DB persistence
 */
export function serializeSemester(val, isSqlite = false) {
  if (isSqlite) {
    const arr = Array.isArray(val)
      ? val
      : typeof val === "string" && val.includes(",")
      ? val.split(",").map((s) => s.trim()).filter(Boolean)
      : [val || "Semester 3"];
    return JSON.stringify(arr);
  }
  const toEnum = (s) => {
    if (!s) return "Semester3";
    const str = String(s).trim();
    const match = str.match(/^Semester\s*(\d+)$/i);
    return match ? `Semester${match[1]}` : str;
  };
  if (Array.isArray(val)) return val.map(toEnum);
  if (typeof val === "string" && val.includes(",")) {
    return val.split(",").map((s) => toEnum(s.trim())).filter(Boolean);
  }
  return [toEnum(val || "Semester3")];
}
