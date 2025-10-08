# UnilibWebApp

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)]()

A modern web application for managing and sharing university course materials, featuring a dark theme and lab management system.

## Tech Stack

- Node.js & Express.js (Backend)
- Handlebars, HTML/CSS/JS (Frontend)
- PostgreSQL with JSONB (Database)
- [mbkauthe](https://github.com/MIbnEKhalid/mbkauthe) (Authentication)
- PDF-lib & Sharp (PDF/Image processing)

## Key Features

- Browse & search course materials by semester
- Admin dashboard for content management
- Lab management with individual downloads
- PDF streaming with browser preview
- Modern dark theme UI
- User authentication & role-based access

## Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL

### Quick Start

1. Clone and install:
   ```sh
   git clone https://github.com/MIbnEKhalid/UnilibWebApp.git
   cd UnilibWebApp
   npm install
   ```

2. Configure:
   - Set up `.env` (see `env.md`)
   - Initialize database using `model.sql`

3. Run:
   ```sh
   npm start
   ```
   Access at [http://localhost:3333](http://localhost:3333)

### Image Tools

Convert images to WebP format:
```sh
npm run convertToWebp            # Keep originals
npm run convertToWebp --delete-old   # Delete originals
```

## Usage

### Students
- Browse materials by semester
- Download individual labs
- Stream PDFs in browser
- Use search/filter features

### Admins
- Manage content via `/dashboard`
- Handle lab content at `/dashboard/Book/:bookId/Labs`
- Organize labs with page ranges
- Perform bulk operations

## Deploy

Deploy on Vercel using included `vercel.json` or any Node.js server.

## Contact

For questions or contributions, please contact Muhammad Bin Khalid at [mbktechstudio.com/Support](https://mbktechstudio.com/Support/?Project=MIbnEKhalidWeb), [support@mbktechstudio.com](mailto:support@mbktechstudio.com) or [chmuhammadbinkhalid28@gmail.com](mailto:chmuhammadbinkhalid28@gmail.com). 

Developed by [Muhammad Bin Khalid](https://github.com/MIbnEKhalid) at [MBK Tech Studio](https://mbktechstudio.com/).