import fetch from 'node-fetch';
import { load } from 'cheerio';
import { pool2 } from '../routes/pool.js';

const DEFAULT_BASE = 'https://tasjeel.cust.edu.pk';
const SYNC_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36';

function isLoginPageHtml(html) {
    if (!html || typeof html !== 'string') return false;
    // Look for common login page markers (forms to /web/login, CSRF token, Odoo login classes, or MS login links)
    const patterns = [
        /<form[^>]+action=["']?\/web\/login/i,
        /name=["']csrf_token["']/i,
        /class=["'][^"']*oe_login_form[^"']*["']/i,
        /Login With Microsoft/i,
        /id=["']login["'].*placeholder/i
    ];
    return patterns.some(rx => rx.test(html));
}

async function upsertSubject(courseId, subject, href) {
    const now = new Date();
    const query = `INSERT INTO subjects (course_id, subject, href, last_synced)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (course_id) DO UPDATE SET subject = EXCLUDED.subject, href = EXCLUDED.href, last_synced = EXCLUDED.last_synced
    RETURNING id`;
    const result = await pool2.query(query, [courseId, subject, href, now]);
    return result.rows[0].id;
}

async function upsertMaterials(subjectId, materials) {
    // To keep it simple: delete existing materials for subject and insert fresh ones
    const client = await pool2.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM materials WHERE subject_id = $1', [subjectId]);
        for (const m of materials) {
            await client.query(
                `INSERT INTO materials (subject_id, name, href, last_synced) VALUES ($1,$2,$3,$4)`,
                [subjectId, m.name, m.href, new Date()]
            );
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

async function fetchSubjectsPage(cookie) {
    const url = `${DEFAULT_BASE}/student/dashboard`;
    const resp = await fetch(url, { headers: { Cookie: cookie || '', 'User-Agent': SYNC_USER_AGENT } });
    if (!resp.ok) throw new Error(`Failed to fetch subjects page: ${resp.status}`);

    const text = await resp.text();
    if (isLoginPageHtml(text)) {
        // include short snippet for logs but avoid dumping full HTML
        const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
        throw new Error(`NotAuthenticated: login page returned (cookie invalid/expired). Snippet: ${snippet}`);
    }
    return text;
}

async function fetchMaterialsPage(courseId, cookie) {
    const url = `${DEFAULT_BASE}/student/course/material/${encodeURIComponent(courseId)}`;
    const resp = await fetch(url, { headers: { Cookie: cookie || '', 'User-Agent': SYNC_USER_AGENT } });
    if (!resp.ok) throw new Error(`Failed to fetch materials for ${courseId}: ${resp.status}`);

    const text = await resp.text();
    if (isLoginPageHtml(text)) {
        const snippet = text.slice(0, 200).replace(/\s+/g, ' ');
        throw new Error(`NotAuthenticated: login page returned for course ${courseId} (cookie invalid/expired). Snippet: ${snippet}`);
    }
    return text;
}

function extractSubjects(html) {
    const $ = load(html);
    const selector = '.uk-grid.uk-grid-width-small-1-12.uk-grid-width-medium-1-12.uk-grid-width-large-1-4.uk-margin-medium-bottom';
    const items = [];
    const seen = new Set();
    const pattern = /\/student\/course\/info\/[^\/\s"']+/i;

    $(selector).each((i, container) => {
        $(container).find('a[href]').each((j, el) => {
            const hrefRaw = ($(el).attr('href') || '').trim();
            const match = hrefRaw.match(pattern);
            if (match) {
                const href = match[0];
                let subject = '';
                $(el).parents().each((k, p) => {
                    const h = $(p).find('.card-header.bg-primary span').first();
                    if (h && h.length) {
                        subject = h.text().trim().replace(/\s+/g, ' ');
                        return false;
                    }
                });
                if (!subject) {
                    const prev = $(el).closest('a').prevAll().find('.card-header.bg-primary span').first();
                    if (prev && prev.length) subject = prev.text().trim().replace(/\s+/g, ' ');
                }
                if (!subject) {
                    const contHeader = $(container).find('.card-header.bg-primary span').first();
                    if (contHeader && contHeader.length) subject = contHeader.text().trim().replace(/\s+/g, ' ');
                }
                if (!seen.has(href)) {
                    seen.add(href);
                    items.push({ href, subject });
                }
            }
        });
    });

    // Fallback: search all anchors
    $('a[href]').each((i, el) => {
        const hrefRaw = ($(el).attr('href') || '').trim();
        const match = hrefRaw.match(pattern);
        if (match) {
            const href = match[0];
            if (!seen.has(href)) {
                let subject = '';
                $(el).parents().each((k, p) => {
                    const h = $(p).find('.card-header.bg-primary span').first();
                    if (h && h.length) {
                        subject = h.text().trim().replace(/\s+/g, ' ');
                        return false;
                    }
                });
                if (!subject) {
                    const parentHeader = $(el).closest('div,section,article,li').find('.card-header.bg-primary span').first();
                    if (parentHeader && parentHeader.length) subject = parentHeader.text().trim().replace(/\s+/g, ' ');
                }
                seen.add(href);
                items.push({ href, subject });
            }
        }
    });

    return items;
}

function extractMaterials(html) {
    const $ = load(html);
    const materials = [];
    const seen = new Set();
    const pattern = /\/student\/class\/material\/download\/[^\/\s"']+/i;

    $('table.uk-table.uk-table-nowrap.uk-table-align-vertical.table_tree tbody tr.table-child-row').each((i, row) => {
        const cols = $(row).find('td');
        const name = ($(cols).eq(1).text() || '').trim().replace(/\s+/g, ' ');
        let href = null;
        $(row).find('a[href]').each((j, a) => {
            const h = ($(a).attr('href') || '').trim();
            const m = h.match(pattern);
            if (m) href = m[0];
        });
        if (href && !seen.has(href)) {
            seen.add(href);
            materials.push({ name, href });
        }
    });

    if (materials.length === 0) {
        $('a[href]').each((i, a) => {
            const h = ($(a).attr('href') || '').trim();
            const m = h.match(pattern);
            if (m && !seen.has(m[0])) {
                seen.add(m[0]);
                const parentRow = $(a).closest('tr');
                const name = (parentRow.find('td').eq(1).text() || '').trim().replace(/\s+/g, ' ');
                materials.push({ name, href: m[0] });
            }
        });
    }

    return materials;
}

export async function syncTasjeel(cookie) {
    // cookie: optional cookie string to use for authenticated requests
    console.log('Starting tasjeel sync...');
    try {

        const html = await fetchSubjectsPage(cookie);
        const subs = extractSubjects(html);

        for (const s of subs) {
            const courseId = (s.href || '').split('/').pop();
            if (!courseId) continue;
            const href = s.href;

            const subjectId = await upsertSubject(courseId, s.subject || courseId, href);

            // fetch materials page per subject
            try {
                const mhtml = await fetchMaterialsPage(courseId, cookie);
                const materials = extractMaterials(mhtml);
                await upsertMaterials(subjectId, materials);
            } catch (err) {
                // Propagate authentication errors immediately so sync stops and returns a clear message
                if (/NotAuthenticated/i.test(err.message)) {
                    console.error(`Authentication error while fetching materials for ${courseId}:`, err.message);
                    throw err;
                }
                console.error(`Failed to fetch materials for ${courseId}:`, err.message);
            }
        }

        console.log('Tasjeel sync completed. Subjects:', subs.length);
        return { success: true, count: subs.length };
    } catch (err) {
        if (/NotAuthenticated/i.test(err.message)) {
            console.error('Tasjeel sync failed due to authentication:', err.message);
            return { success: false, error: 'NotAuthenticated', message: 'Tasjeel returned a login/consent page — cookie is invalid or expired.' };
        }
        console.error('Tasjeel sync failed:', err.message);
        return { success: false, error: err.message };
    }
}


// returns the latest session string from the custlogin table (pure helper - does not send a response)
export async function getLatestSession() {
  try {
    // Prefer the row with id = 1; if it doesn't exist, fallback to the most-recent row
    const primaryQuery = `SELECT session FROM custlogin WHERE id = 1`;
    let result = await pool2.query(primaryQuery);

    if (!result || !result.rows || result.rows.length === 0) {
      // No id=1 row found, select the latest row instead
      const fallbackQuery = `SELECT session FROM custlogin ORDER BY id DESC LIMIT 1`;
      result = await pool2.query(fallbackQuery);
    }

    const session = result.rows[0]?.session || '';
    console.log("Fetched latest session from DB:", session);
    return session;
  } catch (error) {
    console.error("Error fetching session from DB:", error);
  }
}


export default syncTasjeel;
