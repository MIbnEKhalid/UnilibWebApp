-- Unilib Neon PostgreSQL Schema
-- Resources are cataloged by course_code (courses are configured via src/config/courses.json)

CREATE TABLE IF NOT EXISTS unilib_resources (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(32) NOT NULL, -- e.g. 'CPE2123', 'CPE2323'
    type VARCHAR(32) NOT NULL,        -- 'textbook', 'lab_manual', 'quiz_assignment', 'solution'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_key TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(128),
    parent_resource_id INTEGER REFERENCES unilib_resources(id) ON DELETE SET NULL,
    drive_url TEXT,
    sections JSONB,
    is_visible BOOLEAN NOT NULL DEFAULT TRUE,
    views_count INTEGER NOT NULL DEFAULT 0,
    uploader_id VARCHAR(128) DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_code ON unilib_resources(course_code);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_type ON unilib_resources(course_code, type);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_parent ON unilib_resources(parent_resource_id);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_sections ON unilib_resources USING GIN (sections);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_visible ON unilib_resources(is_visible);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_created_at ON unilib_resources(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_course_created ON unilib_resources(course_code, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilib_resources_upper_course ON unilib_resources(UPPER(course_code));
CREATE INDEX IF NOT EXISTS idx_unilib_resources_upper_course_type ON unilib_resources(UPPER(course_code), type);
