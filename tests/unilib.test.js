import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import courseRepository from "../src/repositories/course.repository.js";
import resourceRepository from "../src/repositories/resource.repository.js";
import cacheService from "../src/services/cache.service.js";
import resourceService from "../src/services/resource.service.js";

const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

describe("Unilib Academic Platform Tests", () => {
  test("Static assets are served with their correct MIME types", async () => {
    const cssRes = await request(app).get("/assets/css/unilib.css?v=3.0.0");
    const scriptRes = await request(app).get("/assets/js/network-verifier.js?v=3.0.0");
    const iconRes = await request(app).get("/assets/images/icon.svg?v=3.0.0");

    expect(cssRes.status).toBe(200);
    expect(cssRes.header["content-type"]).toContain("text/css");
    expect(cssRes.text).toContain(":root");

    expect(scriptRes.status).toBe(200);
    expect(scriptRes.header["content-type"]).toContain("javascript");
    expect(scriptRes.text).toContain("probeGoogleDrive");

    expect(iconRes.status).toBe(200);
    expect(iconRes.header["content-type"]).toContain("image/svg+xml");
    expect(iconRes.body.toString()).toContain("<svg");
  });

  test("Public access to Homepage without login", async () => {
    const res = await request(app)
      .get("/")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Department Academic Library");
    expect(res.text).toContain("All Semesters");
  });

  test("Public access to Course page by Course Code (CPE1021)", async () => {
    const res = await request(app)
      .get("/courses/CPE1021")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(200);
    expect(res.text).toContain("Workshop Practice");
    expect(res.text).toContain("Semester 1");
    expect(res.text).toContain("Textbooks");
    expect(res.text).toContain("Lab Manuals");
  });

  test("GET /courses/NON_EXISTENT_CODE returns 404 notice", async () => {
    const res = await request(app)
      .get("/courses/NON-EXISTENT-XYZ-999")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(404);
    expect(res.text).toContain("Notice");
  });

  test("Legacy /search web page route returns 404 (superseded by live filter)", async () => {
    const res = await request(app)
      .get("/search?q=Practice")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(404);
  });

  test("API: GET /api/courses returns seeded courses list", async () => {
    const res = await request(app)
      .get("/api/courses")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.courses)).toBe(true);
    expect(res.body.data.courses.length).toBeGreaterThan(0);
  });

  test("API: GET /api/courses?semester=1 filters by semester", async () => {
    const res = await request(app)
      .get("/api/courses?semester=1")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const courses = res.body.data.courses;
    expect(courses.length).toBeGreaterThan(0);
    for (const c of courses) {
      expect(c.semester).toBe(1);
    }
  });

  test("API: GET /api/courses/CPE1021 returns course details", async () => {
    const res = await request(app)
      .get("/api/courses/CPE1021")
      .set("User-Agent", BROWSER_UA);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.course.code).toBe("CPE1021");
  });

  test("Unauthorized user cannot access Admin Console (/admin)", async () => {
    const res = await request(app)
      .get("/admin")
      .set("User-Agent", BROWSER_UA);

    // Should be redirected to /login or denied (302/401/403)
    expect([302, 401, 403]).toContain(res.status);
  });

  test("Unauthorized user cannot POST to /admin/courses (Permission Guard)", async () => {
    const res = await request(app)
      .post("/admin/courses")
      .set("User-Agent", BROWSER_UA)
      .send({
        code: "HACK-999",
        title: "Malicious Course Injection",
        semester: 1,
      });

    expect([302, 401, 403]).toContain(res.status);
    
    // Verify it was not inserted
    const found = await courseRepository.findByCode("HACK-999");
    expect(found).toBeNull();
  });

  test("Authorized admin can create course via /admin/courses", async () => {
    await courseRepository.delete("AUTH-101");
    const res = await request(app)
      .post("/admin/courses")
      .set("User-Agent", BROWSER_UA)
      .set("x-test-auth-role", "admin")
      .type("form")
      .send({
        code: "AUTH-101",
        title: "Authorized Course Creation",
        semester: 4,
      });

    expect([302, 200]).toContain(res.status);
    const created = await courseRepository.findByCode("AUTH-101");
    expect(created).toBeDefined();
    expect(created.title).toBe("Authorized Course Creation");

    // Clean up
    await courseRepository.delete("AUTH-101");
  });

  test("Authorized admin can access feature-based admin pages", async () => {
    // 1. Materials Listing
    const resMaterials = await request(app)
      .get("/admin")
      .set("User-Agent", BROWSER_UA)
      .set("x-test-auth-role", "admin");
    expect(resMaterials.status).toBe(200);

    // 2. Courses Listing
    const resCourses = await request(app)
      .get("/admin/courses")
      .set("User-Agent", BROWSER_UA)
      .set("x-test-auth-role", "admin");
    expect(resCourses.status).toBe(200);

    // 3. New Resource Page
    const resNewResource = await request(app)
      .get("/admin/resources/new")
      .set("User-Agent", BROWSER_UA)
      .set("x-test-auth-role", "admin");
    expect(resNewResource.status).toBe(200);

    // 4. New Course Page
    const resNewCourse = await request(app)
      .get("/admin/courses/new")
      .set("User-Agent", BROWSER_UA)
      .set("x-test-auth-role", "admin");
    expect(resNewCourse.status).toBe(200);
  });

  test("Authorized admin can edit an existing course", async () => {
    await courseRepository.delete("EDIT-101");
    const course = await courseRepository.create({
      code: "EDIT-101",
      title: "Before Edit Course",
      semester: 2,
    });

    const res = await request(app)
      .post(`/admin/courses/${course.code}/edit`)
      .set("User-Agent", BROWSER_UA)
      .set("x-test-auth-role", "admin")
      .type("form")
      .send({
        code: "EDIT-101",
        title: "After Edit Course Title",
        semester: 2,
      });

    expect([302, 200]).toContain(res.status);
    const updated = await courseRepository.findById(course.code);
    expect(updated.title).toBe("After Edit Course Title");

    await courseRepository.delete(course.code);
  });

  test("CacheService: sets, gets, deletes, and handles wrap with TTL", async () => {
    const testKey = "unilib:test:cache_probe_" + Date.now();
    await cacheService.set(testKey, { sample: 42, text: "Unilib Cache" }, 10);
    
    const cached = await cacheService.get(testKey);
    expect(cached).toBeDefined();
    expect(cached.sample).toBe(42);

    await cacheService.del(testKey);
    const afterDel = await cacheService.get(testKey);
    expect(afterDel).toBeNull();

    // Wrap test
    let executed = 0;
    const wrapKey = "unilib:test:wrap_" + Date.now();
    const fetcher = async () => {
      executed++;
      return { computed: true, time: Date.now() };
    };

    const first = await cacheService.wrap(wrapKey, 10, fetcher);
    expect(first.computed).toBe(true);
    expect(executed).toBe(1);

    const second = await cacheService.wrap(wrapKey, 10, fetcher);
    expect(second.computed).toBe(true);
    expect(executed).toBe(1); // Cached, fetcher not re-run
  });

  test("CourseRepository and ResourceService: end-to-end upload, linking, and streaming", async () => {
    // 1. Clean previous leftovers & create a course
    await courseRepository.delete("TEST-201");
    await resourceRepository.deleteByCourseCode("TEST-201");
    const course = await courseRepository.create({
      code: "TEST-201",
      title: "Automated Software Systems",
      semester: 7,
    });
    expect(course).toBeDefined();
    expect(course.code).toBe("TEST-201");

    // 2. Upload an Assignment resource
    const qBuffer = Buffer.from("%PDF-1.4 Mock PDF Question Content");
    const assignment = await resourceService.uploadResource({
      courseCode: course.code,
      type: "quiz_assignment",
      title: "Assignment 1 - Integration Testing",
      description: "Submit before Friday midnight",
      file: {
        originalname: "assignment_1.pdf",
        buffer: qBuffer,
        mimetype: "application/pdf",
        size: qBuffer.length,
      },
      uploaderId: "admin",
    });
    expect(assignment).toBeDefined();
    expect(assignment.title).toBe("Assignment 1 - Integration Testing");

    // 3. Upload a Solution linked to that assignment
    const sBuffer = Buffer.from("%PDF-1.4 Mock PDF Solution Content");
    const solution = await resourceService.uploadResource({
      courseCode: course.code,
      type: "solution",
      title: "Assignment 1 - Solution Key",
      description: "Official solution and grading rubric",
      parentResourceId: assignment.id,
      file: {
        originalname: "assignment_1_sol.pdf",
        buffer: sBuffer,
        mimetype: "application/pdf",
        size: sBuffer.length,
      },
      uploaderId: "admin",
    });
    expect(solution).toBeDefined();
    expect(solution.parent_resource_id).toBe(assignment.id);

    // 4. Retrieve course details with resources
    const details = await resourceService.getCourseWithResources("TEST-201");
    expect(details).toBeDefined();
    expect(details.resources.quizzesAssignments.length).toBe(1);
    expect(details.resources.quizzesAssignments[0].solutions.length).toBe(1);
    expect(details.resources.quizzesAssignments[0].solutions[0].title).toBe("Assignment 1 - Solution Key");

    // 4b. Verify Homepage data nests solution under Quiz/Assignment
    await cacheService.del("unilib:homepage:summary");
    const homeData = await resourceService.getHomepageData();
    const testAssignment = homeData.allMaterials.find(m => m.id === assignment.id);
    expect(testAssignment).toBeDefined();
    expect(testAssignment.solutions.length).toBe(1);
    expect(testAssignment.solutions[0].id).toBe(solution.id);
    expect(testAssignment.solutions[0].title).toBe("Assignment 1 - Solution Key");

    // Ensure the linked solution is not duplicated as a standalone top-level card
    const duplicateSol = homeData.allMaterials.find(m => m.id === solution.id);
    expect(duplicateSol).toBeUndefined();

    // 4c. Verify Homepage HTML renders the linked solution under the quiz
    const homeHtml = await request(app).get("/").set("User-Agent", BROWSER_UA);
    expect(homeHtml.status).toBe(200);
    expect(homeHtml.text).toContain("Linked Solution");
    expect(homeHtml.text).toContain("Assignment 1 - Solution Key");

    // 5. Test public download stream
    try {
      const dlRes = await request(app)
        .get(`/resources/${assignment.id}/download`)
        .set("User-Agent", BROWSER_UA);

      expect(dlRes.status).toBe(200);
      expect(dlRes.headers["content-disposition"]).toContain("attachment");
    } catch (err) {
      console.error("Failed on download stream:", err);
      throw err;
    }

    // 6. Test public preview stream
    try {
      const prevRes = await request(app)
        .get(`/resources/${assignment.id}/preview`)
        .set("User-Agent", BROWSER_UA);

      expect(prevRes.status).toBe(200);
      expect(prevRes.headers["content-disposition"]).toContain("inline");
    } catch (err) {
      console.error("Failed on preview stream:", err);
      throw err;
    }

    // Clean up
    await resourceService.deleteResource(solution.id);
    await resourceService.deleteResource(assignment.id);
    await courseRepository.delete(course.id);
  });

  test("Course resource chapter page slicing: upload with sections, download/preview extracted PDF slices", async () => {
    // 1. Create a dummy multi-page PDF (6 pages)
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 6; i++) {
      doc.addPage([400, 600]);
    }
    const pdfBytes = await doc.save();
    const pdfBuffer = Buffer.from(pdfBytes);

    // 2. Ensure course exists
    let course = await courseRepository.findByCode("CPE-LAB");
    if (!course) {
      course = await courseRepository.create({
        code: "CPE-LAB",
        title: "Microprocessor Lab Course",
        semester: 3,
      });
    }

    // 3. Upload resource with 2 chapters / sections
    const sections = [
      { id: "sec-1", title: "Chapter 1: 8086 Assembly Setup", start_page: 1, end_page: 2 },
      { id: "sec-2", title: "Chapter 2: Arithmetic Instructions", start_page: 3, end_page: 5 },
    ];

    const manual = await resourceService.uploadResource({
      courseCode: "CPE-LAB",
      type: "lab_manual",
      title: "ECE301 Microprocessors Complete Laboratory Manual",
      description: "Complete laboratory manual with 10 chapters",
      sections,
      file: {
        originalname: "microprocessor_lab_manual.pdf",
        buffer: pdfBuffer,
        mimetype: "application/pdf",
        size: pdfBuffer.length,
      },
      uploaderId: "admin",
    });

    expect(manual.id).toBeDefined();
    expect(manual.has_sections).toBe(true);
    expect(manual.sections_count).toBe(2);
    expect(manual.sections[0].title).toBe("Chapter 1: 8086 Assembly Setup");
    expect(manual.sections[0].page_count).toBe(2);
    expect(manual.sections[1].page_count).toBe(3);

    // 4. Test public download for section 1 (pages 1-2)
    const sec1Dl = await request(app)
      .get(`/resources/${manual.id}/sections/sec-1/download`)
      .set("User-Agent", BROWSER_UA);

    expect(sec1Dl.status).toBe(200);
    expect(sec1Dl.headers["content-type"]).toBe("application/pdf");
    expect(sec1Dl.headers["content-disposition"]).toContain("attachment");
    expect(sec1Dl.headers["content-disposition"]).toContain("Chapter_1");
    expect(sec1Dl.headers["content-disposition"]).toContain("p1-2.pdf");

    // Verify extracted PDF actually has 2 pages
    const sec1Doc = await PDFDocument.load(sec1Dl.body);
    expect(sec1Doc.getPageCount()).toBe(2);

    // 5. Test public preview for section 2 (pages 3-5)
    const sec2Prev = await request(app)
      .get(`/resources/${manual.id}/sections/sec-2/preview`)
      .set("User-Agent", BROWSER_UA);

    expect(sec2Prev.status).toBe(200);
    expect(sec2Prev.headers["content-type"]).toBe("application/pdf");
    expect(sec2Prev.headers["content-disposition"]).toContain("inline");

    const sec2Doc = await PDFDocument.load(sec2Prev.body);
    expect(sec2Doc.getPageCount()).toBe(3);

    // 6. Test invalid section ID returns 404
    const notFoundSec = await request(app)
      .get(`/resources/${manual.id}/sections/sec-999/download`)
      .set("User-Agent", BROWSER_UA);
    expect(notFoundSec.status).toBe(404);

    // 7. Verify course page HTML renders the chapter slice drawer
    await cacheService.delPattern("*");
    const courseRes = await request(app)
      .get("/courses/CPE-LAB")
      .set("User-Agent", BROWSER_UA);

    expect(courseRes.status).toBe(200);
    expect(courseRes.text).toContain("Chapters (2)");
    expect(courseRes.text).toContain("Chapter 1: 8086 Assembly Setup");
    expect(courseRes.text).toContain("Pages 1–2");
    expect(courseRes.text).toContain(`/resources/${manual.id}/sections/sec-1/download`);

    // 8. Test updating sections via updateResource
    const updatedSections = [
      { id: "sec-1", title: "Chapter 1: Updated Setup", start_page: 1, end_page: 3 },
      { id: "sec-2", title: "Chapter 2: Advanced Arithmetic", start_page: 4, end_page: 6 },
    ];
    const updated = await resourceService.updateResource(manual.id, {
      sections: updatedSections,
    });
    expect(updated.sections[0].title).toBe("Chapter 1: Updated Setup");
    expect(updated.sections[0].page_count).toBe(3);

    // Verify downloaded section 1 now extracts 3 pages
    const sec1UpdatedDl = await request(app)
      .get(`/resources/${manual.id}/sections/sec-1/download`)
      .set("User-Agent", BROWSER_UA);
    expect(sec1UpdatedDl.status).toBe(200);
    expect(sec1UpdatedDl.headers["accept-ranges"]).toBe("bytes");
    const sec1UpdatedDoc = await PDFDocument.load(sec1UpdatedDl.body);
    expect(sec1UpdatedDoc.getPageCount()).toBe(3);

    // 9. Verify HTTP Byte Range Request (206 Partial Content) for slow internet & PDF streaming
    const rangeRes = await request(app)
      .get(`/resources/${manual.id}/sections/sec-1/download`)
      .set("User-Agent", BROWSER_UA)
      .set("Range", "bytes=0-15");
    expect(rangeRes.status).toBe(206);
    expect(rangeRes.headers["accept-ranges"]).toBe("bytes");
    expect(rangeRes.headers["content-range"]).toMatch(/^bytes 0-15\/\d+$/);
    expect(rangeRes.body.length).toBe(16);

    // 10. Verify 304 Not Modified when ETag matches (0 byte roundtrip on slow connections)
    const etag = sec1UpdatedDl.headers["etag"];
    expect(etag).toBeDefined();
    const cachedRes = await request(app)
      .get(`/resources/${manual.id}/sections/sec-1/download`)
      .set("User-Agent", BROWSER_UA)
      .set("If-None-Match", etag);
    expect(cachedRes.status).toBe(304);

    // Clean up
    await resourceService.deleteResource(manual.id);
    await courseRepository.delete(course.id);
  });

  test("Visibility control and views count tracking", async () => {
    // 0. Clean up any previous test remnants
    const existing = await courseRepository.findByCode("VIS-101");
    if (existing) {
      await courseRepository.delete(existing.id);
    }

    // 1. Create a course
    const course = await courseRepository.create({
      code: "VIS-101",
      title: "Visibility and Metrics Course",
      semester: 3,
      description: "Testing visibility control and views metrics",
    });

    // 2. Upload a hidden resource (is_visible: false)
    const hiddenPdf = Buffer.from("%PDF-1.4 Mock PDF Content");
    const hiddenResource = await resourceService.uploadResource({
      courseCode: "VIS-101",
      type: "textbook",
      title: "Secret Draft Syllabus",
      description: "Faculty eyes only until semester start",
      isVisible: false,
      file: {
        originalname: "draft_syllabus.pdf",
        buffer: hiddenPdf,
        mimetype: "application/pdf",
        size: hiddenPdf.length,
      },
      uploaderId: "admin",
    });

    expect(hiddenResource).toBeDefined();
    expect(hiddenResource.is_visible).toBe(false);
    expect(hiddenResource.views_count).toBe(0);

    // 3. Verify hidden resource does NOT appear in public course resources
    await cacheService.delPattern("*");
    const courseDetails = await resourceService.getCourseWithResources("VIS-101");
    expect(courseDetails.resources.textbooks.find((t) => t.id === hiddenResource.id)).toBeUndefined();

    // 4. Verify public course page HTML does NOT contain the hidden title
    const publicCoursePage = await request(app)
      .get("/courses/VIS-101")
      .set("User-Agent", BROWSER_UA);
    expect(publicCoursePage.status).toBe(200);
    expect(publicCoursePage.text).not.toContain("Secret Draft Syllabus");

    // 5. Verify admin query with includeHidden: true DOES find the hidden resource
    const allForAdmin = await resourceRepository.findAllWithCourses({
      course_code: "VIS-101",
      includeHidden: true,
    });
    const foundAdminItem = allForAdmin.find((r) => r.id === hiddenResource.id);
    expect(foundAdminItem).toBeDefined();
    expect(foundAdminItem.is_visible).toBe(false);

    // 6. Toggle visibility to true
    const toggled = await resourceRepository.toggleVisibility(hiddenResource.id);
    expect(toggled).toBeDefined();
    expect(toggled.is_visible).toBe(true);
    await resourceService.invalidateCourseCaches("VIS-101");

    // 7. Verify resource is now visible on public course page
    const publicCoursePageAfter = await request(app)
      .get("/courses/VIS-101")
      .set("User-Agent", BROWSER_UA);
    expect(publicCoursePageAfter.status).toBe(200);
    expect(publicCoursePageAfter.text).toContain("Secret Draft Syllabus");

    // 8. Test views tracking: preview and download should increment views_count
    const previewRes = await request(app)
      .get(`/resources/${hiddenResource.id}/preview`)
      .set("User-Agent", BROWSER_UA);
    expect(previewRes.status).toBe(200);

    const downloadRes = await request(app)
      .get(`/resources/${hiddenResource.id}/download`)
      .set("User-Agent", BROWSER_UA);
    expect(downloadRes.status).toBe(200);

    // Allow async increment to commit
    await new Promise((resolve) => setTimeout(resolve, 150));

    const updatedResource = await resourceRepository.findById(hiddenResource.id);
    expect(updatedResource.views_count).toBeGreaterThanOrEqual(2);

    // 9. Verify homepage data stats exposes views
    await cacheService.delPattern("*");
    const homepageData = await resourceService.getHomepageData();
    expect(homepageData.stats).toBeDefined();
    expect(homepageData.stats.views).toBeDefined();
    expect(typeof homepageData.stats.views).toBe("number");

    // Clean up
    await resourceService.deleteResource(hiddenResource.id);
    await courseRepository.delete(course.id);
  });

  test("Textbooks can refer to and nest solution books bi-directionally", async () => {
    // 1. Create a course
    const course = await courseRepository.create({
      code: "MTH-201",
      title: "Multivariable Calculus",
      semester: 2,
    });

    const dummyPdf = Buffer.from("%PDF-1.4 Multivariable Calculus Dummy PDF");

    // 2. Upload a textbook
    const textbook = await resourceService.uploadResource({
      courseCode: "MTH-201",
      type: "textbook",
      title: "Thomas Calculus 11th Edition",
      description: "Standard engineering mathematics reference",
      isVisible: true,
      file: {
        originalname: "thomas_calculus_11th.pdf",
        buffer: dummyPdf,
        mimetype: "application/pdf",
        size: dummyPdf.length,
      },
      uploaderId: "admin",
    });

    // 3. Upload a solution book linked to the textbook
    const solution = await resourceService.uploadResource({
      courseCode: "MTH-201",
      type: "solution",
      title: "Thomas Calculus 11th Edition Solutions Manual",
      description: "Complete worked solutions for all exercises",
      parentResourceId: textbook.id,
      isVisible: true,
      file: {
        originalname: "thomas_calculus_solution.pdf",
        buffer: dummyPdf,
        mimetype: "application/pdf",
        size: dummyPdf.length,
      },
      uploaderId: "admin",
    });

    // 4. Test repository helper methods
    const linkableParents = await resourceRepository.findLinkableParents("MTH-201");
    expect(linkableParents.some((p) => p.id === textbook.id && p.type === "textbook")).toBe(true);

    const availableSolutions = await resourceRepository.findAvailableSolutions("MTH-201");
    expect(availableSolutions.some((s) => s.id === solution.id && s.type === "solution")).toBe(true);

    const linkedSol = await resourceRepository.findSolutionForTextbook(textbook.id);
    expect(linkedSol).toBeDefined();
    expect(linkedSol.id).toBe(solution.id);

    // 5. Verify getCourseWithResources nests solution under textbook
    await cacheService.delPattern("*");
    const courseDetails = await resourceService.getCourseWithResources("MTH-201");
    expect(courseDetails.resources.textbooks.length).toBe(1);
    const tb = courseDetails.resources.textbooks[0];
    expect(tb.id).toBe(textbook.id);
    expect(tb.solutions.length).toBe(1);
    expect(tb.solutions[0].id).toBe(solution.id);
    expect(tb.solutions[0].title).toBe("Thomas Calculus 11th Edition Solutions Manual");
    expect(courseDetails.resources.standaloneSolutions.length).toBe(0);

    // 6. Verify Course HTML page renders Solution Included pill and attached drawer
    const courseRes = await request(app)
      .get("/courses/MTH-201")
      .set("User-Agent", BROWSER_UA);
    expect(courseRes.status).toBe(200);
    expect(courseRes.text).toContain("Solution Included");
    expect(courseRes.text).toContain("Thomas Calculus 11th Edition Solutions Manual");
    expect(courseRes.text).toContain("Verified Solution");

    // 7. Test unlinking and relinking
    await resourceRepository.unlinkSolutionsFromParent(textbook.id);
    const unlinkedCheck = await resourceRepository.findSolutionForTextbook(textbook.id);
    expect(unlinkedCheck).toBeNull();

    await resourceRepository.setParentForSolution(solution.id, textbook.id);
    const relinkedCheck = await resourceRepository.findSolutionForTextbook(textbook.id);
    expect(relinkedCheck).toBeDefined();
    expect(relinkedCheck.id).toBe(solution.id);

    // Clean up
    await resourceService.deleteResource(solution.id);
    await resourceService.deleteResource(textbook.id);
    await courseRepository.delete(course.id);
  });

  test("Backend smart routing for single download button based on Google Drive status", async () => {
    // 0. Ensure clean state
    const existingCourse = await courseRepository.findByCode("MIR-101");
    if (existingCourse) await courseRepository.delete(existingCourse.id);

    // 1. Create a course
    const course = await courseRepository.create({
      code: "MIR-101",
      title: "Network Mirror Systems",
      semester: 3,
    });

    let textbook = null;
    try {
      const dummyPdf = Buffer.from("%PDF-1.4 Mirror Test PDF Content");
      const testDriveUrl = "https://drive.google.com/file/d/15-testdriveid999/view?usp=sharing";

      // 2. Upload a textbook with a Google Drive companion URL
      textbook = await resourceService.uploadResource({
        courseCode: "MIR-101",
        type: "textbook",
        title: "Computer Networks Tanenbaum 5th Ed",
        description: "Comprehensive guide to network protocols and firewall topologies",
        driveUrl: testDriveUrl,
        isVisible: true,
        file: {
          originalname: "computer_networks.pdf",
          buffer: dummyPdf,
          mimetype: "application/pdf",
          size: dummyPdf.length,
        },
        uploaderId: "admin",
      });

      expect(textbook).toBeDefined();
      expect(textbook.drive_url).toBe(testDriveUrl);

      // 3. Verify repository findById returns drive_url
      const fetched = await resourceRepository.findById(textbook.id);
      expect(fetched.drive_url).toBe(testDriveUrl);

      // 4. Verify course page renders a SINGLE download button and preview button (no duplicated mirror buttons)
      await cacheService.delPattern("*");
      const coursePage = await request(app)
        .get("/courses/MIR-101")
        .set("User-Agent", BROWSER_UA);

      expect(coursePage.status).toBe(200);
      expect(coursePage.text).toContain('data-has-drive="true"');
      expect(coursePage.text).toContain(`/resources/${textbook.id}/download`);
      expect(coursePage.text).toContain(`/resources/${textbook.id}/preview`);
      expect(coursePage.text).toContain("networkStatusIndicator");
      expect(coursePage.text).toContain("driveBlockedBanner");

      // 5. Backend Smart Routing:
      // Case A: When Google Drive is reachable (default, or cookie gdrive_status=ok), backend redirects to Drive
      const defaultDownloadRes = await request(app)
        .get(`/resources/${textbook.id}/download`)
        .set("User-Agent", BROWSER_UA);

      expect(defaultDownloadRes.status).toBe(302);
      expect(defaultDownloadRes.header.location).toBe(
        "https://drive.usercontent.google.com/uc?id=15-testdriveid999&export=download"
      );

      const defaultPreviewRes = await request(app)
        .get(`/resources/${textbook.id}/preview`)
        .set("User-Agent", BROWSER_UA);

      expect(defaultPreviewRes.status).toBe(302);
      expect(defaultPreviewRes.header.location).toBe(testDriveUrl);

      // Case B: When Google Drive is blocked (campus firewall detected via cookie gdrive_status=blocked)
      // Backend automatically serves the file directly from MBKBucket storage
      const blockedDownloadRes = await request(app)
        .get(`/resources/${textbook.id}/download`)
        .set("Cookie", "gdrive_status=blocked")
        .set("User-Agent", BROWSER_UA);

      expect(blockedDownloadRes.status).toBe(200);
      expect(blockedDownloadRes.header["content-disposition"]).toContain("attachment");
      expect(blockedDownloadRes.header["content-type"]).toContain("application/pdf");
      expect(blockedDownloadRes.body.toString()).toContain("%PDF-1.4 Mirror Test PDF Content");

      // Case C: Preview when Google Drive is blocked
      const blockedPreviewRes = await request(app)
        .get(`/resources/${textbook.id}/preview`)
        .set("Cookie", "gdrive_status=blocked")
        .set("User-Agent", BROWSER_UA);

      expect(blockedPreviewRes.status).toBe(200);
      expect(blockedPreviewRes.header["content-disposition"]).toContain("inline");
      expect(blockedPreviewRes.header["content-type"]).toContain("application/pdf");

      // Case D: Explicit query override (?source=mbkbucket)
      const overrideDownloadRes = await request(app)
        .get(`/resources/${textbook.id}/download?source=mbkbucket`)
        .set("User-Agent", BROWSER_UA);

      expect(overrideDownloadRes.status).toBe(200);
      expect(overrideDownloadRes.header["content-disposition"]).toContain("attachment");

      // 6. Verify /api/health endpoint
      const healthRes = await request(app)
        .get("/api/health")
        .set("User-Agent", BROWSER_UA);

      expect(healthRes.status).toBe(200);
      expect(healthRes.body.data.storage).toBe("connected");

      // 7. Verify client network-verifier script is served
      const scriptRes = await request(app)
        .get("/assets/js/network-verifier.js")
        .set("User-Agent", BROWSER_UA);

      expect(scriptRes.status).toBe(200);
      expect(scriptRes.text).toContain("probeGoogleDrive");
      expect(scriptRes.text).toContain("gdrive_status");
    } finally {
      if (textbook) await resourceService.deleteResource(textbook.id);
      await courseRepository.delete(course.id);
    }
  }, 30000);

  test("Visual Page-by-Page PDF Slicer Studio: renders UI, returns PDF page count, and saves chapter slices", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const doc = await PDFDocument.create();
    for (let i = 1; i <= 8; i++) {
      doc.addPage([400, 600]);
    }
    const pdfBuffer = Buffer.from(await doc.save());

    await courseRepository.delete("SLC-101");
    const course = await courseRepository.create({
      code: "SLC-101",
      title: "Visual Slicer Test Course",
      semester: 2,
    });

    let book = null;
    try {
      book = await resourceService.uploadResource({
        courseCode: "SLC-101",
        type: "textbook",
        title: "Digital Logic Design Complete Book",
        file: {
          originalname: "dld_book.pdf",
          buffer: pdfBuffer,
          mimetype: "application/pdf",
          size: pdfBuffer.length,
        },
        uploaderId: "admin",
      });

      // 1. GET /admin/slicer and GET /admin/resources/:id/slicer render the standalone Visual PDF Slicer page
      const slicerTabPage = await request(app)
        .get("/admin/slicer")
        .set("User-Agent", BROWSER_UA)
        .set("x-test-auth-role", "admin");
      expect(slicerTabPage.status).toBe(200);
      expect(slicerTabPage.text).toContain("Visual PDF Chapter Slicer");

      const slicerPage = await request(app)
        .get(`/admin/resources/${book.id}/slicer`)
        .set("User-Agent", BROWSER_UA)
        .set("x-test-auth-role", "admin");

      expect(slicerPage.status).toBe(200);
      expect(slicerPage.text).toContain("pdfSlicerStudioRoot");
      expect(slicerPage.text).toContain("/assets/js/pdf-slicer.js");
      expect(slicerPage.text).toContain("Digital Logic Design Complete Book");

      // 2. GET /admin/resources/:id/pdf-info returns accurate page count (8 pages)
      const infoRes = await request(app)
        .get(`/admin/resources/${book.id}/pdf-info`)
        .set("User-Agent", BROWSER_UA)
        .set("x-test-auth-role", "admin");

      expect(infoRes.status).toBe(200);
      expect(infoRes.body.success).toBe(true);
      expect(infoRes.body.data.pageCount).toBe(8);

      // 3. POST /admin/resources/:id/slicer saves slices selected via the visual page-by-page tool
      const newSlices = [
        { id: "sec-1", title: "Chapter 1: Binary Systems", start_page: 1, end_page: 3 },
        { id: "sec-2", title: "Chapter 2: Boolean Algebra", start_page: 4, end_page: 8 },
      ];
      const saveRes = await request(app)
        .post(`/admin/resources/${book.id}/slicer`)
        .set("User-Agent", BROWSER_UA)
        .set("x-test-auth-role", "admin")
        .set("Accept", "application/json")
        .send({ sections: JSON.stringify(newSlices) });

      expect(saveRes.status).toBe(200);
      expect(saveRes.body.success).toBe(true);
      expect(saveRes.body.data.sectionsCount).toBe(2);

      // 4. Verify saved slices can be downloaded and have exact page counts
      const ch2Dl = await request(app)
        .get(`/resources/${book.id}/sections/sec-2/download`)
        .set("User-Agent", BROWSER_UA);
      expect(ch2Dl.status).toBe(200);
      const ch2Pdf = await PDFDocument.load(ch2Dl.body);
      expect(ch2Pdf.getPageCount()).toBe(5);
    } finally {
      if (book) await resourceService.deleteResource(book.id);
      await courseRepository.delete(course.id);
    }
  });

  test("Chapter/Slice Google Drive & MBKBucket health checking and smart routing", async () => {
    const { PDFDocument } = await import("pdf-lib");

    // 0. Clean up any existing course
    const existing = await courseRepository.findByCode("SEC-101");
    if (existing) await courseRepository.delete(existing.id);

    // 1. Create test course
    const course = await courseRepository.create({
      code: "SEC-101",
      title: "Section Slicing & Storage Health",
      semester: 4,
    });

    let textbook = null;
    try {
      // Create a valid 4-page PDF
      const pdfDoc = await PDFDocument.create();
      for (let i = 0; i < 4; i++) pdfDoc.addPage([400, 600]);
      const pdfBuffer = Buffer.from(await pdfDoc.save());

      const parentDriveUrl = "https://drive.google.com/file/d/15-parentmirror999/view?usp=sharing";
      const chapter1DriveUrl = "https://drive.google.com/file/d/15-chapter1mirror888/view?usp=sharing";

      // 2. Upload textbook with chapters
      textbook = await resourceService.uploadResource({
        courseCode: "SEC-101",
        type: "textbook",
        title: "Distributed Operating Systems",
        driveUrl: parentDriveUrl,
        sections: [
          {
            id: "sec-1",
            title: "Chapter 1: Architectures",
            start_page: 1,
            end_page: 2,
            drive_url: chapter1DriveUrl,
          },
          {
            id: "sec-2",
            title: "Chapter 2: RPC and Messaging",
            start_page: 3,
            end_page: 4,
          },
        ],
        isVisible: true,
        file: {
          originalname: "distributed_os.pdf",
          buffer: pdfBuffer,
          mimetype: "application/pdf",
          size: pdfBuffer.length,
        },
        uploaderId: "admin",
      });

      expect(textbook).toBeDefined();
      expect(textbook.sections).toHaveLength(2);
      expect(textbook.sections[0].drive_url).toBe(chapter1DriveUrl);
      expect(textbook.sections[1].drive_url).toBeNull();

      // 3. Verify course page renders data-has-drive="true" on slice items and displays mirror tag
      await cacheService.delPattern("*");
      const coursePage = await request(app)
        .get("/courses/SEC-101")
        .set("User-Agent", BROWSER_UA);

      expect(coursePage.status).toBe(200);
      expect(coursePage.text).toContain(`data-section-id="sec-1"`);
      expect(coursePage.text).toContain("Drive Mirror");
      expect(coursePage.text).toContain(`/resources/${textbook.id}/sections/sec-1/download`);
      expect(coursePage.text).toContain(`/resources/${textbook.id}/sections/sec-1/preview`);

      // 4. Chapter 1 with companion Drive URL:
      // Case A: When Google Drive is reachable (default), download & preview redirect to Chapter 1's Drive companion
      const ch1DownloadDefault = await request(app)
        .get(`/resources/${textbook.id}/sections/sec-1/download`)
        .set("User-Agent", BROWSER_UA);
      expect(ch1DownloadDefault.status).toBe(302);
      expect(ch1DownloadDefault.header.location).toBe(
        "https://drive.usercontent.google.com/uc?id=15-chapter1mirror888&export=download"
      );

      const ch1PreviewDefault = await request(app)
        .get(`/resources/${textbook.id}/sections/sec-1/preview`)
        .set("User-Agent", BROWSER_UA);
      expect(ch1PreviewDefault.status).toBe(302);
      expect(ch1PreviewDefault.header.location).toBe(chapter1DriveUrl);

      // Case B: When Google Drive is blocked (cookie gdrive_status=blocked), chapter automatically serves slice from MBKBucket storage
      const ch1DownloadBlocked = await request(app)
        .get(`/resources/${textbook.id}/sections/sec-1/download`)
        .set("Cookie", "gdrive_status=blocked")
        .set("User-Agent", BROWSER_UA);
      expect(ch1DownloadBlocked.status).toBe(200);
      expect(ch1DownloadBlocked.header["content-type"]).toBe("application/pdf");
      expect(ch1DownloadBlocked.header["content-disposition"]).toContain("attachment");
      expect(ch1DownloadBlocked.header["content-disposition"]).toContain("Chapter_1_Architectures");

      const ch1Doc = await PDFDocument.load(ch1DownloadBlocked.body);
      expect(ch1Doc.getPageCount()).toBe(2);

      // Case C: Explicit ?source=mbkbucket override
      const ch1Override = await request(app)
        .get(`/resources/${textbook.id}/sections/sec-1/download?source=mbkbucket`)
        .set("User-Agent", BROWSER_UA);
      expect(ch1Override.status).toBe(200);
      expect(ch1Override.header["content-type"]).toBe("application/pdf");

      // 5. Chapter 2 without its own Drive URL:
      // Case A: Standard request slices from MBKBucket storage
      const ch2DownloadDefault = await request(app)
        .get(`/resources/${textbook.id}/sections/sec-2/download`)
        .set("User-Agent", BROWSER_UA);
      expect(ch2DownloadDefault.status).toBe(200);
      expect(ch2DownloadDefault.header["content-type"]).toBe("application/pdf");
      const ch2Doc = await PDFDocument.load(ch2DownloadDefault.body);
      expect(ch2Doc.getPageCount()).toBe(2);

      // Case B: Chapter without its own Drive URL slices directly from MBKBucket storage, never redirecting to whole parent book
      const ch2Preview = await request(app)
        .get(`/resources/${textbook.id}/sections/sec-2/preview`)
        .set("User-Agent", BROWSER_UA);
      expect(ch2Preview.status).toBe(200);
      expect(ch2Preview.header["content-type"]).toBe("application/pdf");
      expect(ch2Preview.header["content-disposition"]).toContain("inline");
      const ch2PrevDoc = await PDFDocument.load(ch2Preview.body);
      expect(ch2PrevDoc.getPageCount()).toBe(2);

      // 6. Verify client network-verifier supports slice updating and dual health check
      const scriptRes = await request(app)
        .get("/assets/js/network-verifier.js")
        .set("User-Agent", BROWSER_UA);
      expect(scriptRes.status).toBe(200);
      expect(scriptRes.text).toContain("updateSliceButtons");
      expect(scriptRes.text).toContain("probeMBKBucket");
      expect(scriptRes.text).toContain("probeGoogleDrive");
    } finally {
      if (textbook) await resourceService.deleteResource(textbook.id);
      await courseRepository.delete(course.id);
    }
  });

  test("getResourcePdfBuffer fetches and slices from Google Drive / remote URL when storage is absent", async () => {
    const { PDFDocument } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.create();
    for (let i = 0; i < 5; i++) pdfDoc.addPage([400, 600]);
    const mockPdfBuffer = Buffer.from(await pdfDoc.save());

    // Mock fetchRemotePdfBuffer on resourceService for deterministic test
    const origFetch = resourceService.fetchRemotePdfBuffer;
    resourceService.fetchRemotePdfBuffer = async (url) => {
      if (url === "https://drive.google.com/file/d/test-drive-mock/view") {
        return mockPdfBuffer;
      }
      return null;
    };

    try {
      const mockResource = {
        id: 9999,
        file_key: "non_existent_bucket_key.pdf",
        drive_url: "https://drive.google.com/file/d/test-drive-mock/view",
        file_name: "test_drive_document.pdf",
        file_size: mockPdfBuffer.length,
      };

      const buffer = await resourceService.getResourcePdfBuffer(mockResource);
      expect(buffer).toBeDefined();
      expect(buffer.length).toBe(mockPdfBuffer.length);

      const { pdfSliceService } = await import("../src/services/pdf-slice.service.js");
      const sliced = await pdfSliceService.extractPageRange(buffer, 2, 4);
      expect(sliced.pageCount).toBe(3);
    } finally {
      resourceService.fetchRemotePdfBuffer = origFetch;
    }
  });
});
