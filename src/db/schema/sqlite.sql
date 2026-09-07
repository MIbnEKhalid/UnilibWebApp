-- SQLite Schema for UnilibWebApp

CREATE TABLE IF NOT EXISTS unilib_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL DEFAULT 'BookCover_Template.webp',
  link TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT '["Semester 3"]',
  main INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  views INTEGER NOT NULL DEFAULT 0,
  sections TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilib_books_category ON unilib_books(category);
CREATE INDEX IF NOT EXISTS idx_unilib_books_main ON unilib_books(main);
CREATE INDEX IF NOT EXISTS idx_unilib_books_visible ON unilib_books(visible);
CREATE INDEX IF NOT EXISTS idx_unilib_books_category_main ON unilib_books(category, main);
CREATE INDEX IF NOT EXISTS idx_unilib_books_visible_category ON unilib_books(visible, category);
CREATE INDEX IF NOT EXISTS idx_unilib_books_created_at ON unilib_books(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilib_books_views ON unilib_books(views DESC);

CREATE TABLE IF NOT EXISTS unilib_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  href TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Semester 1',
  last_synced TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilib_subjects_course_id ON unilib_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_unilib_subjects_semester ON unilib_subjects(semester);

CREATE TABLE IF NOT EXISTS unilib_materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  href TEXT NOT NULL,
  last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES unilib_subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_unilib_materials_subject_id ON unilib_materials(subject_id);

CREATE TABLE IF NOT EXISTS unilib_custlogin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT,
  last_synced TEXT DEFAULT CURRENT_TIMESTAMP
);
