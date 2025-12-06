import express from "express";
import dotenv from "dotenv";
import { validateSessionAndRole } from "mbkauthe";
import { renderError } from "mbkauthe";
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

  if (semester && semester !== 'all') {
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
  await renderUnilibBooks(req, res, "mainPages/index.handlebars", { isLoggedIn });
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
    res.render("mainPages/BookForm.handlebars", { layout: "main", isEdit: true, id: bookId, book, role: req.session.user.role });
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
  // Render unified BookForm for adding, with empty/default book data and isEdit=false
  res.render("mainPages/BookForm.handlebars", {
    layout: "main",
    isEdit: false,
    book: null,
    role: req.session.user.role
  });
});

router.post("/api/admin/Unilib/Book/Add", validateSessionAndRole("Any"), async (req, res) => {
  const { name, category, description, imageURL, link, semester, main } = req.body;

  try {
    const query = `
      INSERT INTO "unilibbook" (name, category, description, "imageURL", link, semester, main, "UserName")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8);
    `;
    const values = [name, category, description, imageURL, link, semester, main, req.session.user.username];

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
      sections: result.rows.map(book => ({ bookId: book.id, sections: book.sections || [] }))
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
      return renderError(res, {
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

    // Get sections for all books
    let sections = book.sections || [];

    return res.render("mainPages/index.handlebars", {
      isLoggedIn,
      books: [book], // Single book as array for consistency
      singleBookView: true,
      bookId: bookId,
      sections: sections,
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

// Sections management routes
router.get("/dashboard/Book/:bookId/Sections", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.bookId;
  try {
    const bookQuery = 'SELECT * FROM unilibbook WHERE id = $1';
    const bookResult = await pool.query(bookQuery, [bookId]);
    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }
    const book = bookResult.rows[0];
    const sections = book.sections || [];

    res.render("mainPages/Sections.handlebars", {layout: "main", book, sections, role: req.session.user.role });
  } catch (error) {
    console.error("Error fetching sections:", error);
    res.status(500).send("Internal Server Error");
  }
});

router.post("/api/admin/Book/:bookId/Section/Add", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.bookId;
  const { page_start, page_end, name } = req.body;

  // Input validation
  if (!page_start || !page_end || !name) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!Number.isInteger(page_start) || page_start < 1) {
    return res.status(400).json({ error: "Start page must be a positive integer" });
  }

  if (!Number.isInteger(page_end) || page_end < 1) {
    return res.status(400).json({ error: "End page must be a positive integer" });
  }

  if (page_start > page_end) {
    return res.status(400).json({ error: "Start page cannot be greater than end page" });
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    return res.status(400).json({ error: "Section name must be a non-empty string with maximum 200 characters" });
  }

  try {
    // Check if book exists
    const bookQuery = 'SELECT id, sections FROM unilibbook WHERE id = $1';
    const bookResult = await pool.query(bookQuery, [bookId]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const book = bookResult.rows[0];
    const currentSections = book.sections || [];

    // Auto-increment section number - find the highest section_number and add 1
    const maxSectionNumber = currentSections.length > 0 
      ? Math.max(...currentSections.map(s => s.section_number))
      : 0;
    const section_number = maxSectionNumber + 1;

    // Generate unique ID (using timestamp + random for better uniqueness)
    const newSectionId = Date.now() + Math.floor(Math.random() * 1000);
    const newSection = {
      id: newSectionId,
      section_number: section_number,
      page_start: page_start,
      page_end: page_end,
      name: name.trim(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const updatedSections = [...currentSections, newSection];

    // Update the sections JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET sections = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedSections), bookId]);

      await client.query('COMMIT');
      console.log(`Section ${section_number} added to book ${bookId} by user ${req.session.user.username}`);

      res.status(201).json({
        message: `Section added successfully!`,
        section: newSection
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error adding section:", error);
    res.status(500).json({ error: "Failed to add section. Please try again." });
  }
});

router.post("/api/admin/Section/Edit/:sectionId", validateSessionAndRole("Any"), async (req, res) => {
  const sectionId = parseInt(req.params.sectionId);
  const { section_number, page_start, page_end, name } = req.body;

  if (!sectionId || isNaN(sectionId)) {
    return res.status(400).json({ error: "Invalid section ID" });
  }

  if (!section_number || !Number.isInteger(section_number) || section_number < 1) {
    return res.status(400).json({ error: "Section number must be a positive integer" });
  }

  if (!page_start || !Number.isInteger(page_start) || page_start < 1) {
    return res.status(400).json({ error: "Start page must be a positive integer" });
  }

  if (!page_end || !Number.isInteger(page_end) || page_end < 1) {
    return res.status(400).json({ error: "End page must be a positive integer" });
  }

  if (page_start > page_end) {
    return res.status(400).json({ error: "Start page cannot be greater than end page" });
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.length > 200) {
    return res.status(400).json({ error: "Section name must be a non-empty string with maximum 200 characters" });
  }

  try {
    // Find the book that contains this section
    const findBookQuery = "SELECT id, sections FROM unilibbook WHERE sections @> $1";
    const findBookResult = await pool.query(findBookQuery, [JSON.stringify([{ id: sectionId }])]);

    if (findBookResult.rows.length === 0) {
      return res.status(404).json({ error: "Section not found" });
    }

    const book = findBookResult.rows[0];
    const currentSections = book.sections || [];

    // Check for duplicate section numbers (excluding current section)
    const duplicateSection = currentSections.find(section => section.section_number === section_number && section.id !== sectionId);
    if (duplicateSection) {
      return res.status(409).json({ error: `Section number ${section_number} already exists in this book` });
    }

    // Update the specific section
    const updatedSections = currentSections.map(section =>
      section.id === sectionId
        ? {
            ...section,
            section_number: section_number,
            page_start: page_start,
            page_end: page_end,
            name: name.trim(),
            updated_at: new Date().toISOString()
          }
        : section
    );

    // Update the sections JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET sections = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedSections), book.id]);

      await client.query('COMMIT');
      console.log(`Section ${sectionId} updated in book ${book.id} by user ${req.session.user.username}`);

      res.status(200).json({
        message: `Section updated successfully!`,
        section: updatedSections.find(section => section.id === sectionId)
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error updating section:", error);
    res.status(500).json({ error: "Failed to update section. Please try again." });
  }
});

router.post("/api/admin/Section/Delete/:sectionId", validateSessionAndRole("Any"), async (req, res) => {
  const sectionId = parseInt(req.params.sectionId);

  if (!sectionId || isNaN(sectionId)) {
    return res.status(400).json({ error: "Invalid section ID" });
  }

  try {
    // Find the book that contains this section
    const findBookQuery = "SELECT id, sections FROM unilibbook WHERE sections @> $1";
    const findBookResult = await pool.query(findBookQuery, [JSON.stringify([{ id: sectionId }])]);

    if (findBookResult.rows.length === 0) {
      return res.status(404).json({ error: "Section not found" });
    }

    const book = findBookResult.rows[0];
    const currentSections = book.sections || [];

    // Find the section to be deleted
    const sectionToDelete = currentSections.find(section => section.id === sectionId);
    if (!sectionToDelete) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Remove the specific section
    const updatedSections = currentSections.filter(section => section.id !== sectionId);

    // Update the sections JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET sections = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedSections), book.id]);

      await client.query('COMMIT');
      console.log(`Section ${sectionId} (Section ${sectionToDelete.section_number}: ${sectionToDelete.name}) deleted from book ${book.id} by user ${req.session.user.username}`);

      res.status(200).json({
        message: `Section deleted successfully!`,
        deletedSection: sectionToDelete
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error deleting section:", error);
    res.status(500).json({ error: "Failed to delete section. Please try again." });
  }
});

router.post("/api/admin/Book/:bookId/Sections/BulkDelete", validateSessionAndRole("Any"), async (req, res) => {
  const bookId = req.params.bookId;
  const { sectionIds } = req.body;

  // Input validation
  if (!Array.isArray(sectionIds) || sectionIds.length === 0) {
    return res.status(400).json({ error: "sectionIds must be a non-empty array" });
  }

  if (sectionIds.length > 50) {
    return res.status(400).json({ error: "Cannot delete more than 50 sections at once" });
  }

  // Validate section IDs
  const invalidIds = sectionIds.filter(id => !Number.isInteger(id) || id <= 0);
  if (invalidIds.length > 0) {
    return res.status(400).json({ error: "All section IDs must be positive integers" });
  }

  try {
    // Check if book exists
    const bookQuery = 'SELECT id, sections FROM unilibbook WHERE id = $1';
    const bookResult = await pool.query(bookQuery, [bookId]);
    if (bookResult.rows.length === 0) {
      return res.status(404).json({ error: "Book not found" });
    }

    const book = bookResult.rows[0];
    const currentSections = book.sections || [];

    // Find sections to be deleted
    const sectionsToDelete = currentSections.filter(section => sectionIds.includes(section.id));
    if (sectionsToDelete.length === 0) {
      return res.status(404).json({ error: "No valid sections found to delete" });
    }

    // Remove the specified sections
    const updatedSections = currentSections.filter(section => !sectionIds.includes(section.id));

    // Update the sections JSONB with transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updateQuery = 'UPDATE unilibbook SET sections = $1 WHERE id = $2';
      await client.query(updateQuery, [JSON.stringify(updatedSections), bookId]);

      await client.query('COMMIT');
      console.log(`${sectionsToDelete.length} sections deleted from book ${bookId} by user ${req.session.user.username}`);

      res.status(200).json({
        message: `Successfully deleted ${sectionsToDelete.length} section(s)`,
        deletedSections: sectionsToDelete,
        deletedCount: sectionsToDelete.length
      });
    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error in bulk delete:", error);
    res.status(500).json({ error: "Failed to delete sections. Please try again." });
  }
});

// Download section PDF
router.get("/book/:bookId/section/:sectionId/download", async (req, res) => {
  const { bookId, sectionId } = req.params;
  const sectionIdNum = parseInt(sectionId);

  try {
    // Fetch book details
    const bookQuery = 'SELECT * FROM unilibbook WHERE id = $1';
    const bookResult = await pool.query(bookQuery, [bookId]);

    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }
    const book = bookResult.rows[0];

    // Find the specific section in the JSONB
    const sections = book.sections || [];
    const section = sections.find(s => s.id === sectionIdNum);
    if (!section) {
      return res.status(404).send("Section not found");
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

    // Check content type
    const contentType = response.headers.get('content-type');
    const validContentTypes = ['application/pdf', 'application/octet-stream'];
    const isValidContentType = validContentTypes.some(type => contentType && contentType.includes(type));

    if (!isValidContentType) {
      console.error(`Invalid content type: ${contentType}`);
      return res.status(500).send(`Invalid PDF URL - received content type: ${contentType}`);
    }

    // Stream and extract section pages
    // Set the response headers for the PDF file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${book.name}_${section.name}.pdf"`);

    // Stream the PDF response data through pdf-lib for page extraction
    const pdfData = await response.arrayBuffer();
    const pdfjsLib = await import('pdf-lib');
    const { PDFDocument } = pdfjsLib;

    try {
      const originalDoc = await PDFDocument.load(pdfData);
      const newDoc = await PDFDocument.create();

      // Copy the pages from start_page to end_page
      const pages = await newDoc.copyPages(originalDoc, 
        Array.from({ length: section.page_end - section.page_start + 1 }, 
          (_, i) => section.page_start - 1 + i)
      );
      pages.forEach(page => newDoc.addPage(page));

      // Save the extracted pages as a new PDF
      const extractedPdfBytes = await newDoc.save();
      res.send(Buffer.from(extractedPdfBytes));

    } catch (error) {
      console.error('Error processing PDF:', error);
      return res.status(500).send('Error processing PDF file');
    }

  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;