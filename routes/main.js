import express from "express";
import dotenv from "dotenv";
import { validateSession, checkRolePermission, validateSessionAndRole } from "mbkauthe";
import { pool } from "./pool.js";

dotenv.config();
const router = express.Router();

// define a reusable handler function
async function renderUnilibBooks(req, res, view) {
  const { page = 1, limit = 12, semester = 'Semester2', category = 'all', search = '' } = req.query;
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM unilibbook';
  const conditions = [];
  const params = [];

  if (semester) {
    conditions.push(`semester = $${params.length + 1}`);
    params.push(semester);
  }
  if (category !== 'all') {
    conditions.push(`category = $${params.length + 1}`);
    params.push(category);
  }
  if (search) {
    conditions.push(`name ILIKE $${params.length + 1}`);
    params.push(`%${search}%`);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY main DESC, name ASC';

  const countQuery = `SELECT COUNT(*) FROM (${query}) AS total`;
  query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);

  try {
    const result = await pool.query(query, params);
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count, 10);
    const pages = Math.ceil(total / limit);

    return res.render(view, {
      books: result.rows,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages
      },
      filters: { semester, category, search }
    });
  } catch (err) {
    console.error("Error fetching books:", err);
    return res.status(500).send("Internal Server Error");
  }
}

// Route for '/' with caching
router.get("/", async (req, res) => {
  // Normalize query parameters for consistent cache keys
  const { page = '1', limit = '12', semester = 'Semester2', category = 'all', search = '' } = req.query;
  const queryString = new URLSearchParams({ page, limit, semester, category, search }).toString();

  // Set Cache-Control and Vary headers for 2-minute edge caching
  res.set({
    'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
    'Vary': 'Accept-Encoding, X-Query-Params',
    'X-Query-Params': queryString
  });

  await renderUnilibBooks(req, res, "mainPages/uniDomain/index.handlebars");
});

router.get(["/dashboard/Unilib", "/dashboard"], validateSessionAndRole("any"), async (req, res) => {
  await renderUnilibBooks(req, res, "mainPages/uniDomain/Book.handlebars");
});

router.get("/dashboard/Book/Edit/:id", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.id;
  const query = `
      SELECT id, name, category, description, "imageURL", link, semester, main FROM "unilibbook"
      WHERE id = $1`;
  try {
    const result = await pool.query(query, [bookId]);
    const book = result.rows[0];
    res.render("mainPages/uniDomain/EditBook.handlebars", { id: bookId, book, role: req.session.user.role });
  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
});

router.post("/api/admin/Unilib/Book/Edit/:id", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.id;
  const { name, category, description, imageURL, link, semester, main } = req.body;
  const query = `
      UPDATE "unilibbook"
      SET name = $1, category = $2, description = $3, "imageURL" = $4, link = $5, semester = $6, main = $7
      WHERE id = $8
    `;
  const values = [name, category, description, imageURL, link, semester, main, bookId];
  try {
    await pool.query(query, values); // Use pool.query for database operations
    res.status(200).json({ message: "Book updated successfully!" });
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

router.post("/api/admin/Unilib/Book/Delete/:id", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.id;
  const query = `DELETE FROM "unilibbook" WHERE id = $1`;

  try {
    await pool.query(query, [bookId]); // Execute the query using pool
    res.status(200).json({ message: "Book deleted successfully!" }); // Send success response
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Failed to delete book" }); // Send error response
  }
});

router.get("/dashboard/Book/Add", validateSessionAndRole("Any"), async (req, res) => {
  res.render("mainPages/uniDomain/AddBook.handlebars", { role: req.session.user.role });
});

router.post("/api/admin/Unilib/Book/Add", validateSessionAndRole("Any"), async (req, res) => {
  const { name, category, description, imageURL, link, semester, main } = req.body;

  try {
    const query = `
      INSERT INTO "unilibbook" (name, category, description, "imageURL", link, semester, main)
      VALUES ($1, $2, $3, $4, $5, $6, $7);
    `;
    const values = [name, category, description, imageURL, link, semester, main];

    console.log("Executing query:", query);
    console.log("With values:", values);

    await pool.query(query, values);
    console.log("Book added successfully to the database.");

    res.status(201).json({ message: "Book added successfully!" });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Failed to add book" });
  }
});

// Route for single book view '/book/:id'
router.get("/book/:id", async (req, res) => {
  const bookId = req.params.id;

  // Set Cache-Control headers
  res.set({
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=120',
    'Vary': 'Accept-Encoding'
  });

  try {
    const query = 'SELECT * FROM unilibbook WHERE id = $1';
    const result = await pool.query(query, [bookId]);

    if (result.rows.length === 0) {
      return res.status(404).render("mainPages/404.handlebars");
    }

    const book = result.rows[0];
    return res.render("mainPages/uniDomain/index.handlebars", {
      books: [book], // Single book as array for consistency
      singleBookView: true,
      bookId: bookId,
      pagination: {
        page: 1,
        limit: 1,
        total: 1,
        pages: 1
      },
      filters: { semester: book.semester, category: book.category, search: '' }
    });
  } catch (err) {
    console.error("Error fetching book:", err);
    return res.status(500).send("Internal Server Error");
  }
});

export default router;