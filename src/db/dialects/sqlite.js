const quoteIdentifier = (name) => `"${String(name).replace(/"/g, '""')}"`;

export const sqliteDialect = {
  name: "sqlite",
  quoteIdentifier,
  param: () => "?",
  now: () => "CURRENT_TIMESTAMP",
  boolean: (value) => (value ? "1" : "0"),
  supportsReturning: true,
  returningClause: (columns) => ` RETURNING ${columns}`,
  limitOffset: ({ limit, offset } = {}) => {
    const parts = [];
    if (typeof limit === "number") parts.push(`LIMIT ${limit}`);
    if (typeof offset === "number") {
      if (!parts.length) parts.push("LIMIT -1");
      parts.push(`OFFSET ${offset}`);
    }
    return parts.length ? ` ${parts.join(" ")}` : "";
  },
  ilike: (col, param) => `LOWER(${col}) LIKE LOWER(${param})`,
  semesterOverlap: (col, param) => {
    // In SQLite, semester is stored as a JSON array string
    return `EXISTS (SELECT 1 FROM json_each(${col}) WHERE value IN (SELECT value FROM json_each(${param})))`;
  },
  findBookBySectionId: (col, param) => {
    return `EXISTS (SELECT 1 FROM json_each(${col}) WHERE json_extract(value, '$.id') = ${param} OR CAST(json_extract(value, '$.id') AS TEXT) = CAST(${param} AS TEXT))`;
  },
  serializeSemester: (val) => {
    const arr = Array.isArray(val)
      ? val
      : typeof val === "string" && val.includes(",")
      ? val.split(",").map((s) => s.trim()).filter(Boolean)
      : [val || "Semester 3"];
    return JSON.stringify(arr);
  },
  serializeSections: (val) => JSON.stringify(val || []),
};

export default sqliteDialect;
