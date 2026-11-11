import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAdapter } from "../src/db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const booksPath = path.resolve(__dirname, "../../unilib_books (1).json");

async function run() {
  const books = JSON.parse(fs.readFileSync(booksPath, "utf8"));
  const res = await defaultAdapter.query("SELECT id, title FROM unilib_resources");
  let updated = 0;

  for (const row of res.rows) {
    const book = books.find(
      (b) => b.name && b.name.trim().toLowerCase() === row.title.trim().toLowerCase()
    );
    if (book && book.link) {
      await defaultAdapter.query(
        "UPDATE unilib_resources SET drive_url = $1 WHERE id = $2",
        [book.link, row.id]
      );
      updated++;
      console.log(`[✓] Updated #${row.id} "${row.title}" -> ${book.link}`);
    }
  }

  console.log(`Successfully populated drive_url for ${updated} resources.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

