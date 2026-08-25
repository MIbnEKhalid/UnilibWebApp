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

CREATE TABLE IF NOT EXISTS unilibbook (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  UserName TEXT,
  name TEXT NOT NULL,
  category bookcategories NOT NULL,
  description TEXT,
  imageURL TEXT NOT NULL DEFAULT 'BookCover_Template.webp',
  link TEXT NOT NULL,
  semester semesters[] NOT NULL DEFAULT ARRAY['Semester 3']::semesters[],
  main BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  views INTEGER NOT NULL DEFAULT 0,
  sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilibbook_category ON unilibbook(category);
CREATE INDEX IF NOT EXISTS idx_unilibbook_main ON unilibbook(main);
CREATE INDEX IF NOT EXISTS idx_unilibbook_visible ON unilibbook(visible);
CREATE INDEX IF NOT EXISTS idx_unilibbook_category_main ON unilibbook(category, main);
CREATE INDEX IF NOT EXISTS idx_unilibbook_visible_category ON unilibbook(visible, category);
CREATE INDEX IF NOT EXISTS idx_unilibbook_created_at ON unilibbook(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilibbook_views ON unilibbook(views DESC);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  course_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  href TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Semester 1',
  last_synced TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester);

CREATE TABLE IF NOT EXISTS materials (
  id SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  href TEXT NOT NULL,
  last_synced TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON materials(subject_id);

CREATE TABLE IF NOT EXISTS custlogin (
  id SERIAL PRIMARY KEY,
  session TEXT,
  last_synced TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
