-- Unilib SQLite Schema
-- Resources are cataloged by course_code (courses are configured via src/config/courses.json)

CREATE TABLE IF NOT EXISTS unilib_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code TEXT NOT NULL, -- e.g. 'CPE2123', 'CPE2323'
    type TEXT NOT NULL,        -- 'textbook', 'lab_manual', 'quiz_assignment', 'solution'
    title TEXT NOT NULL,
    description TEXT,
    file_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    mime_type TEXT,
    parent_resource_id INTEGER REFERENCES unilib_resources(id) ON DELETE SET NULL,
    drive_url TEXT,
    sections TEXT,
    is_visible INTEGER NOT NULL DEFAULT 1,
    views_count INTEGER NOT NULL DEFAULT 0,
    uploader_id TEXT DEFAULT 'admin',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_code ON unilib_resources(course_code);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_type ON unilib_resources(course_code, type);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_parent ON unilib_resources(parent_resource_id);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_visible ON unilib_resources(is_visible);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_created_at ON unilib_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_created ON unilib_resources(course_code, created_at DESC);
