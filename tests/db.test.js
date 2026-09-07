import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { initDatabase, closeDatabase, getActiveDbType } from "../src/db/index.js";
import { getSqliteConnection } from "../src/db/connection.js";
import { initSqliteSchema } from "../src/db/schema/init.js";

describe("Unilib Database Abstraction Layer Tests", () => {
  let bookRepository;
  let sectionRepository;
  let tasjeelRepository;
  let book1;
  let book2;
  let book3;

  beforeAll(async () => {
    const sqliteDb = await getSqliteConnection(":memory:");
    initSqliteSchema(sqliteDb);

    const repos = await initDatabase({
      dbType: "sqlite",
      sqlitePath: ":memory:",
    });

    bookRepository = repos.bookRepository;
    sectionRepository = repos.sectionRepository;
    tasjeelRepository = repos.tasjeelRepository;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Active DB Type", () => {
    test("sets active db type to sqlite", () => {
      expect(getActiveDbType()).toBe("sqlite");
    });
  });

  describe("Book Repository CRUD & Filtering", () => {
    test("creates sample books with JSON columns and booleans", async () => {
      book1 = await bookRepository.create({
        name: "Calculus Early Transcendentals",
        category: "CourseBooks",
        description: "Calculus textbook for engineering",
        image_url: "calculus.webp",
        link: "https://example.com/calculus.pdf",
        semester: ["Semester 1", "Semester 2"],
        main: true,
        visible: true,
        username: "admin",
      });

      expect(book1.id).toBeDefined();
      expect(book1.name).toBe("Calculus Early Transcendentals");
      expect(book1.semester).toEqual(["Semester 1", "Semester 2"]);
      expect(book1.main).toBe(true);
      expect(book1.visible).toBe(true);
      expect(book1.views).toBe(0);

      book2 = await bookRepository.create({
        name: "Data Structures and Algorithms in C++",
        category: "CourseBooks",
        description: "DSA textbook",
        image_url: "dsa.webp",
        link: "https://example.com/dsa.pdf",
        semester: ["Semester 3"],
        main: false,
        visible: true,
        username: "admin",
      });

      book3 = await bookRepository.create({
        name: "MATLAB 2024 Installation Guide",
        category: "Softwares",
        description: "Software guide",
        image_url: "matlab.webp",
        link: "https://example.com/matlab.pdf",
        semester: ["Semester 3", "Semester 4"],
        main: false,
        visible: false,
        username: "admin",
      });

      expect(book2.id).toBeDefined();
      expect(book3.id).toBeDefined();
    });

    test("filters books by visibility, semester, category, and search", async () => {
      // Public view excludes hidden book3
      const publicList = await bookRepository.findBooks({ page: 1, limit: 10, isAdminView: false });
      expect(publicList.books.length).toBe(2);
      expect(publicList.pagination.total).toBe(2);

      // Admin view includes hidden book3
      const adminList = await bookRepository.findBooks({ page: 1, limit: 10, isAdminView: true });
      expect(adminList.books.length).toBe(3);
      expect(adminList.pagination.total).toBe(3);
      expect(adminList.books[0].id).toBe(book1.id);

      // Semester filtering
      const sem1List = await bookRepository.findBooks({ semester: ["Semester 1"], isAdminView: true });
      expect(sem1List.books.length).toBe(1);
      expect(sem1List.books[0].name).toBe("Calculus Early Transcendentals");

      const sem3List = await bookRepository.findBooks({ semester: ["Semester 3"], isAdminView: true });
      expect(sem3List.books.length).toBe(2);

      // Category filter
      const softwareList = await bookRepository.findBooks({ category: "Softwares", isAdminView: true });
      expect(softwareList.books.length).toBe(1);
      expect(softwareList.books[0].name).toBe("MATLAB 2024 Installation Guide");

      // Search filter
      const searchList = await bookRepository.findBooks({ search: "structures", isAdminView: true });
      expect(searchList.books.length).toBe(1);
      expect(searchList.books[0].name).toBe("Data Structures and Algorithms in C++");
    });

    test("findById, exists, and incrementViews operate accurately", async () => {
      const fetchedBook = await bookRepository.findById(book1.id);
      expect(fetchedBook.name).toBe(book1.name);

      expect(await bookRepository.exists(book3.id, { mustBeVisible: true })).toBe(false);
      expect(await bookRepository.exists(book3.id, { mustBeVisible: false })).toBe(true);

      await bookRepository.incrementViews(book1.id);
      await bookRepository.incrementViews(book1.id);
      const updatedBook1 = await bookRepository.findById(book1.id);
      expect(updatedBook1.views).toBe(2);
    });

    test("updates book details and bulk toggles visibility", async () => {
      await bookRepository.update(book1.id, {
        name: "Calculus Early Transcendentals 10th Ed",
        category: "CourseBooks",
        description: "Updated description",
        image_url: "calculus_new.webp",
        link: "https://example.com/calculus_new.pdf",
        semester: ["Semester 1", "Semester 2", "Semester 3"],
        main: true,
        visible: true,
      });

      const reFetched1 = await bookRepository.findById(book1.id);
      expect(reFetched1.name).toBe("Calculus Early Transcendentals 10th Ed");
      expect(reFetched1.semester).toEqual(["Semester 1", "Semester 2", "Semester 3"]);

      const bulkCount = await bookRepository.bulkUpdateVisibility([book3.id], true);
      expect(bulkCount).toBe(1);
      const reFetched3 = await bookRepository.findById(book3.id);
      expect(reFetched3.visible).toBe(true);
    });
  });

  describe("Section Repository", () => {
    let sec1;
    let sec2;
    let sec3;

    test("adds sections and associates with book", async () => {
      sec1 = await sectionRepository.addSection(book1.id, {
        page_start: 1,
        page_end: 50,
        name: "Chapter 1: Limits and Continuity",
        username: "admin",
      });
      expect(sec1.newSection.id).toBeDefined();
      expect(sec1.newSection.section_number).toBe(1);

      sec2 = await sectionRepository.addSection(book1.id, {
        page_start: 51,
        page_end: 120,
        name: "Chapter 2: Differentiation",
        username: "admin",
      });
      expect(sec2.newSection.section_number).toBe(2);

      const bookWithSections = await sectionRepository.getSectionsByBookId(book1.id);
      expect(bookWithSections.sections.length).toBe(2);

      const foundBySec = await sectionRepository.findBookBySectionId(sec1.newSection.id);
      expect(foundBySec.book.id).toBe(book1.id);
    });

    test("updates section and rejects duplicate section numbers", async () => {
      const editSecRes = await sectionRepository.updateSection(sec1.newSection.id, {
        section_number: 1,
        page_start: 1,
        page_end: 55,
        name: "Chapter 1: Limits & Continuity (Revised)",
        username: "admin",
      });
      expect(editSecRes.updatedSection.name).toBe("Chapter 1: Limits & Continuity (Revised)");

      await expect(
        sectionRepository.updateSection(sec2.newSection.id, {
          section_number: 1,
          page_start: 56,
          page_end: 120,
          name: "Conflict",
          username: "admin",
        })
      ).rejects.toThrow(/already exists/i);
    });

    test("deletes single and bulk sections", async () => {
      sec3 = await sectionRepository.addSection(book1.id, {
        page_start: 121,
        page_end: 200,
        name: "Chapter 3: Integration",
        username: "admin",
      });

      const delSecRes = await sectionRepository.deleteSection(sec3.newSection.id, { username: "admin" });
      expect(delSecRes.deletedSection.id).toBe(sec3.newSection.id);

      const bulkDelSecRes = await sectionRepository.bulkDeleteSections(book1.id, [
        sec1.newSection.id,
        sec2.newSection.id,
      ]);
      expect(bulkDelSecRes.deletedCount).toBe(2);

      const emptySectionsBook = await sectionRepository.getSectionsByBookId(book1.id);
      expect(emptySectionsBook.sections.length).toBe(0);
    });
  });

  describe("Tasjeel Repository", () => {
    let subj1Id;
    let subj2Id;
    let newMaterial;

    test("upserts subjects and materials with conflict handling", async () => {
      subj1Id = await tasjeelRepository.upsertSubject("CS101", "Introduction to Computing", "/student/course/info/CS101");
      expect(subj1Id).toBeDefined();

      subj2Id = await tasjeelRepository.upsertSubject("CS102", "Object Oriented Programming", "/student/course/info/CS102");
      expect(subj2Id).toBeDefined();

      const subj1IdAgain = await tasjeelRepository.upsertSubject("CS101", "Introduction to Computing (Updated)", "/student/course/info/CS101");
      expect(subj1IdAgain).toBe(subj1Id);

      await tasjeelRepository.upsertMaterials(subj1Id, [
        { name: "Lecture 1 Slides", href: "/student/class/material/download/101" },
        { name: "Lecture 2 Slides", href: "/student/class/material/download/102" },
      ]);

      await tasjeelRepository.upsertMaterials(subj2Id, [
        { name: "OOP Syllabus", href: "/student/class/material/download/201" },
      ]);

      const allSubjects = await tasjeelRepository.getAllSubjects();
      expect(allSubjects.length).toBe(2);

      const counts = await tasjeelRepository.getMaterialCounts();
      expect(counts["CS101"]).toBe(2);
      expect(counts["CS102"]).toBe(1);

      const cs101Materials = await tasjeelRepository.getMaterialsByCourseId("CS101");
      expect(cs101Materials.length).toBe(2);
      expect(cs101Materials[0].name).toBe("Lecture 1 Slides");
    });

    test("manages subject semester, materials addition and deletion", async () => {
      const updatedSem = await tasjeelRepository.updateSubjectSemester("CS101", "Semester 3");
      expect(updatedSem.semester).toBe("Semester 3");

      const foundSubject = await tasjeelRepository.getSubjectByIdOrCourseId("CS101");
      expect(foundSubject.course_id).toBe("CS101");

      newMaterial = await tasjeelRepository.addMaterial(subj1Id, "Lecture 3 Slides", "/student/class/material/download/103");
      expect(newMaterial.name).toBe("Lecture 3 Slides");

      const delMatRes = await tasjeelRepository.deleteMaterial(newMaterial.id);
      expect(delMatRes).toBe(true);

      const delSubjRes = await tasjeelRepository.deleteSubject("CS102");
      expect(delSubjRes).toBe(true);

      const remaining = await tasjeelRepository.getAllSubjects();
      expect(remaining.length).toBe(1);
    });
  });

  describe("Book Deletion", () => {
    test("deletes book cleanly", async () => {
      await bookRepository.delete(book2.id);
      const book2AfterDel = await bookRepository.findById(book2.id);
      expect(book2AfterDel).toBeNull();
    });
  });
});
