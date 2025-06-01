CREATE TABLE unilibbook (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name Text NOT NULL,
  category Text NOT NULL,
  description TEXT,
  imageURL Text NOT NULL DEFAULT 'BookCover_Template.png',
  link TEXT NOT NULL,
  semester semesters NOT NULL,
  main BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_unilibbook_category ON unilibbook(category);
CREATE INDEX idx_unilibbook_semester ON unilibbook(semester);
CREATE INDEX idx_unilibbook_main ON unilibbook(main);