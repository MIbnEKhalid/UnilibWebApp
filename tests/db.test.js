import assert from "node:assert/strict";
import { initDatabase, closeDatabase, getActiveDbType } from "../src/db/index.js";
import { getSqliteConnection } from "../src/db/connection.js";
import { initSqliteSchema } from "../src/db/schema/init.js";

async function runTests() {
  console.log("=========================================");
  console.log("Starting Database Abstraction Layer Tests");
  console.log("=========================================\n");

  // Test 1: SQLite Adapter with in-memory database
  console.log("--- Testing SQLite Adapter (:memory:) ---");
  const sqliteDb = await getSqliteConnection(":memory:");
  initSqliteSchema(sqliteDb);

  const { bookRepository, sectionRepository, tasjeelRepository } = await initDatabase({
    dbType: "sqlite",
    sqlitePath: ":memory:",
  });

  assert.equal(getActiveDbType(), "sqlite", "Active DB type should be sqlite");

  // 1. Create Books
  console.log("1. Testing Book Creation...");
  const book1 = await bookRepository.create({
    name: "Calculus Early Transcendentals",
    category: "CourseBooks",
    description: "Calculus textbook for engineering",
    imageURL: "calculus.webp",
    link: "https://example.com/calculus.pdf",
    semester: ["Semester 1", "Semester 2"],
    main: true,
    visible: true,
    userName: "admin",
  });

  assert.ok(book1.id, "Book 1 should have an ID");
  assert.equal(book1.name, "Calculus Early Transcendentals");
  assert.deepEqual(book1.semester, ["Semester 1", "Semester 2"]);
  assert.equal(book1.main, true);
  assert.equal(book1.visible, true);
  assert.equal(book1.views, 0);
  assert.deepEqual(book1.sections, []);

  const book2 = await bookRepository.create({
    name: "Data Structures and Algorithms in C++",
    category: "CourseBooks",
    description: "DSA textbook",
    imageURL: "dsa.webp",
    link: "https://example.com/dsa.pdf",
    semester: ["Semester 3"],
    main: false,
    visible: true,
    userName: "admin",
  });

  const book3 = await bookRepository.create({
    name: "MATLAB 2024 Installation Guide",
    category: "Softwares",
    description: "Software guide",
    imageURL: "matlab.webp",
    link: "https://example.com/matlab.pdf",
    semester: ["Semester 3", "Semester 4"],
    main: false,
    visible: false, // hidden book
    userName: "admin",
  });

  console.log("✓ Books created successfully");

  // 2. Find Books (Filtering & Pagination)
  console.log("2. Testing Book Queries & Filters...");
  
  // Public view should exclude hidden book3
  const publicList = await bookRepository.findBooks({ page: 1, limit: 10, isAdminView: false });
  assert.equal(publicList.books.length, 2, "Public list should return 2 visible books");
  assert.equal(publicList.pagination.total, 2);

  // Admin view should include hidden book3
  const adminList = await bookRepository.findBooks({ page: 1, limit: 10, isAdminView: true });
  assert.equal(adminList.books.length, 3, "Admin list should return all 3 books");
  assert.equal(adminList.pagination.total, 3);

  // Main book should be first in ordering
  assert.equal(adminList.books[0].id, book1.id, "Main book should be first in results");

  // Semester filtering with array overlap
  const sem1List = await bookRepository.findBooks({ semester: ["Semester 1"], isAdminView: true });
  assert.equal(sem1List.books.length, 1);
  assert.equal(sem1List.books[0].name, "Calculus Early Transcendentals");

  const sem3List = await bookRepository.findBooks({ semester: ["Semester 3"], isAdminView: true });
  assert.equal(sem3List.books.length, 2, "Semester 3 should match book2 and book3");

  // Category filter
  const softwareList = await bookRepository.findBooks({ category: "Softwares", isAdminView: true });
  assert.equal(softwareList.books.length, 1);
  assert.equal(softwareList.books[0].name, "MATLAB 2024 Installation Guide");

  // Search filter
  const searchList = await bookRepository.findBooks({ search: "structures", isAdminView: true });
  assert.equal(searchList.books.length, 1);
  assert.equal(searchList.books[0].name, "Data Structures and Algorithms in C++");

  console.log("✓ Book filtering and pagination verified");

  // 3. Find By ID & Exists
  console.log("3. Testing findById, exists, incrementViews...");
  const fetchedBook = await bookRepository.findById(book1.id);
  assert.equal(fetchedBook.name, book1.name);
  assert.equal(fetchedBook.id, book1.id);

  const existsVisible = await bookRepository.exists(book3.id, { mustBeVisible: true });
  assert.equal(existsVisible, false, "Book 3 is not visible");
  const existsAny = await bookRepository.exists(book3.id, { mustBeVisible: false });
  assert.equal(existsAny, true, "Book 3 exists");

  // Increment views
  await bookRepository.incrementViews(book1.id);
  await bookRepository.incrementViews(book1.id);
  const updatedBook1 = await bookRepository.findById(book1.id);
  assert.equal(updatedBook1.views, 2, "Book 1 views should be incremented to 2");

  // 4. Update & Bulk Visibility
  console.log("4. Testing Book Updates & Bulk Visibility...");
  await bookRepository.update(book1.id, {
    name: "Calculus Early Transcendentals 10th Ed",
    category: "CourseBooks",
    description: "Updated description",
    imageURL: "calculus_new.webp",
    link: "https://example.com/calculus_new.pdf",
    semester: ["Semester 1", "Semester 2", "Semester 3"],
    main: true,
    visible: true,
  });

  const reFetched1 = await bookRepository.findById(book1.id);
  assert.equal(reFetched1.name, "Calculus Early Transcendentals 10th Ed");
  assert.deepEqual(reFetched1.semester, ["Semester 1", "Semester 2", "Semester 3"]);

  const bulkCount = await bookRepository.bulkUpdateVisibility([book3.id], true);
  assert.equal(bulkCount, 1);
  const reFetched3 = await bookRepository.findById(book3.id);
  assert.equal(reFetched3.visible, true, "Book 3 should now be visible");

  console.log("✓ Book update and bulk visibility verified");

  // 5. Sections Management
  console.log("5. Testing Sections (Add, Find, Edit, Duplicate check, Delete, Bulk Delete)...");
  
  // Add sections
  const sec1 = await sectionRepository.addSection(book1.id, {
    page_start: 1,
    page_end: 50,
    name: "Chapter 1: Limits and Continuity",
    username: "admin",
  });
  assert.ok(sec1.newSection.id);
  assert.equal(sec1.newSection.section_number, 1);

  const sec2 = await sectionRepository.addSection(book1.id, {
    page_start: 51,
    page_end: 120,
    name: "Chapter 2: Differentiation",
    username: "admin",
  });
  assert.equal(sec2.newSection.section_number, 2);

  // Fetch sections by bookId
  const bookWithSections = await sectionRepository.getSectionsByBookId(book1.id);
  assert.equal(bookWithSections.sections.length, 2);

  // Find book by section ID
  const foundBySec = await sectionRepository.findBookBySectionId(sec1.newSection.id);
  assert.ok(foundBySec);
  assert.equal(foundBySec.book.id, book1.id);

  // Edit section
  const editSecRes = await sectionRepository.updateSection(sec1.newSection.id, {
    section_number: 1,
    page_start: 1,
    page_end: 55,
    name: "Chapter 1: Limits & Continuity (Revised)",
    username: "admin",
  });
  assert.equal(editSecRes.updatedSection.name, "Chapter 1: Limits & Continuity (Revised)");
  assert.equal(editSecRes.updatedSection.page_end, 55);

  // Duplicate section number check
  await assert.rejects(
    async () => {
      await sectionRepository.updateSection(sec2.newSection.id, {
        section_number: 1, // Already used by sec1
        page_start: 56,
        page_end: 120,
        name: "Conflict",
        username: "admin",
      });
    },
    /already exists/i,
    "Should reject duplicate section number"
  );

  // Add 3rd section and delete
  const sec3 = await sectionRepository.addSection(book1.id, {
    page_start: 121,
    page_end: 200,
    name: "Chapter 3: Integration",
    username: "admin",
  });

  const delSecRes = await sectionRepository.deleteSection(sec3.newSection.id, { username: "admin" });
  assert.equal(delSecRes.deletedSection.id, sec3.newSection.id);

  // Bulk delete remaining sections
  const bulkDelSecRes = await sectionRepository.bulkDeleteSections(book1.id, [
    sec1.newSection.id,
    sec2.newSection.id,
  ]);
  assert.equal(bulkDelSecRes.deletedCount, 2);

  const emptySectionsBook = await sectionRepository.getSectionsByBookId(book1.id);
  assert.equal(emptySectionsBook.sections.length, 0);

  console.log("✓ Section operations verified");

  // 6. Tasjeel (Subjects, Materials, Session)
  console.log("6. Testing Tasjeel Repository...");
  const subj1Id = await tasjeelRepository.upsertSubject("CS101", "Introduction to Computing", "/student/course/info/CS101");
  assert.ok(subj1Id);
  const subj2Id = await tasjeelRepository.upsertSubject("CS102", "Object Oriented Programming", "/student/course/info/CS102");
  assert.ok(subj2Id);

  // Upsert again to test ON CONFLICT update
  const subj1IdAgain = await tasjeelRepository.upsertSubject("CS101", "Introduction to Computing (Updated)", "/student/course/info/CS101");
  assert.equal(subj1IdAgain, subj1Id);

  await tasjeelRepository.upsertMaterials(subj1Id, [
    { name: "Lecture 1 Slides", href: "/student/class/material/download/101" },
    { name: "Lecture 2 Slides", href: "/student/class/material/download/102" },
  ]);

  await tasjeelRepository.upsertMaterials(subj2Id, [
    { name: "OOP Syllabus", href: "/student/class/material/download/201" },
  ]);

  const allSubjects = await tasjeelRepository.getAllSubjects();
  assert.equal(allSubjects.length, 2);

  const counts = await tasjeelRepository.getMaterialCounts();
  assert.equal(counts["CS101"], 2);
  assert.equal(counts["CS102"], 1);

  const cs101Materials = await tasjeelRepository.getMaterialsByCourseId("CS101");
  assert.equal(cs101Materials.length, 2);
  assert.equal(cs101Materials[0].name, "Lecture 1 Slides");

  // Test Semester update
  const updatedSem = await tasjeelRepository.updateSubjectSemester("CS101", "Semester 3");
  assert.equal(updatedSem.semester, "Semester 3");

  // Test getSubjectByIdOrCourseId
  const foundSubject = await tasjeelRepository.getSubjectByIdOrCourseId("CS101");
  assert.ok(foundSubject);
  assert.equal(foundSubject.course_id, "CS101");

  // Test addMaterial
  const newMaterial = await tasjeelRepository.addMaterial(subj1Id, "Lecture 3 Slides", "/student/class/material/download/103");
  assert.ok(newMaterial);
  assert.equal(newMaterial.name, "Lecture 3 Slides");

  // Test deleteMaterial
  const delMatRes = await tasjeelRepository.deleteMaterial(newMaterial.id);
  assert.equal(delMatRes, true);

  // Test deleteSubject
  const delSubjRes = await tasjeelRepository.deleteSubject("CS102");
  assert.equal(delSubjRes, true);
  const remainingSubjects = await tasjeelRepository.getAllSubjects();
  assert.equal(remainingSubjects.length, 1);

  console.log("✓ Tasjeel operations verified");

  // 7. Delete Book
  console.log("7. Testing Book Deletion...");
  await bookRepository.delete(book2.id);
  const book2AfterDel = await bookRepository.findById(book2.id);
  assert.equal(book2AfterDel, null, "Book 2 should be deleted");

  await closeDatabase();

  console.log("\n=========================================");
  console.log("ALL DATABASE TESTS PASSED SUCCESSFULLY! 🎉");
  console.log("=========================================\n");
}

runTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
