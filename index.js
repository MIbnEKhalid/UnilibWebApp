import express from "express";
import fs from "fs/promises"; // Use the promisified version of fs
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";
import cors from "cors";
import admin from "firebase-admin";

const serviceAccount = {
  "type": "service_account",
  "project_id": process.env.project_id,
  "private_key_id": process.env.private_key_id,
  "private_key": process.env.private_key,
  "client_email": process.env.dburl,
  "client_id": process.env.dburl,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": process.env.client_x509_cert_url,
  "universe_domain": "googleapis.com"
};
console.log(serviceAccount);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.dburl // Replace with your database URL
});

const db = admin.database(); // For Realtime Database

const app = express();
app.use(cors());
app.use(express.json()); // Add this line to parse JSON bodies

const config = {
  customKey: "45525",
  validTokens: [
    { token: "4552255", status: "active" },
    { token: "4552528", status: "active" },
    { token: "4552525", status: "active" },
  ],
};
const filePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "public/Assets/assigmentsNquiz.json"
);

function ffuck(){
  const ref = db.ref("users");
  ref.child("user1").set({
    name: "John Doe",
    email: "john.doe@example.com",
    age: 25
  }).then(() => {
    console.log("Data written successfully!");
  }).catch(error => {
    console.error("Error writing data:", error);
  });
  console.log("lets fucking go");
}



// Prevent HTTP cache
app.use((_, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/history", express.static(path.join(__dirname, "public/history")));
app.use("/add", express.static(path.join(__dirname, "public/add/")));
app.use("/", express.static(path.join(__dirname, "public/")));
 

// Route to read file content
app.get("/read-file", async (_, res) => {
  try {
    const data = await fs.readFile(filePath, "utf-8");
    res.status(200).json({ data: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ error: "Failed to read the file." });
  }
});

// Utility function for hashing tokens
const hashToken = (token) => {
  return crypto
    .createHmac("sha256", config.customKey)
    .update(token)
    .digest("hex");
};

// Hash the tokens in the validTokens array
config.validTokens.forEach((tokenObj) => {
  tokenObj.token = hashToken(tokenObj.token);
});

// Token authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  console.log(token);
  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  const hashedToken = hashToken(token);
  const validToken = config.validTokens.find((t) => t.token === hashedToken);

  if (!validToken) {
    return res.status(403).json({ error: "Invalid token." });
  }

  if (validToken.status === "inactive") {
    return res
      .status(403)
      .json({ error: "Your Token is inactive. Please Contact Admin" });
  }

  next();
};

app.get("/tasks", async (req, res) => {
  try {
    // Reference to the database node where the tasks are stored
    const ref = db.ref("tasks");

    // Fetch all tasks from the database
    ref.once("value", (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val(); // Get the tasks as an object
        console.log("Tasks retrieved successfully:", data);
        res.json(data); // Return the tasks as JSON
      } else {
        console.log("No tasks found.");
        res.json([]); // Return an empty array if no tasks exist
      }
    });
  } catch (err) {
    console.error("Failed to retrieve tasks from Firebase:", err);
    res.status(500).json({ error: "Failed to retrieve tasks from Firebase." });
  }
});


app.post("/append-file", authenticateToken, async (req, res) => {
  const { content } = req.body;

  // Validate the content
  if (
    !content ||
    typeof content.issueDate !== "string" ||
    typeof content.dueDate !== "string" ||
    typeof content.subject !== "string" ||
    typeof content.description !== "string"
  ) {
    console.log("Invalid content received:", content);
    return res.status(400).json({
      error:
        "Invalid content. Please provide an object with the required fields: issueDate, dueDate, subject, and description.",
    });
  }

  try {
    // Reference to the database node where you want to append data
    const ref = db.ref("tasks"); // Replace "tasks" with your desired database path

    // Push the new content to Firebase
    const newContentRef = ref.push();
    await newContentRef.set(content);

    console.log("Content appended to Firebase successfully:", content);
    res.json({ message: "Content appended to Firebase successfully." });
  } catch (err) {
    console.error("Failed to append to Firebase:", err);
    res.status(500).json({ error: "Failed to append to Firebase." });
  }
});
const PORT = 3033;

// Start the server 
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export default app;