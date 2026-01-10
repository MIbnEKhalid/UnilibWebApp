import express from 'express';
import {pool} from './pool.js';
import fetch from 'node-fetch';

const router = express.Router();

// Stream PDF from Google Drive
router.get('/:bookId/:filename', async (req, res) => {
    const { bookId, filename } = req.params;

    try {
        // Fetch book details from database
        // For PDF access, only allow visible books unless user is authenticated admin
        const isAdmin = req.session && req.session.user;
        const visibilityCheck = isAdmin ? '' : ' AND visible = true';
        const bookQuery = `SELECT id, name, link, visible FROM unilibbook WHERE id = $1${visibilityCheck}`;
        const bookResult = await pool.query(bookQuery, [bookId]);

        if (bookResult.rows.length === 0) {
            return res.status(404).send('Book not found');
        }

        const book = bookResult.rows[0];

        // Convert Google Drive sharing link to direct download link
        let downloadUrl = book.link;
        const driveMatch = book.link.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\//);
        if (driveMatch) {
            const fileId = driveMatch[1];
            downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
        }

        // Fetch the PDF
        console.log(`Streaming PDF from: ${downloadUrl}`);
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

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

        // Stream the response
        response.body.pipe(res);
    } catch (error) {
        console.error('Error streaming PDF:', error);
        res.status(500).send('Internal Server Error');
    }
});

export default router;