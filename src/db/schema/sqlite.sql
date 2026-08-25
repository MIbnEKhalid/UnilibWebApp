-- SQLite Schema for UnilibWebApp

CREATE TABLE IF NOT EXISTS unilibbook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  UserName TEXT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  imageURL TEXT NOT NULL DEFAULT 'BookCover_Template.webp',
  link TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT '["Semester 3"]',
  main INTEGER NOT NULL DEFAULT 0,
  visible INTEGER NOT NULL DEFAULT 1,
  views INTEGER NOT NULL DEFAULT 0,
  sections TEXT DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_unilibbook_category ON unilibbook(category);
CREATE INDEX IF NOT EXISTS idx_unilibbook_main ON unilibbook(main);
CREATE INDEX IF NOT EXISTS idx_unilibbook_visible ON unilibbook(visible);
CREATE INDEX IF NOT EXISTS idx_unilibbook_category_main ON unilibbook(category, main);
CREATE INDEX IF NOT EXISTS idx_unilibbook_visible_category ON unilibbook(visible, category);
CREATE INDEX IF NOT EXISTS idx_unilibbook_created_at ON unilibbook(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_unilibbook_views ON unilibbook(views DESC);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT UNIQUE NOT NULL,
  subject TEXT NOT NULL,
  href TEXT NOT NULL,
  semester TEXT NOT NULL DEFAULT 'Semester 1',
  last_synced TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subjects_course_id ON subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_subjects_semester ON subjects(semester);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  href TEXT NOT NULL,
  last_synced TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_materials_subject_id ON materials(subject_id);

CREATE TABLE IF NOT EXISTS custlogin (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session TEXT,
  last_synced TEXT DEFAULT CURRENT_TIMESTAMP
);
