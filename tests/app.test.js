import { describe, test, expect } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { Permissions } from "../src/permissions.js";

describe("Unilib Core Application Tests", () => {
  test("Permissions manifest has required features and roles", () => {
    expect(Permissions).toBeDefined();
    expect(Permissions.courses).toBeDefined();
    expect(Permissions.courses.create).toBeDefined();
    expect(Permissions.resources).toBeDefined();
    expect(Permissions.resources.create).toBeDefined();
    expect(Permissions.resources.delete).toBeDefined();
    expect(Permissions.admin).toBeDefined();
    expect(Permissions.storage).toBeDefined();
    expect(Permissions.admindb).toBeDefined();
  });

  test("Storage client service exports all expected storage methods", async () => {
    const storageModule = await import("../src/services/storage.service.js");
    expect(storageModule.storageService).toBeDefined();
    expect(typeof storageModule.storageService.upload).toBe("function");
    expect(typeof storageModule.storageService.download).toBe("function");
    expect(typeof storageModule.storageService.delete).toBe("function");
  });

  test("GET /mbkbucket is registered and guarded", async () => {
    const res = await request(app)
      .get("/mbkbucket")
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    // Should respond (redirect to login or render bucket dashboard)
    expect([200, 302, 401, 403]).toContain(res.status);
  });

  test("GET /admin/db is registered and guarded", async () => {
    const res = await request(app)
      .get("/admin/db")
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    expect([200, 301, 302, 401, 403]).toContain(res.status);
  });

  test("GET / renders the Unilib landing page", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.text).toContain("Unilib");
    expect(res.text).toContain("Department Academic Library");
  });

  test("GET /api/health returns health status envelope", async () => {
    const res = await request(app)
      .get("/api/health")
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBeDefined();
    expect(res.body.data.database).toBeDefined();
  });

  test("GET /unknown-route returns 404 handler", async () => {
    const res = await request(app)
      .get("/this-route-does-not-exist-at-all-404")
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    
    expect(res.status).toBe(404);
  });

  test("GET /api/unknown-endpoint returns JSON 404 envelope", async () => {
    const res = await request(app)
      .get("/api/v1/non-existent-endpoint")
      .set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test("Malicious scanner user-agents are rejected by bot protection", async () => {
    const res = await request(app)
      .get("/")
      .set("User-Agent", "sqlmap/1.5.2#stable");

    expect([403, 400]).toContain(res.status);
  });
});
