# UnilibWebApp

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)]()

<p align="center">
  <img height="64px" src="https://unilib.mbktech.org/icon.svg" alt="Unilib Web App Icon" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=nodejs,express,postgres,sqlite,css,redis" />
  <img height="48px" src="https://handlebarsjs.com/handlebars-icon.svg" alt="Handlebars" />
</p>

A modern, high-performance web application for organizing, sharing, and archiving university course materials, lecture notes, lab guides, and textbooks. Features dual database support (PostgreSQL & SQLite), automated university portal synchronization (Tasjeel Sync), Upstash Redis caching, pure Vanilla CSS classical library UI, and advanced administrative controls.

---

## 🌟 Key Features

- **Multi-Engine Database Support (PostgreSQL & SQLite)**: Built-in abstraction layer supporting Neon PostgreSQL and SQLite (file-based or in-memory) with automated schema initialization and dialect query translation.
- **University Portal Synchronization (Tasjeel Sync)**: Automated background cron scheduler and manual admin trigger to fetch, organize, and archive subjects and course materials directly from student portals.
- **Course Materials & Subject Management**: Search and filter subjects by semester, aggregate material counts, view files in-browser, and proxy secure downloads.
- **Book Catalog & Visibility Management**: Multi-semester tagging (`semester[]`), live search, category filtering, visibility toggles (hide/show), and batch bulk operations.
- **Lab & Section Extraction**: Organize book sections and lab sheets by page range with UUID tracking and on-demand PDF extraction and downloads.
- **Performance & Caching**: Fast page loads via Upstash Redis REST caching with transparent fallback to direct DB queries and automated version-based cache busting.
- **Classical Academic Theme & Vanilla CSS**: Responsive, classical academic library interface built with Handlebars and pure Vanilla CSS (zero build step).
- **Authentication & Security**: Role-based access control with [mbkauthe](https://github.com/MIbnEKhalid/mbkauthe), cloud bucket integration with `mbkbucket`, rate limiting, and CORS security.
- **Built-in Automated Testing**: Test suite for database abstractions, repository methods, and HTTP route integration.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Runtime & Backend** | Node.js (ES Modules), Express.js 5.x |
| **Frontend & Templating** | Handlebars (express-handlebars), Vanilla CSS, Vanilla JS |
| **Databases** | PostgreSQL (`pg`), SQLite (`node:sqlite` / synchronous SQLite pool) |
| **Caching** | Upstash Redis (`@upstash/redis`) |
| **Authentication & Storage** | [mbkauthe](https://github.com/MIbnEKhalid/mbkauthe), `mbkbucket` |
| **Document & Image Processing** | `pdf-lib`, `pdf-to-img`, `sharp` |
| **Scheduling & Scraping** | `node-cron`, `cheerio`, `node-fetch` |
| **Testing** | Node.js Test Runner & Assertion Library (`node:assert/strict`) |

---

## 📁 Project Structure

```text
UnilibWebApp/
├── data/                  # Local SQLite database storage (unilib.sqlite)
├── public/                # Static assets, sitemaps, and book covers
│   ├── assets/
│   │   ├── css/           # Vanilla CSS stylesheets & design system
│   │   ├── js/            # Client-side JavaScript
│   │   └── images/        # Icons and images
│   └── BookCovers/        # Default book cover templates
├── scripts/               # CLI utility scripts (db init, image/PDF conversion)
│   ├── convertPageImages.js
│   ├── convertToWebp.js
│   └── initDb.js
├── src/
│   ├── app.js             # Express application configuration and middleware
│   ├── server.js          # HTTP server bootstrap and cron initialization
│   ├── config/            # Environment and Handlebars configuration
│   ├── controllers/       # Route request controllers (Book, Section, Material, PDF)
│   ├── db/                # Multi-dialect database abstraction
│   │   ├── schema/        # Schema definitions and initializers
│   │   ├── connection.js  # SQLite/PostgreSQL connection helpers
│   │   └── index.js       # DB init + repository proxies
│   ├── middleware/        # Rate limiter and error handling middleware
│   ├── repositories/      # Domain repositories
│   │   ├── book.repository.js
│   │   ├── section.repository.js
│   │   └── tasjeel.repository.js
│   ├── routes/            # Express route modules
│   ├── services/          # Cache (Redis) and Tasjeel sync services
│   └── utils/             # Shared utilities
├── views/                 # Handlebars layouts, templates and views
│   ├── layouts/
│   ├── mainPages/
│   └── templates/
├── tests/                 # Database abstraction and HTTP integration tests
├── env.md                 # Detailed environment variables guide
└── package.json           # Project manifest and scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Database**: PostgreSQL (e.g. Neon Postgres) or SQLite (no external installation required)

### Quick Start

1. **Clone the repository**:
   ```sh
   git clone https://github.com/MIbnEKhalid/UnilibWebApp.git
   cd UnilibWebApp
   ```

2. **Install dependencies**:
   ```sh
   npm install
   ```

3. **Configure environment variables**:
   Create a `.env` file in the root directory (refer to [env.md](env.md) for full configuration options):
   ```env
   PORT=3333
   NODE_ENV=development
   DB_TYPE=sqlite
   SQLITE_PATH=./data/unilib.sqlite
   
   # Optional: PostgreSQL Connection
   # NEON_POSTGRES=postgres://username:password@host:port/database
   
   # Optional: Redis Caching
   # UPSTASH_REDIS_REST_URL=https://...
   # UPSTASH_REDIS_REST_TOKEN=...
   # REDIS_ENABLED=true
   
   # Admin Authentication
   # mbkautheVar='{"APP_NAME":"MBKAUTH","SESSION_SECRET_KEY":"secret","IS_DEPLOYED":"false"}'
   ```

4. **Initialize the database schema**:
   ```sh
   # Initialize based on configured DB_TYPE in .env
   npm run db:init

   # Or explicitly initialize a specific engine:
   npm run db:init:sqlite
   npm run db:init:postgres
   ```

5. **Start the application**:
   ```sh
   # Development mode (with live reload)
   npm run dev

   # Production mode
   npm start
   ```

   Open your browser and navigate to [http://localhost:3333](http://localhost:3333).

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm start` | Runs the production server (`node src/server.js`) |
| `npm run dev` | Runs the development server with `nodemon` live-reloading |
| `npm run db:init` | Automatically initializes schemas for configured database engine |
| `npm run db:init:sqlite` | Creates SQLite tables, schema, and indexes (`unilib.sqlite`) |
| `npm run db:init:postgres` | Creates PostgreSQL tables, schema, and indexes |
| `npm run test` | Executes the complete test suite (`db.test.js` and `app.test.js`) |
| `npm run convertToWebp` | Converts cover images to optimized WebP format |
| `npm run convertPageImages` | Extracts specific PDF pages as high-resolution images |

---

## 🔧 CLI & Utility Tools

### 1. Database Initializer
Initialize database schemas with custom flags:
```sh
node scripts/initDb.js --type=sqlite --path=./data/unilib.sqlite
node scripts/initDb.js --type=postgres
node scripts/initDb.js --all
```

### 2. PDF Page Image Extractor
Extract individual pages from PDF documents into high-resolution images:
```sh
npm run convertPageImages <pdfPath> <pageNumber> <outputFormat> [outputPath]
```
- **Supported formats**: `png`, `jpg`, `jpeg`, `webp`, `tiff`, `avif`
- **Examples**:
  ```sh
  # Extract page 1 as PNG (saved to document_page1.png)
  npm run convertPageImages ./document.pdf 1 png

  # Extract page 2 as WebP to a custom destination
  npm run convertPageImages ./document.pdf 2 webp ./output.webp
  ```

### 3. Image Optimizer (WebP)
Convert images in `public/BookCovers` to WebP:
```sh
npm run convertToWebp                  # Converts while keeping originals
npm run convertToWebp --delete-old     # Converts and removes original source files
```

---

## 👥 Usage & Roles

### 🎓 Students / Public Users
- **Browse by Semester**: Filter course books, reference materials, and subjects by semester.
- **Subject Materials**: Explore lecture slides, assignments, and past papers fetched from the portal.
- **Lab & Section Downloads**: Download individual lab chapters or stream complete textbooks in-browser.
- **Search & Filter**: Search course materials in real-time.

### 🛡️ Administrators (`/dashboard`)
- **Book Management**: Add, edit, delete, and tag books across multiple semesters.
- **Bulk Visibility Controls**: Select multiple books to toggle public visibility or perform batch updates.
- **Section & Lab Manager**: Define page offsets and extracted sections for any textbook (`/dashboard/Book/:bookId/Sections`).
- **Materials Console**: Manage synced subjects, upload material links, edit semester associations, and trigger manual Tasjeel synchronization (`/dashboard/Materials`).
- **Export & Analytics**: Track view/download analytics and export book catalogues.

---

## 🚀 What's New in v2.0.0

- **Modular `src/` Architecture**: Fully refactored codebase adhering to ES Modules, clean repository design pattern, separated route controllers, services, and middlewares.
- **Dual Database Engine (PostgreSQL & SQLite)**: Native support for both SQLite (zero-config, local dev, testing) and PostgreSQL (Neon serverless production) with unified query adapters.
- **Tasjeel Portal Sync Service**: Automated background sync via cron job (`TASJEEL_SYNC_CRON`) with authenticated scraping and manual sync console.
- **Modern Vanilla CSS Architecture**: Clean, zero-build-step Vanilla CSS styling with custom theme tokens, modern flex/grid layouts, and responsive glassmorphism.
- **Comprehensive Testing Suite**: Added automated tests covering repository queries, dialect translators, and HTTP endpoints (`npm test`).
- **UUID Section Management**: Enhanced book section management using standardized UUID identifiers and batch deletion capabilities.
- **Multi-Semester Array Tagging**: Support for assigning books and subjects across multiple semesters seamlessly.
- **MBK Ecosystem Integration**: Native integration with `mbkauthe` and `mbkbucket`.

---

## ☁️ Deployment

### Deploy on Vercel
The project includes a pre-configured `vercel.json` for serverless deployment:
1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Set your environment variables in the Vercel Project Settings (e.g., `NEON_POSTGRES`, `MBKAUTHE_VAR`, `UPSTASH_REDIS_REST_URL`, etc.).
4. Deploy!

### Deploy on Node.js Server
Ensure Node.js 18+ is installed:
```sh
npm install --production
npm run build:css
npm run db:init
npm start
```

---

## 📬 Contact & Support

For inquiries, support, or contributions:
- **Developer**: [Muhammad Bin Khalid](https://github.com/MIbnEKhalid)
- **Support Portal**: [mbktech.org/Support](https://mbktech.org/Support/?Project=MIbnEKhalidWeb)
- **Email**: [support@mbktech.org](mailto:support@mbktech.org) or [chmuhammadbinkhalid28@gmail.com](mailto:chmuhammadbinkhalid28@gmail.com)
- **Website**: [mbktech.org](https://mbktech.org/)

---

<p align="center">
  <sub>Developed with ❤️ by <a href="https://github.com/MIbnEKhalid">Muhammad Bin Khalid</a> at <a href="https://mbktech.org/">mbktech.org</a></sub>
</p>