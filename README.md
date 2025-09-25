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
- **Other**: Compression, CORS, Rate limiting

## Features

- Browse and search course materials by semester, category, and keywords
- Pagination and filtering for easy navigation
- Admin dashboard for adding, editing, and deleting books/materials
- User authentication and role-based access control (via [mbkauthe](https://www.npmjs.com/package/mbkauthe))
- Responsive design with modern UI
- Open-source and easy to contribute

## Tasks / Todo
- [ ] Add Upload button to upload images to github repo /BookCovers/Semester[#]/[name].png
- [ ] Test uploading books to s3 bucket.

## Project Structure

```
.
├── LICENSE
├── README.md
├── app.js
├── env.md
├── model.sql
├── package.json
├── public
│   ├── Assets
│   │   ├── Images
│   │   │   ├── BookCovers
│   │   │   │   ├── BookCover_Template.png
│   │   │   │   ├── Semester1
│   │   │   │   │   ├── FundamentalsofPhysics9thEdition.png
│   │   │   │   │   ├── ThomasCalculus11thEdition.png
│   │   │   │   │   └── UsingInformationTechnology.png
│   │   │   │   ├── Semester2
│   │   │   │   │   ├── BasicEngineeringCircuitAnalysis10th.png
│   │   │   │   │   ├── CPL.png
│   │   │   │   │   ├── ElementaryLinearAlgebraApplications.png
│   │   │   │   │   ├── EngineeringCircuitAnalysis9thEd.png
│   │   │   │   │   ├── HowToProgram.png
│   │   │   │   │   ├── LinearAlgebra&ItsApplications.png
│   │   │   │   │   └── circuitanalysisLab.png
│   │   │   │   └── Semester3
│   │   │   │       ├── AdvancedEngineeringMathematics.png
│   │   │   │       ├── BrownChurchillComplexVariables&Application8ed.png
│   │   │   │       └── ElectronicDevicesByFloyd9thEdition.png
│   │   │   └── Icon
│   │   │       ├── MBKSupportIcon.svg
│   │   │       └── dg.svg
│   │   ├── Scripts
│   │   │   └── unilib.js
│   │   └── Style
│   │       ├── dashboard.css
│   │       ├── style.css
│   │       └── unilib.css
│   └── robots.txt
├── routes
│   ├── main.js
│   └── pool.js
├── vercel.json
└── views
    ├── layouts
    │   └── main.handlebars
    └── mainPages
        ├── AddBook.handlebars
        ├── Book.handlebars
        ├── EditBook.handlebars
        └── index.handlebars

15 directories, 36 files
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