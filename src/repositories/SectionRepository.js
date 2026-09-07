import { randomUUID } from "crypto";
import { BaseRepository } from "mbkauthe";
import { normalizeBook, normalizeSections, serializeSections } from "../utils/normalizers.js";

export class SectionRepository extends BaseRepository {
  async getSectionsByBookId(bookId) {
    const query = "SELECT id, sections, name, link FROM unilib_books WHERE id = $1";
    const result = await this.query(query, [bookId]);
    if (!result.rows || result.rows.length === 0) return null;
    const book = result.rows[0];
    return {
      book: normalizeBook(book),
      sections: normalizeSections(book.sections),
    };
  }

  async findBookBySectionId(sectionId) {
    const parsedSectionId = /^\d+$/.test(sectionId) ? Number(sectionId) : sectionId;
    let query;
    let param;

    if (this.dialect.name === "sqlite") {
      query = `
        SELECT id, sections, name
        FROM unilib_books
        WHERE EXISTS (
          SELECT 1 FROM json_each(unilib_books.sections)
          WHERE json_extract(value, '$.id') = $1 OR CAST(json_extract(value, '$.id') AS TEXT) = $1
        )
      `;
      param = String(sectionId);
    } else {
      query = "SELECT id, sections, name FROM unilib_books WHERE sections @> $1::jsonb";
      param = JSON.stringify([{ id: parsedSectionId }]);
    }

    const result = await this.query(query, [param]);
    if (!result.rows || result.rows.length === 0) return null;
    const book = result.rows[0];
    return {
      book: normalizeBook(book),
      sections: normalizeSections(book.sections),
    };
  }

  async addSection(bookId, { page_start, page_end, name, username }) {
    return this.withTransaction(async (tx) => {
      const bookResult = await tx.query("SELECT id, sections FROM unilib_books WHERE id = $1", [bookId]);
      if (!bookResult.rows || bookResult.rows.length === 0) {
        throw new Error("BOOK_NOT_FOUND");
      }

      const book = bookResult.rows[0];
      const currentSections = normalizeSections(book.sections);
      const maxSectionNumber =
        currentSections.length > 0
          ? Math.max(...currentSections.map((s) => Number(s.section_number) || 0))
          : 0;
      const section_number = maxSectionNumber + 1;

      const newSection = {
        id: randomUUID(),
        section_number: section_number,
        page_start: Number(page_start),
        page_end: Number(page_end),
        name: name.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const updatedSections = [...currentSections, newSection];
      const sectionsVal = serializeSections(updatedSections);

      const updateQuery =
        this.dialect.name === "sqlite"
          ? "UPDATE unilib_books SET sections = $1 WHERE id = $2"
          : "UPDATE unilib_books SET sections = $1::jsonb WHERE id = $2";

      await tx.query(updateQuery, [sectionsVal, bookId]);
      return { newSection, bookId };
    });
  }

  async updateSection(sectionId, { section_number, page_start, page_end, name, username }) {
    return this.withTransaction(async (tx) => {
      const found = await tx.findBookBySectionId(sectionId);
      if (!found) {
        throw new Error("SECTION_NOT_FOUND");
      }

      const { book, sections: currentSections } = found;

      const duplicateSection = currentSections.find(
        (section) =>
          Number(section.section_number) === Number(section_number) &&
          String(section.id) !== String(sectionId)
      );
      if (duplicateSection) {
        const err = new Error(`Section number ${section_number} already exists in this book`);
        err.code = "DUPLICATE_SECTION_NUMBER";
        throw err;
      }

      const updatedSections = currentSections.map((section) =>
        String(section.id) === String(sectionId)
          ? {
              ...section,
              section_number: Number(section_number),
              page_start: Number(page_start),
              page_end: Number(page_end),
              name: name.trim(),
              updated_at: new Date().toISOString(),
            }
          : section
      );

      const sectionsVal = serializeSections(updatedSections);
      const updateQuery =
        this.dialect.name === "sqlite"
          ? "UPDATE unilib_books SET sections = $1 WHERE id = $2"
          : "UPDATE unilib_books SET sections = $1::jsonb WHERE id = $2";

      await tx.query(updateQuery, [sectionsVal, book.id]);
      const updatedSection = updatedSections.find((s) => String(s.id) === String(sectionId));
      return { updatedSection, bookId: book.id };
    });
  }

  async deleteSection(sectionId, { username } = {}) {
    return this.withTransaction(async (tx) => {
      const found = await tx.findBookBySectionId(sectionId);
      if (!found) {
        throw new Error("SECTION_NOT_FOUND");
      }

      const { book, sections: currentSections } = found;
      const sectionToDelete = currentSections.find((section) => String(section.id) === String(sectionId));
      if (!sectionToDelete) {
        throw new Error("SECTION_NOT_FOUND");
      }

      const updatedSections = currentSections.filter((section) => String(section.id) !== String(sectionId));
      const sectionsVal = serializeSections(updatedSections);

      const updateQuery =
        this.dialect.name === "sqlite"
          ? "UPDATE unilib_books SET sections = $1 WHERE id = $2"
          : "UPDATE unilib_books SET sections = $1::jsonb WHERE id = $2";

      await tx.query(updateQuery, [sectionsVal, book.id]);
      return { deletedSection: sectionToDelete, bookId: book.id };
    });
  }

  async bulkDeleteSections(bookId, sectionIds, { username } = {}) {
    return this.withTransaction(async (tx) => {
      const bookResult = await tx.query("SELECT id, sections FROM unilib_books WHERE id = $1", [bookId]);
      if (!bookResult.rows || bookResult.rows.length === 0) {
        throw new Error("BOOK_NOT_FOUND");
      }

      const book = bookResult.rows[0];
      const currentSections = normalizeSections(book.sections);
      const sectionIdSet = new Set(sectionIds.map((id) => String(id)));

      const sectionsToDelete = currentSections.filter((section) => sectionIdSet.has(String(section.id)));
      if (sectionsToDelete.length === 0) {
        return { deletedSections: [], deletedCount: 0, bookId };
      }

      const updatedSections = currentSections.filter((section) => !sectionIdSet.has(String(section.id)));
      const sectionsVal = serializeSections(updatedSections);

      const updateQuery =
        this.dialect.name === "sqlite"
          ? "UPDATE unilib_books SET sections = $1 WHERE id = $2"
          : "UPDATE unilib_books SET sections = $1::jsonb WHERE id = $2";

      await tx.query(updateQuery, [sectionsVal, bookId]);
      return {
        deletedSections: sectionsToDelete,
        deletedCount: sectionsToDelete.length,
        bookId,
      };
    });
  }
}

export default SectionRepository;
