import express from "express";
import dotenv from "dotenv";
import { dblogin } from "mbkauthe";
import { validateSession, checkRolePermission, validateSessionAndRole } from "mbkauthe";
let pool = dblogin;
let pool1 = dblogin;

dotenv.config();
const router = express.Router();

router.get(["/dashboard/Unilib","/dashboard"], validateSessionAndRole("Any"), async (req, res) => {
  res.render("mainPages/uniDomain/Book.handlebars");
});

router.get("/dashboard/Book/Edit/:id", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.id;
  const query = `
      SELECT id, name, category, description, "imageURL", link, semester, main FROM "unilibbook"
      WHERE id = $1`;
  try {
    const result = await dblogin.query(query, [bookId]);
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
    // Fetch the last id from the table
    const lastIdQuery = `SELECT MAX(id) AS lastId FROM "unilibbook"`;
    const lastIdResult = await dblogin.query(lastIdQuery);
    const lastId = lastIdResult.rows[0].lastid || 0; // Default to 0 if no rows exist
    const newId = lastId + 1;

    // Insert the new book with the incremented id
    const query = `
      INSERT INTO "unilibbook" (id, name, category, description, "imageURL", link, semester, main)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    const values = [newId, name, category, description, imageURL, link, semester, main];

    console.log("Executing query:", query);
    console.log("With values:", values);

    await dblogin.query(query, values);
    console.log("Book added successfully to the database.");

    res.status(201).json({ message: "Book added successfully!", id: newId });
  } catch (error) {
    console.error("Error adding book:", error);
    res.status(500).json({ error: "Failed to add book" });
  }
});

router.get("/api/Unilib/Book", async (req, res) => {
    console.log("UnilibBook Api Request processed successfully");
  try {
    const { page = 1, limit = 10, semester, category, search } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM unilibbook';
    let conditions = [];
    let params = [];
    
    if (semester) {
      conditions.push(`semester = $${params.length + 1}`);
      params.push(semester);
    }
    
    if (category && category !== 'all') {
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
    
    // Add sorting (main books first, then by name)
    query += ' ORDER BY main DESC, name ASC';
    
    // Add pagination
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await pool1.query(query, params);
    const countResult = await pool1.query(countQuery, params.slice(0, -2));
    const total = parseInt(countResult.rows[0].count);
    const pages = Math.ceil(total / limit);
    
    res.json({
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (err) {
    console.error("Error fetching books:", err);
    res.status(500).send("Internal Server Error: " + err);
  }
});

export default router; 