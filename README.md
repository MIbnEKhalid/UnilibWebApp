# UnilibWebApp

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.1.0-blue.svg)]()

UnilibWebApp is an open-source web application for managing and sharing university course materials. Built with Node.js, Express, and Handlebars, it provides a user-friendly interface for students and administrators to access, add, edit, and manage educational resources.

## Technologies

- **Backend**: Node.js, Express.js
- **Frontend**: Handlebars templating engine, HTML, CSS, JavaScript
- **Database**: PostgreSQL
- **Authentication**: mbkauthe (custom authentication library)
- **Image Processing**: Sharp (for WebP conversion)
- **Other**: Compression, CORS, Rate limiting

## Features

- Browse and search course materials by semester, category, and keywords
- Pagination and filtering for easy navigation
- Admin dashboard for adding, editing, and deleting books/materials
- User authentication and role-based access control (via [mbkauthe](https://www.npmjs.com/package/mbkauthe))
- Responsive design with modern UI
- Open-source and easy to contribute

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

15 directories, 37 files
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

- Visit `/` to browse course materials.
- Admins can log in and access `/dashboard` to manage books.
- Use the search and filters to find specific materials.

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