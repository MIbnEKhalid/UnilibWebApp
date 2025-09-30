# UnilibWebApp

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.2.0-blue.svg)]()

UnilibWebApp is an open-source web application for managing and sharing university course materials. Built with Node.js, Express, and Handlebars, it provides a user-friendly interface for students and administrators to access, add, edit, and manage educational resources with a modern dark theme and enhanced lab management capabilities.

## Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: Handlebars templating engine, HTML, CSS, JavaScript
- **Database**: PostgreSQL with JSONB support for flexible metadata storage
- **Authentication**: mbkauthe (custom authentication library)
- **PDF Processing**: PDF-lib for individual lab extraction
- **Image Processing**: Sharp (for WebP conversion)
- **Other**: Compression, CORS, Rate limiting

## Features

### Core Features
- Browse and search course materials by semester, category, and keywords
- Pagination and filtering for easy navigation
- Admin dashboard for adding, editing, and deleting books/materials
- User authentication and role-based access control (via [mbkauthe](https://www.npmjs.com/package/mbkauthe))
- Responsive design with modern dark theme UI
- Open-source and easy to contribute

### Lab Management System ✨
- **Individual Lab Downloads**: Extract and download specific labs from lab manuals
- **Flexible Content Organization**: Support for title pages, labs, and other content types
- **Smart Display Logic**: Automatic detection and proper labeling of different content types
- **Page Range Management**: Define start/end pages for each lab or content section
- **Bulk Operations**: Select and manage multiple items at once
- **Search & Filter**: Advanced search functionality with real-time filtering
- **PDF Processing**: Server-side PDF manipulation for lab extraction

## Tasks / Todo
- [ ] Add Upload button to upload images to github repo /BookCovers/Semester[#]/[name].webp
- [ ] Test uploading books to s3 bucket.

## Project Structure

```
.
│   .env
│   .env.example
│   .gitignore
│   app.js
│   convertToWebp.js
│   env.md
│   LICENSE
│   model.sql
│   package.json
│   README.md
│   vercel.json
│
├───public
│   │   robots.txt
│   │
│   ├───Assets
│   │   ├───Scripts
│   │   │       unilib.js
│   │   │
│   │   └───Style
│   │           dashboard.css
│   │           style.css
│   │           unilib.css
│   │
│   └───BookCovers
│       │   BookCover_Template.webp
│       │
│       ├───Semester1
│       │       FundamentalsofPhysics9thEdition.webp
│       │       ThomasCalculus11thEdition.webp
│       │       UsingInformationTechnology.webp
│       │
│       ├───Semester2
│       │       BasicEngineeringCircuitAnalysis10th.webp
│       │       circuitanalysisLab.webp
│       │       CPL.webp
│       │       ElementaryLinearAlgebraApplications.webp
│       │       EngineeringCircuitAnalysis9thEd.webp
│       │       HowToProgram.webp
│       │       LinearAlgebra&ItsApplications.webp
│       │
│       ├───Semester3
│       │       AdvancedEngineeringMathematics.webp
│       │       BrownChurchillComplexVariables&Application8ed.webp
│       │       ElectronicDevicesByFloyd9thEdition.webp
│       │       RosenDiscreteMath&ItsApplications7thEd.webp
│       │
│       ├───Semester4
│       ├───Semester5
│       ├───Semester6
│       ├───Semester7
│       └───Semester8
├───routes
│       main.js
│       pool.js
│
└───views
    ├───layouts
    │       main.handlebars
    │
    └───mainPages
            AddBook.handlebars
            Book.handlebars
            EditBook.handlebars
            index.handlebars
            Labs.handlebars

15 directories, 38 files
```

## Getting Started

### Prerequisites

- Node.js (v16+ recommended)
- PostgreSQL database

### Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/MIbnEKhalid/UnilibWebApp.git
   cd UnilibWebApp
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Set up your `.env` file (see `env.md` for example variables).

4. Set up the database:
   - Create the database and run the SQL in [`model.sql`](model.sql) to create the required tables.

5. Start the application:
   ```sh
   npm start
   ```
   The server will run on [http://localhost:3333](http://localhost:3333) by default.

## Image Conversion

The project includes a script to convert PNG and JPG images to WebP format for better performance.

- To convert images in `public/BookCovers/` without deleting originals:
  ```sh
  npm run convertToWebp
  ```

- To convert and delete the original PNG/JPG files:
  ```sh
  npm run convertToWebp -- --delete-old
  ```

## Usage

### For Students
- Visit `/` to browse course materials with the modern dark theme interface
- Use search and filters to find specific materials by semester, category, or keywords
- For lab manuals, download individual labs or specific content sections
- Responsive design works seamlessly on desktop, tablet, and mobile devices

### For Administrators
- Log in and access `/dashboard` to manage books and materials
- Navigate to `/dashboard/Book/:bookId/Labs` to manage lab content for lab manuals
- Add, edit, or delete labs with proper page ranges and metadata
- Use bulk operations to manage multiple items efficiently
- All content is properly organized with smart display logic for different content types

### Lab Management Features
- **Content Organization**: Support for title pages, individual labs, and other content types
- **Individual Downloads**: Extract and download specific labs from lab manuals
- **Smart Labeling**: Automatic detection and proper display of different content types
- **Page Management**: Define precise page ranges for each content section
- **Search & Filter**: Advanced search with real-time filtering capabilities

## Recent Updates (v1.2.0)

### ✨ Major Features Added
- **Complete Lab Management System**: Full CRUD operations for lab content with individual PDF downloads
- **Dark Theme Implementation**: Modern GitHub-inspired dark color scheme across the entire application
- **Smart Content Display**: Fixed naming conflicts between title pages and labs with intelligent labeling
- **Enhanced UI/UX**: Improved form validation, loading states, hover effects, and responsive design
- **Bulk Operations**: Select and manage multiple lab items simultaneously
- **Advanced Search**: Real-time filtering and search capabilities for lab content

### 🔧 Technical Improvements
- **PDF Processing**: Server-side PDF manipulation using PDF-lib for lab extraction
- **Database Optimization**: Enhanced JSONB storage for flexible lab metadata
- **Frontend Architecture**: Improved JavaScript organization with better error handling
- **CSS Variables**: Consistent theming system with CSS custom properties
- **API Enhancements**: Better validation, transaction support, and error responses

## Deployment

The project includes a [`vercel.json`](vercel.json) for deployment on Vercel. You can also deploy on any Node.js-compatible server.

## Contributing

Contributions are welcome! Please open issues or pull requests on [GitHub](https://github.com/MIbnEKhalid/UnilibWebApp).

## License

This project is licensed under the MIT License. See [`LICENSE`](LICENSE) for details.

---


## Contact

For questions or contributions, please contact Muhammad Bin Khalid at [mbktechstudio.com/Support](https://mbktechstudio.com/Support/?Project=MIbnEKhalidWeb), [support@mbktechstudio.com](mailto:support@mbktechstudio.com) or [chmuhammadbinkhalid28@gmail.com](mailto:chmuhammadbinkhalid28@gmail.com). 

Developed by [Muhammad Bin Khalid](https://github.com/MIbnEKhalid) at [MBK Tech Studio](https://mbktechstudio.com/).