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

CREATE TYPE bookcategories AS ENUM (
  'All',
  'CourseBooks',
  'Softwares',
  'LabManuals',
  'Other'
);

CREATE TABLE unilibbook (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  UserName Text,
  name Text NOT NULL,
  category bookcategories NOT NULL,
  description TEXT,
  imageURL Text NOT NULL DEFAULT 'BookCover_Template.webp',
  link TEXT NOT NULL,
  semester semesters NOT NULL,
  main BOOLEAN NOT NULL DEFAULT FALSE,
  visible BOOLEAN NOT NULL DEFAULT TRUE,
  sections JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Comment describing the sections JSONB structure
/*
unilibbook.sections structure:
[
  {
    "id": number,           -- Unique identifier for the section
    "section_number": number, -- Order of the section in the book
    "name": string,         -- Name of the section
    "page_start": number,   -- Starting page number
    "page_end": number,     -- Ending page number
    "created_at": string,   -- ISO timestamp
    "updated_at": string    -- ISO timestamp
  }
]
*/

-- Indexes for unilibbook table
CREATE INDEX idx_unilibbook_category ON unilibbook(category);
CREATE INDEX idx_unilibbook_semester ON unilibbook(semester);
CREATE INDEX idx_unilibbook_main ON unilibbook(main);
CREATE INDEX idx_unilibbook_visible ON unilibbook(visible);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_unilibbook_semester_category_main
ON unilibbook(semester, category, main);

-- Composite index including visibility for admin queries
CREATE INDEX IF NOT EXISTS idx_unilibbook_visible_semester_category
ON unilibbook(visible, semester, category);

-- Trigram extension for text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Text search index for book names
CREATE INDEX IF NOT EXISTS idx_unilibbook_name_trgm
ON unilibbook USING gin(name gin_trgm_ops);

-- Optimized indexes for JSONB sections
CREATE INDEX IF NOT EXISTS idx_unilibbook_sections
ON unilibbook USING gin(sections jsonb_path_ops);

-- Index for searching by section number
CREATE INDEX IF NOT EXISTS idx_unilibbook_section_numbers 
ON unilibbook USING gin((sections->>'section_number'));

-- Index for text search within section names
CREATE INDEX IF NOT EXISTS idx_unilibbook_section_names
ON unilibbook USING gin((sections->>'name') gin_trgm_ops);

-- Partial index for books with sections
CREATE INDEX IF NOT EXISTS idx_unilibbook_has_sections
ON unilibbook((jsonb_array_length(sections) > 0)) WHERE jsonb_array_length(sections) > 0;

-- Index for sorting by creation date
CREATE INDEX idx_unilibbook_created_at ON unilibbook(created_at DESC);

-- Partial index for main books
CREATE INDEX idx_unilibbook_main_partial ON unilibbook(main) WHERE main = TRUE;
    (sections->>'page_start')::integer as page_start,
    (sections->>'page_end')::integer as page_end,
    COALESCE((sections->>'created_at')::timestamptz, CURRENT_TIMESTAMP) as created_at,
    COALESCE((sections->>'updated_at')::timestamptz, CURRENT_TIMESTAMP) as updated_at
  FROM unilibbook,
  jsonb_array_elements(sections) as sections
  WHERE jsonb_array_length(sections) > 0;
END;
$$ LANGUAGE plpgsql;