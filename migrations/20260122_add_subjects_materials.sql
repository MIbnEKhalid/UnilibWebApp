-- Migration: Add subjects and materials tables

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  course_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  href TEXT,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT,
  href TEXT UNIQUE NOT NULL,
  last_synced TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON materials(subject_id);
