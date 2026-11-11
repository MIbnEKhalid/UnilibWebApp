#!/usr/bin/env node
/**
 * Register this application's declared permissions in the centralized
 * mbkauthe permission catalog.
 *
 * Automatically triggered by ecosystem's root `init.mjs` or manually via:
 *     npm run sync_permissions
 */
import dotenv from "dotenv";
dotenv.config();

const { syncTemplatePermissions } = await import("../src/permissions.js");

try {
  const result = await syncTemplatePermissions();

  if (!result) {
    console.warn("⚠️ Permission catalog sync skipped or catalog unavailable.");
    process.exit(0);
  }

  console.log(`✅ Synced ${result.synced} permission(s) for app "${result.appKey}" (roles: ${result.rolesSynced || 0}).`);
  process.exit(0);
} catch (err) {
  console.warn("⚠️ Permission sync warning:", err?.message || err);
  process.exit(0);
}
