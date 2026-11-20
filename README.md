# Unilib — University Academic Resource Sharing Platform

**Unilib** is a clean, modern, fast, and easy-to-use university resource library built for classmates to access and share academic resources without friction.

Students can browse, search, preview, and download textbooks, lab manuals, assignments, quizzes, and solutions without logging in. Authorized administrators can upload, organize, edit, and delete materials with granular server-side permission checks.

---

## 🌟 Key Features

- **Public & Frictionless Access**:
  - No login required for students to browse courses, search topics, or download files.
  - Dedicated streaming and preview endpoints (`/resources/:id/download` and `/resources/:id/preview`).
- **Departmental Semester-First Structure**:
  - Instant navigation across **Semesters 1 through 8**.
  - Course cards showing course codes (e.g. `CPE2123`), titles, and material counts.
  - Pre-seeded core Computer Science / Engineering courses across all 8 semesters.
- **Categorized Academic Materials**:
  - 📘 **Textbooks & Reference Books** (PDF, EPUB)
  - 🔬 **Lab Manuals & Practical Guides** (PDF, DOCX, ZIP)
  - 📝 **Quizzes & Assignments** (Documents & Images)
  - 💡 **Solutions & Past Papers**: Supports both **linking directly to a parent assignment/quiz** and **standalone past paper solutions**.
- **Upstash Redis Caching**:
  - Powered by `ioredis` with support for Upstash Redis endpoints.
  - **Zero-config in-memory fallback**: If Redis is unconfigured or temporarily offline, seamlessly falls back to an internal TTL cache.
  - Automatic cache invalidation upon any course or resource mutation.
- **Object Storage (`mbkbucket`)**:
  - Multi-provider support (Local Disk `./data/storage`, Cloudflare R2, AWS S3).
  - Clean file cleanup on resource deletion to prevent orphaned files.
- **Authentication & RBAC (`mbkauthe`)**:
  - All public views open to all users.
  - Resource uploads, deletions, and course edits strictly protected via `sessPerm(Permissions.resources.create)`, etc.
  - Embedded Admin Console at `/admin` and visual Database Console at `/admin/db`.
- **Dual-Database Support**:
  - Embedded local **SQLite** (`better-sqlite3`) for zero-dependency development.
  - Scalable production **PostgreSQL** (Neon, Supabase, self-hosted).

---

## 📁 Project Architecture

```
d:\project\unilib\
├── .env                      # Active runtime environment configuration
├── .env.example              # Environment variables template
├── package.json              # Project dependencies & scripts
├── assets/
│   ├── css/                  # Application stylesheets
│   ├── images/               # Brand icons and images
│   └── js/                   # Browser-side scripts
├── src/
│   ├── app.js                # Express application setup & middleware stack
│   ├── server.js             # HTTP server entrypoint
│   ├── permissions.js        # mbkauthe RBAC permissions & roles manifest
│   ├── config/
│   │   ├── env.js            # Dotenv & runtime environment parser
│   │   └── view-engine.js    # Multi-engine Handlebars setup
│   ├── db/
│   │   ├── connection.js     # Pool connection helper
│   │   ├── index.js          # Dynamic SQLite / PostgreSQL database adapter
│   │   └── schema/
│   │       ├── sqlite.sql    # SQLite DDL & seed courses (Semesters 1-8)
│   │       ├── postgres.sql  # PostgreSQL DDL & seed courses
│   │       └── init.js       # Schema initialization runner
│   ├── controllers/
│   │   ├── web.controller.js # Public browsing, search, preview, & downloads
│   │   ├── admin.controller.js# Protected management, upload, & delete
│   │   └── api.controller.js # Public & protected REST API endpoints
│   ├── middleware/
│   │   ├── upload.js         # Multer multipart upload middleware (100MB limit)
│   │   ├── bot-protection.js # Scanner & malicious crawler blocking
│   │   ├── rate-limiter.js   # API & global rate limiting
│   │   └── security-headers.js# Hardened HTTP security headers
│   ├── repositories/
│   │   ├── course.repository.js   # Course queries, semester groupings
│   │   └── resource.repository.js # Resource persistence & parent-child links
│   ├── routes/
│   │   ├── web.routes.js     # Public web pages & stream routes
│   │   ├── admin.routes.js   # Protected admin portal & actions
│   │   └── api.routes.js     # REST API
│   └── services/
│       ├── cache.service.js   # Upstash Redis client with resilient in-memory fallback
│       ├── resource.service.js# File upload, streaming, solution linking, cache purging
│       └── storage.service.js # mbkbucket client abstraction
├── views/
│   ├── layouts/layout.hbs    # Master academic layout (dark/light theme, search, navbar)
│   ├── index.hbs             # Homepage (Semester switcher, course grid, recent uploads)
│   ├── course.hbs            # Course catalog (Categorized tabs, linked solutions)
│   ├── search.hbs            # Keyword search results view
│   ├── admin.hbs             # Protected admin upload, course creation, & resource table
│   └── error.hbs             # Clean error/notice view
└── tests/
    ├── setup.js              # Vitest bootstrap (SQLite test database)
    ├── app.test.js           # Core smoke and permissions tests
    └── unilib.test.js        # Comprehensive integration tests (all 21 passing)
```

---

## 🚀 Quick Start & Setup Instructions

### 1. Prerequisites
- **Node.js** v20.x or higher (tested on Node 24)
- **npm** v10+

### 2. Install Dependencies
Run the following inside `d:\project\unilib`:

```bash
npm install --ignore-scripts
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` (or customize the existing `.env`):

```bash
cp .env.example .env
```

Key environment variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | Application HTTP port | `3090` |
| `BASE_URL` | Base canonical application URL | `http://localhost:3090` |
| `DB_TYPE` | Database dialect (`sqlite` or `postgres`) | `sqlite` |
| `SQLITE_PATH` | Path to SQLite file when `DB_TYPE=sqlite` | `./data/unilib.db` |
| `NEON_POSTGRES` | PostgreSQL connection string when `DB_TYPE=postgres` | `postgresql://user:pass@host/db?sslmode=require` |
| `REDIS_URL` | Upstash Redis connection string | `rediss://default:token@xxx.upstash.io:6379` |
| `REDIS_CACHE_ENABLED`| Enable caching (`true` / `false`) | `true` |
| `BucketConnection` | Storage bucket provider configuration | `{"Local_Disk":{"type":"local","basePath":"./data/storage"}}` |

> **Note on Upstash Redis**: If `REDIS_URL` is omitted, Unilib automatically activates its built-in in-memory cache without any manual configuration or crashes.

### 4. Initialize Database Schema
For **SQLite** (local development):
```bash
npm run db:init:sqlite
```

For **PostgreSQL** (e.g., Neon / Supabase):
```bash
npm run db:init:postgres
```

### 5. Seed Example Academic Materials (Optional)
Populate real textbooks, lab manuals, assignments, and linked solutions across Semesters 1 through 4:
```bash
npm run seed
```

### 6. Synchronize Permissions
Register Unilib's permissions with the `mbkauthe` session manager:
```bash
npm run sync_permissions
```

### 7. Start the Server
Start development server with live watch mode:
```bash
npm run dev
```

Or start in standard production mode:
```bash
npm start
```

Visit [http://localhost:3090](http://localhost:3090) in your browser.

---

## 🧪 Testing

Unilib includes a complete Vitest suite testing public access, file streaming, permission barriers, cache invalidation, and end-to-end assignment/solution upload workflows:

```bash
npm test
```

---

## 🔐 Permissions Reference

Declared in [`src/permissions.js`](src/permissions.js):

| Permission | Description | Required Role |
| :--- | :--- | :--- |
| **Public** (`GET /`, `/courses/:id`, `/resources/:id/download`) | View courses, search, and download files | Anyone (No login required) |
| `courses:create` | Add new courses to department | `admin` |
| `courses:delete` | Delete courses and all linked materials | `admin` |
| `resources:create` | Upload course books, lab manuals, quizzes, solutions | `admin` |
| `resources:delete` | Remove materials and delete physical files from storage | `admin` |
| `admin:view` | Access the `/admin` console | `admin` |
| `admindb:access` | Access embedded visual database runner (`/admin/db`) | `admin` |

---

## 📄 License
MIT License. Built by Muhammad Bin Khalid for the University Department.
