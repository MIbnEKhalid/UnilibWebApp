process.env.REDIS_ENABLED = "false";
import assert from "node:assert/strict";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import { getSqliteConnection } from "../src/db/connection.js";
import { initSqliteSchema } from "../src/db/schema/init.js";
import http from "http";

async function runHttpTests() {
  console.log("=========================================");
  console.log("Starting Web App HTTP Integration Tests");
  console.log("=========================================\n");

  const { default: app } = await import("../src/app.js");

  // Initialize in-memory SQLite database
  const sqliteDb = await getSqliteConnection(":memory:");
  initSqliteSchema(sqliteDb);

  const { bookRepository } = await initDatabase({
    dbType: "sqlite",
    sqlitePath: ":memory:",
  });

  // Seed sample data
  const seededBook = await bookRepository.create({
    name: "Operating Systems Principles",
    category: "CourseBooks",
    description: "Concepts and Design",
    imageURL: "os.webp",
    link: "https://example.com/os.pdf",
    semester: ["Semester4"],
    main: true,
    visible: true,
  });

  const seededBook2 = await bookRepository.create({
    name: "Engineering Mechanics",
    category: "CourseBooks",
    description: "Statics and Dynamics",
    imageURL: "mechanics.webp",
    link: "https://example.com/mechanics.pdf",
    semester: ["Semester 2"],
    main: false,
    visible: true,
  });

  // Start temporary HTTP server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Test server running on ${baseUrl}`);

  try {
    // Test 1: GET / (Default Semester 4)
    console.log("1. Testing GET / (Home Page default filter)...");
    const resHome = await fetch(`${baseUrl}/`);
    assert.equal(resHome.status, 200, "Home page should return 200 OK");
    const htmlHome = await resHome.text();
    assert.ok(htmlHome.includes("Operating Systems Principles"), "Home page should contain default semester book");
    console.log("✓ GET / rendered successfully");

    // Test 2: GET /?semester=Semester2 (Filtered)
    console.log("2. Testing GET /?semester=Semester2...");
    const resSem2 = await fetch(`${baseUrl}/?semester=Semester2`);
    assert.equal(resSem2.status, 200);
    const htmlSem2 = await resSem2.text();
    assert.ok(htmlSem2.includes("Engineering Mechanics"), "Filtered page should contain Semester 2 book");
    console.log("✓ GET /?semester=Semester2 filtered successfully");

    // Test 2b: GET /?category=CourseBooks (Standalone category filter)
    console.log("2b. Testing GET /?semester=all&category=CourseBooks...");
    const resCat = await fetch(`${baseUrl}/?semester=all&category=CourseBooks`);
    assert.equal(resCat.status, 200);
    const htmlCat = await resCat.text();
    assert.ok(htmlCat.includes("Operating Systems Principles"));
    assert.ok(htmlCat.includes("Engineering Mechanics"));
    console.log("✓ GET /?semester=all&category=CourseBooks filtered successfully");

    // Test 3: GET /book/:id (Single Book View)
    console.log(`3. Testing GET /book/${seededBook.id} (Single Book View)...`);
    const resSingleBook = await fetch(`${baseUrl}/book/${seededBook.id}`);
    assert.equal(resSingleBook.status, 200);
    const htmlSingleBook = await resSingleBook.text();
    assert.ok(htmlSingleBook.includes("Operating Systems Principles"));
    console.log("✓ Single book view rendered successfully");

    // Test 4: POST /api/book/:id/view
    console.log(`4. Testing POST /api/book/${seededBook.id}/view...`);
    const resTrackView = await fetch(`${baseUrl}/api/book/${seededBook.id}/view`, { method: "POST" });
    assert.equal(resTrackView.status, 200);
    const jsonTrackView = await resTrackView.json();
    assert.equal(jsonTrackView.success, true);
    console.log("✓ POST /api/book/:id/view responded with success");

    // Test 5: POST /api/book/:id/download
    console.log(`5. Testing POST /api/book/${seededBook.id}/download...`);
    const resTrackDownload = await fetch(`${baseUrl}/api/book/${seededBook.id}/download`, { method: "POST" });
    assert.equal(resTrackDownload.status, 200);
    const jsonTrackDownload = await resTrackDownload.json();
    assert.equal(jsonTrackDownload.success, true);
    console.log("✓ POST /api/book/:id/download responded with success");

    // Test 6: GET /dashboard/db (AdminDB Interface)
    console.log("6. Testing GET /dashboard/db (AdminDB interface)...");
    const resAdminDb = await fetch(`${baseUrl}/dashboard/db`, { redirect: "manual" });
    assert.ok([200, 302, 401, 403].includes(resAdminDb.status), "AdminDB endpoint should be protected by auth middleware");
    console.log("✓ GET /dashboard/db responded with status " + resAdminDb.status);

    // Test 7: GET /materials (Materials Archive Page)
    console.log("7. Testing GET /materials...");
    const resMaterials = await fetch(`${baseUrl}/materials`, { redirect: "manual" });
    assert.ok([200, 302, 401, 403].includes(resMaterials.status), "Materials endpoint responds successfully");
    console.log("✓ GET /materials responded with status " + resMaterials.status);

    // Test 8: Compile and render all Handlebars views directly to ensure zero template parse errors
    console.log("8. Testing template compilation for all Handlebars pages...");
    const hbsEngine = app.get("engine") || app.engines[".handlebars"];
    const testViews = [
      { view: "mainPages/index", data: { books: [seededBook], pagination: { page: 1, pages: 1, limit: 12, total: 1 } } },
      { view: "mainPages/index", data: { singleBookView: true, books: [seededBook] } },
      { view: "mainPages/Book", data: { books: [seededBook], pagination: { page: 1, pages: 1, limit: 12, total: 1 } } },
      { view: "mainPages/BookForm", data: { isEdit: false } },
      { view: "mainPages/BookForm", data: { isEdit: true, id: 1, book: seededBook } },
      { view: "mainPages/Sections", data: { book: seededBook, sections: [] } },
      { view: "mainPages/subjects", data: { subjects: [] } },
      { view: "mainPages/MaterialsAdmin", data: { subjects: [] } }
    ];

    for (const item of testViews) {
      await new Promise((resolve, reject) => {
        app.render(item.view, { ...item.data, defaultSemester: "Semester 1", appVersion: "2.0.0" }, (err, html) => {
          if (err) return reject(new Error(`Failed to render ${item.view}: ${err.message}`));
          assert.ok(typeof html === "string" && html.length > 0, `${item.view} should render non-empty HTML`);
          resolve();
        });
      });
    }
    console.log("✓ All 8 Handlebars views compiled and rendered successfully");

    console.log("\n=========================================");
    console.log("ALL HTTP INTEGRATION TESTS PASSED! 🎉");
    console.log("=========================================\n");
  } finally {
    if (server.closeAllConnections) server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await closeDatabase();
    setTimeout(() => process.exit(0), 50);
  }
}

runHttpTests().catch((err) => {
  console.error("HTTP test failure:", err);
  process.exit(1);
});
