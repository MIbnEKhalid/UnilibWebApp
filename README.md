# UnilibWebApp

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.6.1-blue.svg)]()

<p align="center">
  <img height="64px" src="https://unilib.mbktech.org/icon.svg" alt="MBK Chat Platform" />
</p>

<p align="center">
  <img src="https://skillicons.dev/icons?i=nodejs,express,postgres" />
  <img height="48px" src="https://handlebarsjs.com/handlebars-icon.svg" alt="Handlebars" />
</p>

A modern web application for managing and sharing university course materials, featuring a dark theme, lab management system, and advanced book visibility controls.

## Tech Stack

- Node.js & Express.js (Backend)
- Handlebars, HTML/CSS/JS (Frontend)
- PostgreSQL with JSONB (Database)
- [mbkauthe](https://github.com/MIbnEKhalid/mbkauthe) (Authentication)
- PDF-lib & Sharp (PDF/Image processing)

## Key Features

- Browse & search course materials by semester
- Admin dashboard for content management
- **Book visibility controls with bulk actions** (new in v1.4)
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

### Tools

#### Convert Images to WebP
Convert images to WebP format:
```sh
npm run convertToWebp            # Keep originals
npm run convertToWebp --delete-old   # Delete originals
```

#### Convert PDF Pages to Images
Extract specific pages from PDF files as high-quality images:
```sh
npm run convertPageImages <pdfPath> <pageNumber> <outputFormat> [outputPath]
```

**Arguments:**
- `pdfPath` - Path to the PDF file
- `pageNumber` - Page number to extract (starting from 1)
- `outputFormat` - Output image format: `png`, `jpg`, `jpeg`, `webp`, `tiff`, or `avif`
- `outputPath` - (Optional) Custom output file path

**Examples:**
```sh
# Extract page 1 as PNG (auto-named output)
npm run convertPageImages tool/edc.pdf 1 png

# Extract page 2 as WebP with custom output path
npm run convertPageImages tool/edc.pdf 2 webp ./output.webp

# Extract page 5 as JPEG
npm run convertPageImages ./document.pdf 5 jpg ./page5.jpg
```

**Features:**
- High-quality output (300 DPI equivalent)
- Multiple format support
- Automatic output directory creation
- If no output path is specified, saves as `<pdfName>_page<number>.<format>`

## Usage

### Students
- Browse materials by semester
- Download individual labs
- Stream PDFs in browser
- Use search/filter features

### Admins
- Manage content via `/dashboard`
- **Hide/show books individually or in bulk** (new in v1.4)
- **Select multiple books for batch operations** (new in v1.4)
- Handle lab content at `/dashboard/Book/:bookId/Labs`
- Organize labs with page ranges
- Perform bulk operations

## What's New in v1.6.0

### Book Visibility Management
- **Hide/Show Books**: Control which books are visible to students
- **Bulk Actions**: Select multiple books and hide/show them at once
- **Visual Indicators**: Hidden books display a red "Hidden" badge
- **Smart Filtering**: Public users only see visible books; admins see all books

## Deploy

Deploy on Vercel using included `vercel.json` or any Node.js server.

## Contact

For questions or contributions, please contact Muhammad Bin Khalid at [mbktech.org/Support](https://mbktech.org/Support/?Project=MIbnEKhalidWeb), [support@mbktech.org](mailto:support@mbktech.org) or [chmuhammadbinkhalid28@gmail.com](mailto:chmuhammadbinkhalid28@gmail.com). 

Developed by [Muhammad Bin Khalid](https://github.com/MIbnEKhalid) at [mbktech.org](https://mbktech.org/).