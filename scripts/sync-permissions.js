#!/usr/bin/env node
/**
 * Manually register UnilibWebApp's declared permissions in the permission
 * catalog.
 *
 * This is an administrative operation and is intentionally NOT run on server
 * startup — trigger it explicitly with:
 *
 *     npm run sync-permissions
 */
import dotenv from "dotenv";
dotenv.config();

const { syncUnilibPermissions } = await import("../src/permissions.js");

const result = await syncUnilibPermissions();

if (!result) {
  console.error("❌ Permission catalog sync did not run (catalog unavailable).");
  process.exit(1);
}

console.log(`✅ Synced ${result.synced} permission(s) for app "${result.appKey}" (deactivated: ${result.deactivated}).`);
process.exit(0);
