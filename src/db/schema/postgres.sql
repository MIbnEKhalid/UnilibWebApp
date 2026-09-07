-- PostgreSQL Schema for UnilibWebApp

DO $$ BEGIN
  CREATE TYPE semesters AS ENUM (
    'Semester 1',
    'Semester 2',
    'Semester 3',
    'Semester 4',
    'Semester 5',
    'Semester 6',
    'Semester 7',
    'Semester 8'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE bookcategories AS ENUM (
    'All',
    'CourseBooks',
    'Softwares',
    'LabManuals',
    'Other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS unilib_books (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  username character varying(50),
  name TEXT NOT NULL,
  category bookcategories NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL DEFAULT 'BookCover_Template.webp',
  link TEXT NOT NULL,
  semester semesters[] NOT NULL DEFAULT ARRAY['Semester 3']::semesters[],
  main BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  views INTEGER NOT NULL DEFAULT 0,
  sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilib_books_category ON unilib_books(category);
CREATE INDEX IF NOT EXISTS idx_unilib_books_main ON unilib_books(main);
CREATE INDEX IF NOT EXISTS idx_unilib_books_visible ON unilib_books(visible);
CREATE INDEX IF NOT EXISTS idx_unilib_books_category_main ON unilib_books(category, main);
CREATE INDEX IF NOT EXISTS idx_unilib_books_visible_category ON unilib_books(visible, category);
CREATE INDEX IF NOT EXISTS idx_unilib_books_created_at ON unilib_books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilib_books_views ON unilib_books(views DESC);

CREATE TABLE IF NOT EXISTS unilib_subjects (
  id SERIAL PRIMARY KEY,
  course_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  href TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Semester 1',
  last_synced TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilib_subjects_course_id ON unilib_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_unilib_subjects_semester ON unilib_subjects(semester);

CREATE TABLE IF NOT EXISTS unilib_materials (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES unilib_subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  href TEXT NOT NULL,
  last_synced TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilib_materials_subject_id ON unilib_materials(subject_id);

CREATE TABLE IF NOT EXISTS unilib_custlogin (
  id SERIAL PRIMARY KEY,
  session TEXT,
  last_synced TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
