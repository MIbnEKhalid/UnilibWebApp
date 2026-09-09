import { describe, test, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { initDatabase, closeDatabase } from "../src/db/index.js";
import { getSqliteConnection } from "../src/db/connection.js";
import { initSqliteSchema } from "../src/db/schema/init.js";

describe("UnilibWebApp HTTP Integration Tests", () => {
  let app;
  let bookRepository;
  let seededBook;
  let seededBook2;

  beforeAll(async () => {
    // Initialize in-memory SQLite database
    const sqliteDb = await getSqliteConnection(":memory:");
    initSqliteSchema(sqliteDb);

    const repos = await initDatabase({
      dbType: "sqlite",
      sqlitePath: ":memory:",
    });
    bookRepository = repos.bookRepository;

    // Seed sample books
    seededBook = await bookRepository.create({
      name: "Operating Systems Principles",
      category: "CourseBooks",
      description: "Concepts and Design",
      image_url: "os.webp",
      link: "https://example.com/os.pdf",
      semester: ["Semester4"],
      main: true,
      visible: true,
    });

    seededBook2 = await bookRepository.create({
      name: "Engineering Mechanics",
      category: "CourseBooks",
      description: "Statics and Dynamics",
      image_url: "mechanics.webp",
      link: "https://example.com/mechanics.pdf",
      semester: ["Semester 2"],
      main: false,
      visible: true,
    });

    const appModule = await import("../src/app.js");
    app = appModule.default;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe("Public Catalog Pages", () => {
    test("GET / renders home page with default Semester 4 book", async () => {
      const res = await request(app).get("/");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Operating Systems Principles");
    });

    test("GET /?semester=Semester2 filters books for Semester 2", async () => {
      const res = await request(app).get("/?semester=Semester2");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Engineering Mechanics");
    });

    test("GET /?semester=all&category=CourseBooks filters by category across all semesters", async () => {
      const res = await request(app).get("/?semester=all&category=CourseBooks");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Operating Systems Principles");
      expect(res.text).toContain("Engineering Mechanics");
    });

    test("GET /book/:id renders single book page", async () => {
      const res = await request(app).get(`/book/${seededBook.id}`);
      expect(res.status).toBe(200);
      expect(res.text).toContain("Operating Systems Principles");
    });

    test("GET /?search=Operating returns matching search results", async () => {
      const res = await request(app).get("/?search=Operating");
      expect(res.status).toBe(200);
      expect(res.text).toContain("Operating Systems Principles");
    });
  });

  describe("API Endpoints", () => {
    test("POST /api/book/:id/view increments book views", async () => {
      const res = await request(app).post(`/api/book/${seededBook.id}/view`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("POST /api/book/:id/download responds with success", async () => {
      const res = await request(app).post(`/api/book/${seededBook.id}/download`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    test("GET /api/non-existent-unilib-route returns standardized JSON 404 envelope", async () => {
      const res = await request(app).get("/api/non-existent-unilib-route");
      expect(res.status).toBe(404);
      expect(res.headers["content-type"]).toContain("application/json");
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });

  describe("Static Assets & Robots", () => {
    test("GET /robots.txt returns valid robots file", async () => {
      const res = await request(app).get("/robots.txt");
      expect(res.status).toBe(200);
      expect(res.text).toContain("User-agent");
    });

    test("GET /assets/images/icon.svg serves static branding icon", async () => {
      const res = await request(app).get("/assets/images/icon.svg");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("svg");
    });
  });
});
