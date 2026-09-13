/**
 * UnilibWebApp — permission manifest.
 *
 * Declares the archive's permission surface. App key resolution, permission
 * prefixing and catalog sync are handled by mbkauthe's helpers
 * (`definePermissions` / `syncAppPermissions`).
 *
 * Feature → route mapping:
 *   books     -> /dashboard/Book/* + /api/admin/Unilib/Book/*  (CRUD + export)
 *   sections  -> /dashboard/Book/:bookId/Sections/*            (CRUD)
 *   materials -> /dashboard/Materials + subject/material admin + tasjeel sync
 *   dbadmin   -> /dashboard/db (admindb UI, superadmin)
 */
import { definePermissions, syncAppPermissions } from "mbkauthe";

const MANIFEST = {
  storage: {
    view: "View bucket files",
    upload: "Upload bucket files",
    delete: "Delete bucket files",
  },
  books: {
    view: "View the books dashboard",
    create: "Add books",
    edit: "Edit books / toggle visibility",
    delete: "Delete books",
    export: "Export book data",
  },
  sections: {
    view: "View sections",
    create: "Add sections",
    edit: "Edit sections",
    delete: "Delete sections",
  },
  materials: {
    view: "View materials and subjects",
    manage: "Manage subjects and materials",
    sync: "Sync from Tasjeel",
  },
  admindb: {
    access: "Access the database admin UI",
  },
};

const ROLES = {
  admin: {
    label: "Library Administrator",
    description: "Library administration excluding destructive raw database access",
    permissions: ["books:*", "sections:*", "materials:*", "storage:view", "storage:upload"],
  },
  normaluser: {
    label: "Library Member",
    description: "View books, sections, materials, and library resources",
    permissions: ["books:view", "sections:view", "materials:view", "storage:view"],
  },
};

export const Permissions = definePermissions(MANIFEST, { fallbackAppKey: "unilib", roles: ROLES });

/** Register this app's permissions & roles in the catalog (idempotent, best-effort). */
export async function syncUnilibPermissions() {
  try {
    const result = await syncAppPermissions(Permissions, { fallbackAppKey: "unilib" });
    console.log(`[unilib] Permissions & roles synced (${result.synced} permissions, ${result.rolesSynced} roles)`);
    return result;
  } catch (err) {
    console.warn("[unilib] Permission catalog sync skipped:", err?.message || err);
    return null;
  }
}

export default Permissions;

