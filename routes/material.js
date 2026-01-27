import express from "express";
import dotenv from "dotenv";
import { validateSessionAndRole, renderError, renderPage } from "mbkauthe";
import { pool, pool2 } from "./pool.js";
import { syncTasjeel, getLatestSession } from '../tool/syncTasjeel.js';

dotenv.config();
const router = express.Router();

router.get('/api/get/all/subjects', validateSessionAndRole("SuperAdmin"), async (req, res) => {
  try {
    const query = `SELECT course_id, subject, href FROM subjects ORDER BY subject ASC`;
    const result = await pool2.query(query);
    const links = result.rows.map(r => ({ href: r.href, subject: r.subject }));
    return res.json({ success: true, links });
  } catch (err) {
    console.error('Error querying subjects from DB:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch subjects from DB', error: err.message });
  }
});

// Aggregated material counts for all subjects (single request)
router.get('/api/get/all/materials-counts', validateSessionAndRole("SuperAdmin"), async (_req, res) => {
  try {
    const countsQuery = `
      SELECT s.course_id AS course_id, COUNT(m.*) AS count
      FROM subjects s
      LEFT JOIN materials m ON m.subject_id = s.id
      GROUP BY s.course_id
    `;
    const result = await pool2.query(countsQuery);
    const counts = {};
    result.rows.forEach(r => {
      counts[r.course_id] = parseInt(r.count, 10);
    });
    return res.json({ success: true, counts });
  } catch (err) {
    console.error('Error querying material counts from DB:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch material counts', error: err.message });
  }
});

// Per-subject materials (kept for loading actual file lists on demand)
router.get('/api/get/all/materials/:id', validateSessionAndRole("SuperAdmin"), async (req, res) => {
  const courseId = req.params.id;

  try {
    // find subject id
    const s = await pool2.query('SELECT id, course_id FROM subjects WHERE course_id = $1', [courseId]);
    if (s.rows.length === 0) return res.json({ success: true, materials: [] });
    const subjectId = s.rows[0].id;

    const m = await pool2.query('SELECT name, href FROM materials WHERE subject_id = $1 ORDER BY name ASC', [subjectId]);
    return res.json({ success: true, materials: m.rows });
  } catch (err) {
    console.error('Error querying materials from DB:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch materials from DB', error: err.message });
  }
});

// Proxy route for downloading materials from tasjeel
router.get('/student/class/material/download/:id', validateSessionAndRole("SuperAdmin"), async (req, res) => {
  try {
    const id = req.params.id;
    const url = `https://tasjeel.cust.edu.pk/student/class/material/download/${id}`;
    const cookie = `session_id=${(await getLatestSession())}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: { Cookie: cookie },
      redirect: 'follow'
    });

    if (!upstream.ok) {
      const body = await upstream.text().catch(() => '');
      return res.status(upstream.status).send(body || 'Download failed');
    }

    const contentType = upstream.headers.get('content-type');
    const contentDisposition = upstream.headers.get('content-disposition');
    if (contentType) res.setHeader('content-type', contentType);
    if (contentDisposition) res.setHeader('content-disposition', contentDisposition);

    // Stream the upstream body to the client
    if (upstream.body && typeof upstream.body.pipe === 'function') {
      upstream.body.pipe(res);
    } else {
      const buffer = Buffer.from(await upstream.arrayBuffer());
      res.end(buffer);
    }

  } catch (err) {
    console.error('Download proxy error:', err);
    res.status(500).json({ success: false, message: 'Download failed', error: err.message });
  }
});

// Page showing all subjects and their materials
router.get('/materials', validateSessionAndRole("SuperAdmin"), async (req, res) => {
  try {
    const result = await pool2.query('SELECT course_id, subject, href FROM subjects ORDER BY subject ASC');
    const subjects = result.rows.map(r => ({ href: r.href, subject: r.subject, courseId: r.course_id }));
    renderPage(req, res, "mainPages/subjects.handlebars", true, { page: "Subjects & Materials", subjects });
  } catch (err) {
    console.error('Error building subjects page from DB:', err);
    renderPage(req, res, "mainPages/subjects.handlebars", true, { page: "Subjects & Materials", subjects: [], error: err.message });
  }
});

// Manual sync endpoint (protected)
router.get('/api/admin/sync/tasjeel', validateSessionAndRole("SuperAdmin"), async (req, res) => {
  try {
    const cookie = `session_id=${(await getLatestSession())}`;
    const result = await syncTasjeel(cookie);
    return res.json(result);
  } catch (err) {
    console.error('Manual sync failed:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;