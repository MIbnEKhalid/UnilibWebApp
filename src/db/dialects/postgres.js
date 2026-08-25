const quoteIdentifier = (name) => `"${String(name).replace(/"/g, '""')}"`;

export const postgresDialect = {
  name: "postgres",
  quoteIdentifier,
  param: (index) => `$${index}`,
  now: () => "NOW()",
  boolean: (value) => (value ? "TRUE" : "FALSE"),
  supportsReturning: true,
  returningClause: (columns) => ` RETURNING ${columns}`,
  limitOffset: ({ limit, offset } = {}) => {
    const parts = [];
    if (typeof limit === "number") parts.push(`LIMIT ${limit}`);
    if (typeof offset === "number") parts.push(`OFFSET ${offset}`);
    return parts.length ? ` ${parts.join(" ")}` : "";
  },
  ilike: (col, param) => `${col} ILIKE ${param}`,
  semesterOverlap: (col, param) => `${col}::text[] && ${param}::text[]`,
  findBookBySectionId: (col, param) => `${col} @> ${param}::jsonb`,
  serializeSemester: (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === "string" && val.includes(",")) {
      return val.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [val || "Semester 3"];
  },
  serializeSections: (val) => JSON.stringify(val || []),
};

export default postgresDialect;
