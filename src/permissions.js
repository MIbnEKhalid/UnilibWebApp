/**
 * Unilib — Permission Manifest
 *
 * Declares Unilib's permission surface and role mappings using mbkauthe.
 * All public users (and normal users) can browse and download resources without restrictions.
 * Administrative operations (course creation/edit/deletion and resource upload/deletion)
 * require explicit server-side permissions guarded by sessPerm.
 */
import { definePermissions, syncAppPermissions } from "mbkauthe";

const MANIFEST = {
  courses: {
    create: "Create new courses",
    edit: "Edit existing courses",
    delete: "Delete courses and their resources",
  },
  resources: {
    create: "Upload and attach course resources",
    edit: "Edit resource details and associations",
    delete: "Delete resources and remove attached files",
  },
  admin: {
    view: "Access Unilib administrative area",
    manage: "Manage application settings and resources",
  },
  storage: {
    view: "View and download bucket files",
    upload: "Upload bucket files",
    delete: "Delete bucket files",
  },
  admindb: {
    access: "Access database management console",
  },
};

const ROLES = {
  admin: {
    label: "Application Administrator",
    description: "Full administrative access to courses, resources, storage, and database management",
    permissions: ["courses:*", "resources:*", "admin:*", "storage:*", "admindb:*"],
  },
  normaluser: {
    label: "Student / Classmate",
    description: "Standard student user (public browsing & downloads require no authentication)",
    permissions: ["storage:view"],
  },
};

export const Permissions = definePermissions(MANIFEST, {
  fallbackAppKey: "unilib",
  roles: ROLES,
});

/**
 * Register this app's permissions & roles in the centralized mbkauthe catalog.
 * Idempotent, safe to run anytime via `npm run sync_permissions`.
 */
export async function syncTemplatePermissions() {
  try {
    const result = await syncAppPermissions(Permissions, { fallbackAppKey: "unilib" });
    if (result) {
      console.log(`[unilib] Permissions & roles synced (${result.synced} permissions, ${result.rolesSynced} roles)`);
    }
    return result;
  } catch (err) {
    console.warn("[unilib] Permission catalog sync skipped:", err?.message || err);
    return null;
  }
}

export default Permissions;
