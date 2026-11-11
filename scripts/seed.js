/**
 * Unilib Comprehensive Database Seeder
 * Populates real academic materials for department courses configured in src/config/courses.json.
 * Covers all 8 semesters with Textbooks, Lab Manuals, Quizzes/Assignments, and Linked Solutions.
 * Uses real PDF file buffers via resourceService and storageService so preview & download work seamlessly.
 */
import path from "node:path";
import fs from "node:fs";
import { config } from "../src/config/env.js";
import { defaultAdapter } from "../src/db/index.js";
import courseRepository from "../src/repositories/course.repository.js";
import resourceRepository from "../src/repositories/resource.repository.js";
import resourceService from "../src/services/resource.service.js";
import cacheService from "../src/services/cache.service.js";

/**
 * Generates a valid standard PDF-1.4 file buffer with text and formatting.
 */
function createMockPdf(title, subtitle, courseCode, details) {
  const safeTitle = (title || "Academic Document").replace(/[()\\]/g, "");
  const safeSubtitle = (subtitle || "").replace(/[()\\]/g, "");
  const safeCourse = (courseCode || "").replace(/[()\\]/g, "");
  const safeDetails = (details || "Unilib Department Academic Sharing Platform").replace(/[()\\]/g, "");

  const streamContent = `BT
/F1 20 Tf
50 720 Td
(Unilib Academic Library) Tj
/F1 15 Tf
0 -35 Td
([${safeCourse}] ${safeTitle}) Tj
/F2 11 Tf
0 -25 Td
(${safeSubtitle}) Tj
/F2 10 Tf
0 -30 Td
(${safeDetails}) Tj
/F2 9 Tf
0 -50 Td
(Verified academic resource. Downloaded via Unilib University Platform.) Tj
ET`;

  const streamLength = Buffer.byteLength(streamContent, "utf-8");

  const pdf = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /MediaBox [0 0 612 792] /Contents 6 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
6 0 obj << /Length ${streamLength} >> stream
${streamContent}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000243 00000 n 
0000000319 00000 n 
0000000390 00000 n 
trailer << /Size 7 /Root 1 0 R >>
startxref
${490 + streamLength}
%%EOF`;

  return Buffer.from(pdf, "utf-8");
}

const seedItems = [
  // ==========================================
  // SEMESTER 1
  // ==========================================
  {
    course_code: "CPEG1513",
    type: "textbook",
    title: "Thomas' Calculus (14th Edition)",
    filename: "Thomas_Calculus_14th_Edition.pdf",
    description: "Comprehensive multivariable calculus and analytical geometry reference text.",
    downloads: 142,
  },
  {
    course_code: "CPEG1513",
    type: "quiz_assignment",
    key: "calc_quiz_1",
    title: "Calculus Quiz 1 - Limits, Continuity & Chain Rule",
    filename: "Calculus_Quiz_1_Questions.pdf",
    description: "Covers Chapter 2 & 3: epsilon-delta limits, piecewise continuity, and chain rule derivatives.",
    downloads: 89,
  },
  {
    course_code: "CPEG1513",
    type: "solution",
    parentKey: "calc_quiz_1",
    title: "Calculus Quiz 1 - Detailed Step-by-Step Solutions",
    filename: "Calculus_Quiz_1_Solutions.pdf",
    description: "Complete worked derivations, step marking rubric, and graphical justifications.",
    downloads: 115,
  },
  {
    course_code: "CPEG1312",
    type: "textbook",
    title: "University Physics with Modern Physics - Young & Freedman",
    filename: "University_Physics_Young_Freedman.pdf",
    description: "Core reference textbook covering classical mechanics, thermodynamics, and wave phenomena.",
    downloads: 98,
  },
  {
    course_code: "CPE1021",
    type: "lab_manual",
    title: "Workshop Practice Manual - Machining, Tools & PCB Soldering",
    filename: "Workshop_Practice_Lab_Manual.pdf",
    description: "Workshop safety rules, lathe machine operations, hand measuring tools, and soldering guides.",
    downloads: 76,
  },
  {
    course_code: "CYG1611",
    type: "lab_manual",
    title: "ICT Lab Manual - Linux CLI, Git & Web Fundamentals",
    filename: "ICT_Lab_Manual_2024.pdf",
    description: "Practical exercises for bash scripting, version control with Git, and markdown documentation.",
    downloads: 64,
  },

  // ==========================================
  // SEMESTER 2
  // ==========================================
  {
    course_code: "CCPE1122",
    type: "textbook",
    title: "C++ How to Program (10th Edition) - Deitel & Deitel",
    filename: "Deitel_Cpp_How_to_Program.pdf",
    description: "Comprehensive guide to procedural and object-oriented C++, dynamic memory, and algorithms.",
    downloads: 184,
  },
  {
    course_code: "CCPE1122",
    type: "quiz_assignment",
    key: "cp_assignment_1",
    title: "Programming Assignment 1 - Dynamic Memory & Pointers",
    filename: "CP_Assignment_1_Pointers.pdf",
    description: "Implement custom dynamic matrix and linked record structures without using STL containers.",
    downloads: 132,
  },
  {
    course_code: "CCPE1122",
    type: "solution",
    parentKey: "cp_assignment_1",
    title: "Assignment 1 - Official Reference Solution & Test Cases",
    filename: "CP_Assignment_1_Solution_Key.pdf",
    description: "Clean memory-safe C++ implementation passing all Valgrind leak and boundary tests.",
    downloads: 167,
  },
  {
    course_code: "CCPE1121",
    type: "lab_manual",
    title: "Computer Programming Lab Manual - 14 Weekly Practical Tasks",
    filename: "CP_Lab_Manual_Weekly_Tasks.pdf",
    description: "Full semester laboratory manual with test cases, problem statements, and grading rubrics.",
    downloads: 110,
  },
  {
    course_code: "MCPE1032",
    type: "textbook",
    title: "Linear Algebra and Its Applications - David C. Lay",
    filename: "Lay_Linear_Algebra_Applications.pdf",
    description: "Matrix algebra, Gaussian elimination, vector spaces, eigenvalues, and linear transformations.",
    downloads: 91,
  },
  {
    course_code: "CPE1211",
    type: "lab_manual",
    title: "Circuit Analysis Lab Guide - Multisim Simulations & Breadboard Testing",
    filename: "Circuit_Analysis_Lab_Experiments.pdf",
    description: "Ohm's Law, Kirchhoff's laws, Thevenin equivalent circuits, and oscilloscope measurements.",
    downloads: 82,
  },

  // ==========================================
  // SEMESTER 3
  // ==========================================
  {
    course_code: "CPE2123",
    type: "textbook",
    title: "Java: The Complete Reference (12th Edition) - Herbert Schildt",
    filename: "Java_The_Complete_Reference_12th.pdf",
    description: "Comprehensive guide to OOP, generics, Java Collections Framework, and concurrent programming.",
    downloads: 215,
  },
  {
    course_code: "CPE2123",
    type: "quiz_assignment",
    key: "oop_assignment_2",
    title: "OOP Assignment 2 - Department Student Registration System",
    filename: "OOP_Assignment_2_Specification.pdf",
    description: "Design class hierarchies using inheritance, polymorphism, abstract base classes, and file I/O.",
    downloads: 145,
  },
  {
    course_code: "CPE2123",
    type: "solution",
    parentKey: "oop_assignment_2",
    title: "OOP Assignment 2 - Architectural Design & Java Solution",
    filename: "OOP_Assignment_2_Solution_Package.pdf",
    description: "Complete modular Java source code with UML class diagram and JUnit test suite.",
    downloads: 198,
  },
  {
    course_code: "CPE2053",
    type: "textbook",
    title: "Discrete Mathematics and Its Applications - Kenneth H. Rosen",
    filename: "Rosen_Discrete_Mathematics.pdf",
    description: "Propositional logic, set theory, graph theory, combinatorics, and induction proofs.",
    downloads: 124,
  },
  {
    course_code: "CPE2121",
    type: "lab_manual",
    title: "OOP Lab Practical Exercises - GUI & Design Patterns",
    filename: "OOP_Lab_Manual_Exercises.pdf",
    description: "Weekly lab tasks covering Singleton, Factory pattern, Java Swing GUI, and JDBC database access.",
    downloads: 87,
  },
  {
    course_code: "CPE2231",
    type: "lab_manual",
    title: "Electronic Devices & Circuits Lab Manual - BJT & MOSFET Testing",
    filename: "EDC_Lab_Manual_Hardware.pdf",
    description: "Diode rectifiers, transistor biasing, small-signal AC analysis, and operational amplifiers.",
    downloads: 69,
  },

  // ==========================================
  // SEMESTER 4
  // ==========================================
  {
    course_code: "CPE2133",
    type: "textbook",
    title: "Introduction to Algorithms (4th Edition) - Cormen, Leiserson, Rivest & Stein",
    filename: "CLRS_Algorithms_4th_Edition.pdf",
    description: "Definitive textbook on asymptotic analysis, balanced search trees, graph algorithms, and dynamic programming.",
    downloads: 245,
  },
  {
    course_code: "CPE2133",
    type: "quiz_assignment",
    key: "dsa_assignment_1",
    title: "DSA Assignment 1 - AVL Trees & Red-Black Invariants",
    filename: "DSA_Assignment_1_Balanced_Trees.pdf",
    description: "Implementation of self-balancing AVL trees, insertion rebalancing rotations, and complexity proofs.",
    downloads: 160,
  },
  {
    course_code: "CPE2133",
    type: "solution",
    parentKey: "dsa_assignment_1",
    title: "DSA Assignment 1 - C++ Source Code & Rotations Guide",
    filename: "DSA_Assignment_1_Solution_Key.pdf",
    description: "Complete generic C++ AVL tree implementation with recursive rotation helpers and automated test assertions.",
    downloads: 210,
  },
  {
    course_code: "CY3413",
    type: "textbook",
    title: "Operating System Concepts (10th Edition) - Silberschatz, Galvin & Gagne",
    filename: "Silberschatz_Operating_Systems_10th.pdf",
    description: "Standard dinosaur book covering process scheduling, inter-process communication, paging, and deadlocks.",
    downloads: 190,
  },
  {
    course_code: "CPE2131",
    type: "lab_manual",
    title: "Data Structures & Algorithms Lab Manual - 12 Core Experiments",
    filename: "DSA_Lab_Manual_Weekly_Tasks.pdf",
    description: "Practical implementations of linked structures, heaps, Dijkstra's algorithm, and sorting benchmarks.",
    downloads: 105,
  },
  {
    course_code: "CPE3411",
    type: "lab_manual",
    title: "Operating Systems Lab Manual - POSIX Threads & Semaphores",
    filename: "OS_Lab_Manual_POSIX_Concurrency.pdf",
    description: "Hands-on Linux system calls: fork, exec, pipes, pthread synchronization, and xv6 kernel hacking.",
    downloads: 112,
  },
  {
    course_code: "CPE2313",
    type: "textbook",
    title: "Digital Design: With an Introduction to Verilog HDL - M. Morris Mano",
    filename: "Morris_Mano_Digital_Design.pdf",
    description: "Boolean algebra, Karnaugh maps, combinational logic design, synchronous sequential circuits, and registers.",
    downloads: 135,
  },
  {
    course_code: "CPE2311",
    type: "lab_manual",
    title: "Digital Logic Design Lab Experiments - Breadboard ICs & Verilog",
    filename: "DLD_Lab_Manual_Experiments.pdf",
    description: "Laboratory experiments covering 74-series TTL ICs, flip-flops, counter design, and Quartus II simulation.",
    downloads: 88,
  },

  // ==========================================
  // SEMESTER 5
  // ==========================================
  {
    course_code: "CPE2323",
    type: "textbook",
    title: "Computer Organization and Design: RISC-V Edition - Patterson & Hennessy",
    filename: "Patterson_Hennessy_RISCV_Architecture.pdf",
    description: "Instruction set architecture, pipelined data paths, cache memory hierarchies, and virtual memory.",
    downloads: 195,
  },
  {
    course_code: "CPE2323",
    type: "quiz_assignment",
    key: "arch_midterm",
    title: "Midterm Past Paper - Pipeline Hazards & Cache Optimization",
    filename: "Arch_Midterm_Paper_Fall_2025.pdf",
    description: "Official past midterm examination paper covering branch prediction, RAW hazards, and cache hit rates.",
    downloads: 178,
  },
  {
    course_code: "CPE2323",
    type: "solution",
    parentKey: "arch_midterm",
    title: "Midterm Past Paper - Official Marking Scheme & Solutions",
    filename: "Arch_Midterm_Marking_Scheme_2025.pdf",
    description: "Worked pipeline cycle diagrams, speedup formulas, and cache miss calculations.",
    downloads: 230,
  },
  {
    course_code: "CPE4523",
    type: "textbook",
    title: "Software Engineering: A Practitioner's Approach - Roger S. Pressman",
    filename: "Pressman_Software_Engineering.pdf",
    description: "Software lifecycle processes, Agile Scrum methodologies, architectural design, and software metrics.",
    downloads: 134,
  },
  {
    course_code: "CPE4523",
    type: "quiz_assignment",
    key: "se_srs_project",
    title: "Course Project - Software Requirements Specification (SRS) Milestone",
    filename: "SE_SRS_Project_Milestone_Guidelines.pdf",
    description: "IEEE 830 compliant SRS specification template with functional requirements and use cases.",
    downloads: 112,
  },
  {
    course_code: "CPE4523",
    type: "solution",
    parentKey: "se_srs_project",
    title: "Sample High-Distinction SRS Document & Use Case Model",
    filename: "Sample_SRS_Exemplar_Submission.pdf",
    description: "Exemplary high-grade SRS document with sequence diagrams, domain models, and validation tests.",
    downloads: 162,
  },
  {
    course_code: "CPE3333",
    type: "textbook",
    title: "The 8086 Microprocessor: Architecture & Interfacing - Triebel & Singh",
    filename: "Triebel_8086_Microprocessor.pdf",
    description: "Assembly language programming on 8086, memory segmentation, hardware interrupts, and peripheral interfacing.",
    downloads: 94,
  },
  {
    course_code: "CPE3331",
    type: "lab_manual",
    title: "Microprocessors & Interfacing Lab Manual - 8086 Assembly & 8255 PPI",
    filename: "Microprocessors_8086_Interfacing_Lab.pdf",
    description: "EMU8086 programming exercises, hardware interrupts, ADC/DAC interfacing, and stepper motor control.",
    downloads: 104,
  },
  {
    course_code: "CPE2613",
    type: "textbook",
    title: "Signals and Systems (2nd Edition) - Oppenheim & Willsky",
    filename: "Oppenheim_Signals_and_Systems.pdf",
    description: "Continuous and discrete-time signals, LTI systems, Fourier series, Fourier Transform, and Laplace Transform.",
    downloads: 108,
  },

  // ==========================================
  // SEMESTER 6
  // ==========================================
  {
    course_code: "CPE3623",
    type: "textbook",
    title: "Discrete-Time Signal Processing (3rd Edition) - Alan V. Oppenheim",
    filename: "Oppenheim_Discrete_Time_DSP.pdf",
    description: "Z-transform, discrete Fourier transform (DFT), fast Fourier transform (FFT), and digital filter design.",
    downloads: 147,
  },
  {
    course_code: "CPE3623",
    type: "quiz_assignment",
    key: "dsp_filter_quiz",
    title: "DSP Assignment 1 - IIR & FIR Digital Filter Synthesis",
    filename: "DSP_Assignment_1_Filter_Design.pdf",
    description: "Design of Butterworth and Chebyshev IIR filters using bilinear transformation, and windowed FIR filters.",
    downloads: 95,
  },
  {
    course_code: "CPE3623",
    type: "solution",
    parentKey: "dsp_filter_quiz",
    title: "DSP Assignment 1 - Filter Coefficients & MATLAB Proofs",
    filename: "DSP_Assignment_1_MATLAB_Solution.pdf",
    description: "Complete mathematical derivations and MATLAB scripts verifying filter frequency responses.",
    downloads: 138,
  },
  {
    course_code: "CPE3621",
    type: "lab_manual",
    title: "Digital Signal Processing Lab Manual - MATLAB & DSP Kits",
    filename: "DSP_Lab_Manual_Experiments.pdf",
    description: "Hands-on signal sampling, circular convolution, FFT spectrum analysis, and audio filtering.",
    downloads: 81,
  },
  {
    course_code: "CPE4513",
    type: "textbook",
    title: "Database System Concepts (7th Edition) - Silberschatz, Korth & Sudarshan",
    filename: "Database_System_Concepts_7th.pdf",
    description: "Relational database model, SQL queries, ER modeling, schema normalization (1NF-BCNF), and ACID transactions.",
    downloads: 210,
  },
  {
    course_code: "CPE4513",
    type: "quiz_assignment",
    key: "dbms_normalization_quiz",
    title: "DBMS Assignment 2 - Relational Normalization & BCNF Decomposition",
    filename: "DBMS_Assignment_2_Normalization.pdf",
    description: "Functional dependency analysis, lossless join testing, dependency preservation, and BCNF conversion.",
    downloads: 155,
  },
  {
    course_code: "CPE4513",
    type: "solution",
    parentKey: "dbms_normalization_quiz",
    title: "DBMS Assignment 2 - Normalization Proofs & SQL Implementation",
    filename: "DBMS_Assignment_2_Solution_Key.pdf",
    description: "Worked step-by-step dependency closure algorithms and verified normalized DDL schema scripts.",
    downloads: 189,
  },
  {
    course_code: "CPE4511",
    type: "lab_manual",
    title: "Database Systems Lab Manual - PostgreSQL, Triggers & Indexing",
    filename: "DBMS_Lab_Manual_PostgreSQL.pdf",
    description: "Laboratory manual covering SQL joins, stored procedures, PL/pgSQL triggers, query optimization, and EXPLAIN.",
    downloads: 128,
  },
  {
    course_code: "CPE3633",
    type: "textbook",
    title: "Artificial Intelligence: A Modern Approach (4th Edition) - Russell & Norvig",
    filename: "AIMA_Russell_Norvig_4th.pdf",
    description: "Informed search, adversarial search, constraint satisfaction problems, probabilistic reasoning, and reinforcement learning.",
    downloads: 260,
  },
  {
    course_code: "CPE3633",
    type: "quiz_assignment",
    key: "ai_search_quiz",
    title: "AI Quiz 2 - A* Admissibility & Alpha-Beta Pruning",
    filename: "AI_Quiz_2_Heuristics_GameTrees.pdf",
    description: "Heuristic admissibility proofs, Manhattan vs Euclidean consistency, and minimax game tree pruning.",
    downloads: 172,
  },
  {
    course_code: "CPE3633",
    type: "solution",
    parentKey: "ai_search_quiz",
    title: "AI Quiz 2 - Step-by-Step Tree Expansions & Pruned Nodes",
    filename: "AI_Quiz_2_Full_Solution_Key.pdf",
    description: "Full trace of priority queues, heuristic distance tables, and pruned subtree annotations.",
    downloads: 218,
  },
  {
    course_code: "CPE3631",
    type: "lab_manual",
    title: "Artificial Intelligence Lab Manual - Python Agents & Search",
    filename: "AI_Lab_Manual_Python_Agents.pdf",
    description: "Implementation of Pacman search agents, genetic algorithms, and decision trees using Python.",
    downloads: 119,
  },
  {
    course_code: "CPE4713",
    type: "textbook",
    title: "Computer Networking: A Top-Down Approach (8th Edition) - Kurose & Ross",
    filename: "Kurose_Ross_Computer_Networking_8th.pdf",
    description: "Application layer (HTTP/DNS), transport layer (TCP congestion control/UDP), network routing, and IP addressing.",
    downloads: 182,
  },
  {
    course_code: "CPE4711",
    type: "lab_manual",
    title: "Computer Networks Lab Manual - Wireshark & Cisco Packet Tracer",
    filename: "Networks_Lab_Manual_Wireshark.pdf",
    description: "Subnetting, VLAN configuration, OSPF routing simulation, and Wireshark TCP 3-way handshake analysis.",
    downloads: 98,
  },

  // ==========================================
  // SEMESTER 7
  // ==========================================
  {
    course_code: "CPE3343",
    type: "textbook",
    title: "Advanced Digital Design with the Verilog HDL - Michael D. Ciletti",
    filename: "Ciletti_Advanced_Digital_Design_Verilog.pdf",
    description: "Complex finite state machine design, timing closure, behavioral synthesis, and ASIC/FPGA workflows.",
    downloads: 110,
  },
  {
    course_code: "CPE3343",
    type: "quiz_assignment",
    key: "dd_fsm_quiz",
    title: "Digital Design Quiz 1 - Moore/Mealy State Reduction",
    filename: "DD_Quiz_1_State_Machines.pdf",
    description: "Implication table state reduction, state assignment techniques, and glitch-free output synthesis.",
    downloads: 84,
  },
  {
    course_code: "CPE3343",
    type: "solution",
    parentKey: "dd_fsm_quiz",
    title: "Digital Design Quiz 1 - State Diagrams & Verilog RTL Solutions",
    filename: "DD_Quiz_1_Solution_RTL.pdf",
    description: "Verified synthesized Verilog code and timing diagram annotations.",
    downloads: 104,
  },
  {
    course_code: "CPE3341",
    type: "lab_manual",
    title: "Digital Design Lab Manual - Xilinx Vivado & FPGA Prototyping",
    filename: "Digital_Design_FPGA_Lab_Manual.pdf",
    description: "Synthesis, pin mapping, timing constraints, and physical validation on Artix-7 FPGA boards.",
    downloads: 72,
  },
  {
    course_code: "CCPE4193",
    type: "textbook",
    title: "Android Programming: The Big Nerd Ranch Guide (4th Edition)",
    filename: "Android_Programming_Big_Nerd_Ranch.pdf",
    description: "Modern Android architecture: Kotlin, Jetpack Compose, Coroutines, MVVM, Room database, and Retrofit.",
    downloads: 168,
  },
  {
    course_code: "CCPE4193",
    type: "quiz_assignment",
    key: "mobile_project_milestone",
    title: "Mobile App Milestone - Offline-First MVVM Application Architecture",
    filename: "Mobile_App_Project_Milestone_Guidelines.pdf",
    description: "Design an offline-capable mobile app with Room local persistence, WorkManager synchronization, and REST API.",
    downloads: 125,
  },
  {
    course_code: "CCPE4193",
    type: "solution",
    parentKey: "mobile_project_milestone",
    title: "Mobile App Reference Submission - Clean Architecture Kotlin Project",
    filename: "Mobile_App_Exemplar_Solution_Report.pdf",
    description: "Complete architecture blueprint, repository layer design, and automated UI test suite.",
    downloads: 154,
  },
  {
    course_code: "HCPE4062",
    type: "textbook",
    title: "A Guide to the Project Management Body of Knowledge (PMBOK Guide)",
    filename: "PMBOK_Guide_Project_Management.pdf",
    description: "Project lifecycle management, Gantt charts, critical path method (CPM), risk matrix, and cost estimating.",
    downloads: 130,
  },
  {
    course_code: "CPE4912",
    type: "lab_manual",
    title: "Final Year Design Project (Part-I) Guidelines & Proposal Template",
    filename: "FYP_Part1_Proposal_Guidelines.pdf",
    description: "Official departmental template for project proposals, feasibility studies, and literature reviews.",
    downloads: 195,
  },

  // ==========================================
  // SEMESTER 8
  // ==========================================
  {
    course_code: "CPE3XX3",
    type: "textbook",
    title: "Cloud Computing: Concepts, Technology & Architecture - Thomas Erl",
    filename: "Erl_Cloud_Computing_Architecture.pdf",
    description: "SaaS/PaaS/IaaS service models, hypervisors, serverless architectures, and microservice containers.",
    downloads: 145,
  },
  {
    course_code: "CPE3XX3",
    type: "quiz_assignment",
    key: "cloud_term_paper",
    title: "Depth Elective II Term Paper - Microservices & Docker Orchestration",
    filename: "Cloud_Computing_Term_Paper_Brief.pdf",
    description: "Design a fault-tolerant multi-tier architecture using Docker containerization and Kubernetes ingress.",
    downloads: 102,
  },
  {
    course_code: "CPE3XX3",
    type: "solution",
    parentKey: "cloud_term_paper",
    title: "Cloud Architecture - Kubernetes Cluster Deployment Case Study",
    filename: "Cloud_Kubernetes_Reference_Case_Study.pdf",
    description: "Complete Helm chart templates, load balancing configurations, and Prometheus monitoring blueprints.",
    downloads: 136,
  },
  {
    course_code: "CPE3XX1",
    type: "lab_manual",
    title: "Cloud Computing & Containerization Hands-On Lab Exercises",
    filename: "Cloud_Computing_Lab_Manual.pdf",
    description: "Hands-on Docker commands, Docker Compose, AWS EC2/S3 provisioning, and Terraform IaC scripts.",
    downloads: 88,
  },
  {
    course_code: "CPE4XX3B",
    type: "textbook",
    title: "Deep Learning - Ian Goodfellow, Yoshua Bengio & Aaron Courville",
    filename: "Goodfellow_Deep_Learning_Book.pdf",
    description: "Deep feedforward networks, convolutional networks (CNNs), sequence modeling (RNN/Transformers), and optimization.",
    downloads: 175,
  },
  {
    course_code: "CPE4XX1",
    type: "lab_manual",
    title: "Deep Learning Lab Manual - PyTorch Neural Networks & Transformers",
    filename: "Deep_Learning_PyTorch_Lab_Manual.pdf",
    description: "Hands-on training of ResNet image classifiers, attention mechanisms, and transfer learning with PyTorch.",
    downloads: 114,
  },
  {
    course_code: "CPE4XX4",
    type: "textbook",
    title: "Cybersecurity Essentials - Charles J. Brooks et al.",
    filename: "Cybersecurity_Essentials_Reference.pdf",
    description: "Security architecture, cryptography, vulnerability assessment, network penetration testing, and ethical hacking.",
    downloads: 122,
  },
  {
    course_code: "CPE4924",
    type: "lab_manual",
    title: "Final Year Design Project (Part-II) Final Thesis & Defense Rubric",
    filename: "FYP_Part2_Final_Thesis_Template.pdf",
    description: "Complete thesis formatting template, defense slide deck recommendations, and grading assessment rubrics.",
    downloads: 240,
  },
];

async function seedDatabase() {
  console.log("=================================================");
  console.log(" Unilib Academic Resource Database Seeder");
  console.log(` Target DB: ${config.dbType.toUpperCase()}`);
  console.log("=================================================");

  // Ensure storage directories exist
  const storageDir = path.resolve("./data/storage");
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  // Clear existing items in unilib_resources for clean seed state
  try {
    await defaultAdapter.query("DELETE FROM unilib_resources");
    console.log(`[Seed] Cleared existing unilib_resources records.`);
  } catch (err) {
    console.warn(`[Seed] Notice while clearing unilib_resources:`, err.message);
  }

  const createdParents = new Map();
  let createdCount = 0;

  for (const item of seedItems) {
    const course = await courseRepository.findByCode(item.course_code);
    if (!course) {
      console.warn(`[Seed] Course ${item.course_code} not found in courses.json, skipping.`);
      continue;
    }

    // Resolve parent if child solution
    let parentResourceId = null;
    if (item.parentKey && createdParents.has(item.parentKey)) {
      parentResourceId = createdParents.get(item.parentKey);
    }

    // Generate valid standard PDF buffer
    const pdfBuffer = createMockPdf(
      item.title,
      item.description,
      item.course_code,
      `Semester ${course.semester} Academic Resource`
    );

    // Upload resource via resourceService (persists to mbkbucket & unilib_resources)
    const resource = await resourceService.uploadResource({
      courseCode: item.course_code,
      type: item.type,
      title: item.title,
      description: item.description,
      parentResourceId,
      file: {
        originalname: item.filename,
        buffer: pdfBuffer,
        mimetype: "application/pdf",
        size: pdfBuffer.length,
      },
      uploaderId: "admin",
    });

    // Update with realistic views count
    if (item.downloads) {
      await defaultAdapter.query(
        "UPDATE unilib_resources SET views_count = $1 WHERE id = $2",
        [item.downloads, resource.id]
      );
    }

    // Record parent key if this item can be a parent
    if (item.key) {
      createdParents.set(item.key, resource.id);
    }

    createdCount++;
    const linkTag = parentResourceId ? ` (Linked to Quiz #${parentResourceId})` : "";
    console.log(` [✓] Seeded [${course.code} | Sem ${course.semester}] ${item.type.toUpperCase()}: "${item.title}"${linkTag}`);
  }

  // Invalidate all caches
  await cacheService.clear();

  const totalInDb = await resourceRepository.getCount();
  const totalViews = await resourceRepository.getTotalViews();

  console.log("=================================================");
  console.log(` [Success] Successfully seeded ${createdCount} academic materials!`);
  console.log(` [Status] Total Resources in DB: ${totalInDb}`);
  console.log(` [Status] Total Views Count: ${totalViews}`);
  console.log("=================================================");
}

seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("[Seed Error]:", err);
    process.exit(1);
  });
