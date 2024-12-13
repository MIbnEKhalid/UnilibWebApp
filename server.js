import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json()); // To parse JSON request bodies
// Define a secret key for hashing
const customKey = "45525"; // Replace with your own secret key

const filePath = path.join(__dirname, "Assets/assigmentsNquiz.json"); // File to read/write
app.use(
  "/Assets",
  express.static(path.join(__dirname, "Assets"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);
// Route to read file content
app.get("/read-file", (req, res) => {
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read the file." });
    }
    res.status(200).json({ data: JSON.parse(data) });
  });
});

app.get("/append-file", (req, res) => {
  res.sendFile(path.join(__dirname, "ui.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});
app.get("/history", (req, res) => {
  res.sendFile(path.join(__dirname, "history/index.html"));
});
app.get("/History", (req, res) => {
  res.sendFile(path.join(__dirname, "history/index.html"));
});

const validTokens = [
  { token: "4552255", status: "active" },
  { token: "4552528", status: "inactive" },
  { token: "4552525", status: "active" },
];

const hashToken = (token) => {
  return crypto.createHmac("sha256", customKey).update(token).digest("hex");
};

// Hash the tokens in the validTokens array
validTokens.forEach((tokenObj) => {
  tokenObj.token = hashToken(tokenObj.token);
});

// Modify the authenticateToken middleware to hash the incoming token
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  // console.log('Received token:', token);

  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  const hashedToken = hashToken(token);

  // Check if the hashed token exists and if it's active
  const validToken = validTokens.find((t) => t.token === hashedToken);
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

// Route to append content to the file
app.post("/append-file", authenticateToken, (req, res) => {
  const { content } = req.body;

  // Validate the content
  if (
    !content ||
    typeof content.issueDate !== "string" ||
    typeof content.dueDate !== "string" ||
    typeof content.subject !== "string" ||
    typeof content.description !== "string"
  ) {
    return res.status(400).json({
      error:
        "Invalid content. Please provide an object with the required fields: issueDate, dueDate, subject, and description.",
    });
  }

  // Read the existing file
  fs.readFile(filePath, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read the file." });
    }

    let jsonData;

    try {
      jsonData = JSON.parse(data); // Parse the existing data
    } catch (parseErr) {
      return res.status(500).json({ error: "File content is not valid JSON." });
    }

    // Append the new content
    jsonData.push(content);

    // Write back to the file
    fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        return res.status(500).json({ error: "Failed to append to the file." });
      }
      res.json({ message: "Content appended successfully." });
    });
  });
});

// Start the server
const PORT = 3030;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
