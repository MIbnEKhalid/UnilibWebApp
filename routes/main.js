import express from "express";
import dotenv from "dotenv";
import { validateSession, checkRolePermission, validateSessionAndRole } from "mbkauthe";
import { pool } from "./pool.js";

dotenv.config();
const router = express.Router();

// define a reusable handler function
async function renderUnilibBooks(req, res, view, data) {
  const { page = 1, limit = 12, semester = 'Semester3', category = 'all', search = '' } = req.query;
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
      ...data,
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
  const { page = '1', limit = '12', semester = 'Semester3', category = 'all', search = '' } = req.query;
  const queryString = new URLSearchParams({ page, limit, semester, category, search }).toString();

  // Set Cache-Control and Vary headers for 2-minute edge caching
  res.set({
    'Cache-Control': 'public, max-age=120, s-maxage=120, stale-while-revalidate=60',
    'Vary': 'Accept-Encoding, X-Query-Params',
    'X-Query-Params': queryString
  });
  let isLoggedIn = req.session.user ? true : false;
  await renderUnilibBooks(req, res, "mainPages/index.handlebars", { layout: false, isLoggedIn });
});

router.get(["/dashboard/Unilib", "/dashboard"], validateSessionAndRole("any"), async (req, res) => {
  await renderUnilibBooks(req, res, "mainPages/Book.handlebars");
});

router.get("/dashboard/Book/Edit/:id", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.id;
  const query = `
      SELECT id, name, category, description, "imageURL", link, semester, main FROM "unilibbook"
      WHERE id = $1`;
  try {
    const result = await pool.query(query, [bookId]);
    const book = result.rows[0];
    res.render("mainPages/EditBook.handlebars", { id: bookId, book, role: req.session.user.role });
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
  res.render("mainPages/AddBook.handlebars", { role: req.session.user.role });
});

router.post("/api/admin/Unilib/Book/Add", validateSessionAndRole("Any"), async (req, res) => {
  const { name, category, description, imageURL, link, semester, main } = req.body;

  try {
    const query = `
      INSERT INTO "unilibbook" (name, category, description, "imageURL", link, semester, main, "UserName")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    const values = [name, category, description, imageURL, link, semester, main, req.session.user.username];

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

// Export all (optionally filtered) books as JSON file
router.get("/api/admin/Unilib/Book/Export", validateSessionAndRole("Any"), async (_req, res) => {
  // Always export ALL books, ignoring any provided filters
  const query = 'SELECT * FROM unilibbook ORDER BY main DESC, name ASC';
  try {
    const result = await pool.query(query);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `unilib-books-${timestamp}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).json({
      exportedAt: new Date().toISOString(),
      count: result.rows.length,
      filters: 'none',
      books: result.rows,
      labs: result.rows.filter(book => book.category === 'LabManuals').map(book => ({ bookId: book.id, labs: book.labs || [] }))
    });
  } catch (error) {
    console.error('Error exporting books:', error);
    return res.status(500).json({ error: 'Failed to export books' });
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
      return res.status(404).render("Error/dError.handlebars", {
        layout: false,
        code: 404,
        error: "Book Not Found",
        message: "The Book you are looking for does not exist.",
        pagename: "Home",
        page: `/`,
      });
    }

    let isLoggedIn = req.session.user ? true : false;

    const book = result.rows[0];

    // If it's a lab manual, fetch labs from JSONB
    let labs = [];
    if (book.category === 'LabManuals') {
      labs = book.labs || [];
    }

    return res.render("mainPages/index.handlebars", {
      layout: false,
      isLoggedIn,
      books: [book], // Single book as array for consistency
      singleBookView: true,
      bookId: bookId,
      labs: labs,
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

// Lab management routes
router.get("/dashboard/Book/:bookId/Labs", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.bookId;
  try {
    const bookQuery = 'SELECT * FROM unilibbook WHERE id = $1 AND category = $2';
    const bookResult = await pool.query(bookQuery, [bookId, 'LabManuals']);
    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found or not a lab manual");
    }
    const book = bookResult.rows[0];
    const labs = book.labs || [];

//    console.log('Rendering labs page for book:', bookId);
//    console.log('Book data:', book);
//    console.log('Labs data:', labs);
//    console.log('Labs type:', typeof labs, Array.isArray(labs));

    res.render("mainPages/Labs.handlebars", { book, labs, role: req.session.user.role });
  } catch (error) {
    console.error("Error fetching labs:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/api/admin/Book/:bookId/Lab/Add", async (req, res) => {
  const bookId = req.params.bookId;
  const { lab_number, page_start, page_end, name } = req.body;

  // Input validation
  if (!lab_number || !page_start || !page_end || !name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (typeof lab_number !== 'number' || lab_number < 1) {
    return res.status(400).json({ error: "Lab number must be a positive integer" });
  }

  if (typeof page_start !== 'number' || page_start < 1) {
    return res.status(400).json({ error: "Start page must be a positive integer" });
  }

  if (typeof page_end !== 'number' || page_end < 1) {
    return res.status(400).json({ error: "End page must be a positive integer" });
  }

  if (page_start > page_end) {
    return res.status(400).json({ error: "Start page cannot be greater than end page" });
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    return res.status(400).json({ error: "Lab name must be a non-empty string with maximum 200 characters" });
  }

  try {
    // Check if book exists and is a lab manual
    const bookQuery = 'SELECT id, labs FROM unilibbook WHERE id = $1 AND category = $2';
    const bookResult = await pool.query(bookQuery, [bookId, 'LabManuals']);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found or not a lab manual" });
    }

    const book = bookResult.rows[0];
    const currentLabs = book.labs || [];

    // Check for duplicate lab numbers
    const duplicateLab = currentLabs.find(lab => lab.lab_number === lab_number);
    if (duplicateLab) {
      return res.status(409).json({ error: `Entry number ${lab_number} already exists in this manual` });
    }

    // Generate unique ID (using timestamp + random for better uniqueness)
    const newLabId = Date.now() + Math.floor(Math.random() * 1000);
    const newLab = {
      id: newLabId,
      lab_number: lab_number,
      page_start: page_start,
      page_end: page_end,
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedLabs = [...currentLabs, newLab];

    // Update the labs JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET labs = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedLabs), bookId]);

      await client.query('COMMIT');
      console.log(`Content ${lab_number} added to book ${bookId} by user ${req.session.user.username}`);

      res.status(201).json({
        message: `Content added successfully!`,
        lab: newLab
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error adding lab:", error);
    res.status(500).json({ error: "Failed to add lab. Please try again." });
  }
});

router.post("/api/admin/Lab/Edit/:labId", validateSessionAndRole("Any"), async (req, res) => {
  const labId = parseInt(req.params.labId);
  const { lab_number, page_start, page_end, name } = req.body;

  // Input validation
  if (!lab_number || !page_start || !page_end || !name) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (typeof lab_number !== 'number' || lab_number < 1) {
    return res.status(400).json({ error: "Lab number must be a positive integer" });
  }

  if (typeof page_start !== 'number' || page_start < 1) {
    return res.status(400).json({ error: "Start page must be a positive integer" });
  }

  if (typeof page_end !== 'number' || page_end < 1) {
    return res.status(400).json({ error: "End page must be a positive integer" });
  }

  if (page_start > page_end) {
    return res.status(400).json({ error: "Start page cannot be greater than end page" });
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    return res.status(400).json({ error: "Lab name must be a non-empty string with maximum 200 characters" });
  }

  try {
    // Find the book that contains this lab
    const findBookQuery = "SELECT id, labs FROM unilibbook WHERE category = $1 AND labs @> $2";
    const findBookResult = await pool.query(findBookQuery, ['LabManuals', JSON.stringify([{ id: labId }])]);

    if (findBookResult.rows.length === 0) {
      return res.status(404).json({ error: "Lab not found" });
    }

    const book = findBookResult.rows[0];
    const currentLabs = book.labs || [];

    // Check for duplicate lab numbers (excluding current lab)
    const duplicateLab = currentLabs.find(lab => lab.lab_number === lab_number && lab.id !== labId);
    if (duplicateLab) {
      return res.status(409).json({ error: `Entry number ${lab_number} already exists in this manual` });
    }

    // Update the specific lab
    const updatedLabs = currentLabs.map(lab =>
      lab.id === labId
        ? {
            ...lab,
            lab_number: lab_number,
            page_start: page_start,
            page_end: page_end,
            name: name.trim(),
            updated_at: new Date().toISOString()
          }
        : lab
    );

    // Update the labs JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET labs = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedLabs), book.id]);

      await client.query('COMMIT');
      console.log(`Lab ${labId} updated in book ${book.id} by user ${req.session.user.username}`);

      res.status(200).json({
        message: `Content updated successfully!`,
        lab: updatedLabs.find(lab => lab.id === labId)
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating lab:", error);
    res.status(500).json({ error: "Failed to update lab. Please try again." });
  }
});

router.post("/api/admin/Lab/Delete/:labId", validateSessionAndRole("Any"), async (req, res) => {
  const labId = parseInt(req.params.labId);

  if (!labId || isNaN(labId)) {
    return res.status(400).json({ error: "Invalid lab ID" });
  }

  try {
    // Find the book that contains this lab
    const findBookQuery = "SELECT id, labs FROM unilibbook WHERE category = $1 AND labs @> $2";
    const findBookResult = await pool.query(findBookQuery, ['LabManuals', JSON.stringify([{ id: labId }])]);

    if (findBookResult.rows.length === 0) {
      return res.status(404).json({ error: "Lab not found" });
    }

    const book = findBookResult.rows[0];
    const currentLabs = book.labs || [];

    // Find the lab to be deleted
    const labToDelete = currentLabs.find(lab => lab.id === labId);
    if (!labToDelete) {
      return res.status(404).json({ error: "Lab not found" });
    }

    // Remove the specific lab
    const updatedLabs = currentLabs.filter(lab => lab.id !== labId);

    // Update the labs JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET labs = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedLabs), book.id]);

      await client.query('COMMIT');
      console.log(`Lab ${labId} (Lab ${labToDelete.lab_number}: ${labToDelete.name}) deleted from book ${book.id} by user ${req.session.user.username}`);

      res.status(200).json({
        message: `Content deleted successfully!`,
        deletedLab: labToDelete
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error deleting lab:", error);
    res.status(500).json({ error: "Failed to delete lab. Please try again." });
  }
});

// Bulk delete labs
router.post("/api/admin/Book/:bookId/Labs/BulkDelete", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.bookId;
  const { labIds } = req.body;

  // Input validation
  if (!Array.isArray(labIds) || labIds.length === 0) {
    return res.status(400).json({ error: "labIds must be a non-empty array" });
  }

  if (labIds.length > 50) {
    return res.status(400).json({ error: "Cannot delete more than 50 labs at once" });
  }

  // Validate lab IDs
  const invalidIds = labIds.filter(id => !Number.isInteger(id) || id <= 0);
  if (invalidIds.length > 0) {
    return res.status(400).json({ error: "All lab IDs must be positive integers" });
  }

  try {
    // Check if book exists and is a lab manual
    const bookQuery = 'SELECT id, labs FROM unilibbook WHERE id = $1 AND category = $2';
    const bookResult = await pool.query(bookQuery, [bookId, 'LabManuals']);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found or not a lab manual" });
    }

    const book = bookResult.rows[0];
    const currentLabs = book.labs || [];

    // Find labs to be deleted
    const labsToDelete = currentLabs.filter(lab => labIds.includes(lab.id));
    if (labsToDelete.length === 0) {
      return res.status(404).json({ error: "No valid labs found to delete" });
    }

    // Remove the specified labs
    const updatedLabs = currentLabs.filter(lab => !labIds.includes(lab.id));

    // Update the labs JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET labs = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedLabs), bookId]);

      await client.query('COMMIT');
      console.log(`${labsToDelete.length} labs deleted from book ${bookId} by user ${req.session.user.username}`);

      res.status(200).json({
        message: `Successfully deleted ${labsToDelete.length} item(s)`,
        deletedLabs: labsToDelete,
        deletedCount: labsToDelete.length
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in bulk delete:", error);
    res.status(500).json({ error: "Failed to delete labs. Please try again." });
  }
});

// Download lab PDF
router.get("/book/:bookId/lab/:labId/download", async (req, res) => {
  const { bookId, labId } = req.params;
  const labIdNum = parseInt(labId);

  try {
    // Fetch book details
    const bookQuery = 'SELECT * FROM unilibbook WHERE id = $1 AND category = $2';
    const bookResult = await pool.query(bookQuery, [bookId, 'LabManuals']);
    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found or not a lab manual");
    }
    const book = bookResult.rows[0];

    // Find the specific lab in the JSONB
    const labs = book.labs || [];
    const lab = labs.find(l => l.id === labIdNum);
    if (!lab) {
      return res.status(404).send("Lab not found");
    }

    // Convert Google Drive sharing links to direct download links
    let downloadUrl = book.link;
    const driveMatch = book.link.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//);
    if (driveMatch) {
      const fileId = driveMatch[1];
      downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      console.log(`Converted Google Drive link to: ${downloadUrl}`);
    }

    // Fetch the full PDF from cloud storage
    console.log(`Fetching PDF from: ${downloadUrl}`);
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(downloadUrl);

    if (!response.ok) {
      console.error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
      return res.status(500).send(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    // Check content type - accept PDF and octet-stream (Google Drive downloads)
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);

    const validContentTypes = ['application/pdf', 'application/octet-stream'];
    const isValidContentType = validContentTypes.some(type => contentType && contentType.includes(type));

    if (!isValidContentType) {
      console.error(`Invalid content type: ${contentType}`);
      return res.status(500).send(`Invalid PDF URL - received content type: ${contentType}`);
    }

    const pdfBuffer = await response.arrayBuffer();

    // Basic PDF validation - check for PDF header
    const buffer = Buffer.from(pdfBuffer);
    if (buffer.length < 4 || !buffer.slice(0, 4).equals(Buffer.from('%PDF'))) {
      console.error('Fetched content is not a valid PDF file');
      return res.status(500).send('The linked file is not a valid PDF document');
    }

    console.log(`PDF size: ${buffer.length} bytes`);

    // Extract pages using pdf-lib
    const { PDFDocument } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const newPdf = await PDFDocument.create();

    console.log(`Original PDF has ${pdfDoc.getPageCount()} pages`);
    console.log(`Extracting pages ${lab.page_start} to ${lab.page_end}`);

    for (let i = lab.page_start - 1; i < lab.page_end; i++) {
      if (i >= pdfDoc.getPageCount()) {
        console.error(`Page ${i + 1} does not exist in PDF (total pages: ${pdfDoc.getPageCount()})`);
        return res.status(400).send(`Invalid page range: page ${i + 1} does not exist in the PDF`);
      }
      const [page] = await newPdf.copyPages(pdfDoc, [i]);
      newPdf.addPage(page);
    }

    const pdfBytes = await newPdf.save();
    console.log(`Generated PDF with ${newPdf.getPageCount()} pages, size: ${pdfBytes.length} bytes`);

    // Set headers for download
    const filename = `${book.name}_Lab${lab.lab_number}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (error) {
    console.error("Error downloading lab PDF:", error);
    res.status(500).send("Internal Server Error");
  }
});

export default router;