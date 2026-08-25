/**
 * Translates PostgreSQL queries to SQLite-compatible syntax:
 *   - `$1, $2, ...` positional params               -> `?`
 *   - `col = ANY($1)` / `col = ANY($1::int[])`      -> `col IN (?, ?, ...)`
 *   - `NOW()`                                       -> `CURRENT_TIMESTAMP`
 *   - `TRUE` / `FALSE`                              -> `1` / `0`
 *   - `::type` casts                                -> stripped
 *   - `ILIKE`                                       -> `LIKE`
 */
export function translatePgToSqlite(text, values = []) {
  let sql = String(text ?? "")
    .replace(/::\w+(\[\])?/g, "")
    .replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/\bTRUE\b/g, "1")
    .replace(/\bFALSE\b/g, "0")
    .replace(/\bILIKE\b/gi, "LIKE");

  if (!/\$\d/.test(sql)) {
    return { text: sql, values };
  }

  const tokenRegex = /(=\s*ANY\(\$(\d+)\))|(\$(\d+))/g;
  let out = "";
  let lastIndex = 0;
  let match;
  const newValues = [];

  while ((match = tokenRegex.exec(sql)) !== null) {
    out += sql.slice(lastIndex, match.index);

    if (match[1]) {
      // `col = ANY($N)` -> `col IN (?, ?, ...)`
      const paramIndex = Number(match[2]) - 1;
      const rawValue = values[paramIndex];
      const arr = Array.isArray(rawValue) ? rawValue : [rawValue];
      if (arr.length === 0) {
        out += "IN (NULL)";
      } else {
        out += `IN (${arr.map(() => "?").join(", ")})`;
        newValues.push(...arr);
      }
    } else if (match[3]) {
      const paramIndex = Number(match[4]) - 1;
      out += "?";
      newValues.push(values[paramIndex]);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  out += sql.slice(lastIndex);
  return { text: out, values: newValues };
}

export default translatePgToSqlite;
