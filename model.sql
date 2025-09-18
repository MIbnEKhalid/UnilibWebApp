CREATE TABLE unilibbook (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  UserName Text,
  name Text NOT NULL,
  category Text NOT NULL,
  description TEXT,
  imageURL Text NOT NULL DEFAULT 'BookCover_Template.png',
  link TEXT NOT NULL,
  semester semesters NOT NULL,
  main BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

CREATE INDEX idx_unilibbook_category ON unilibbook(category);
CREATE INDEX idx_unilibbook_semester ON unilibbook(semester);
CREATE INDEX idx_unilibbook_main ON unilibbook(main);

CREATE INDEX IF NOT EXISTS idx_unilibbook_semester_category_main
ON unilibbook(semester, category, main);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_unilibbook_name_trgm
ON unilibbook USING gin(name gin_trgm_ops);