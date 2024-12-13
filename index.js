import express from "express";
import fs from "fs/promises"; // Use the promisified version of fs
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";

// Configuration file
const config = {
  customKey: "45525", // Replace with your own secret key
  filePath: path.join(
    dirname(fileURLToPath(import.meta.url)),
    "Assets/assigmentsNquiz.json"
  ),
  validTokens: [
    { token: "4552255", status: "active" },
    { token: "4552528", status: "active" },
    { token: "4552525", status: "active" },
  ],
  port: 3033,
};

const app = express();
app.use(express.json()); // To parse JSON request bodies


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

// Serve static files
app.use(
  "/Assets",
  express.static(path.join(dirname(fileURLToPath(import.meta.url)), "Assets"), {
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

// Route to read file content
app.get("/read-file", async (req, res) => {
  try {
    const data = await fs.readFile(config.filePath, "utf-8");
    res.status(200).json({ data: JSON.parse(data) });
  } catch (err) {
    res.status(500).json({ error: "Failed to read the file." });
  }
});

// Route to serve the append file page
app.get("/add", (req, res) => {
  res.sendFile(path.join(dirname(fileURLToPath(import.meta.url)), "ui.html"));
});
// Route to serve the append file page
app.get("/Add", (req, res) => {
  res.sendFile(path.join(dirname(fileURLToPath(import.meta.url)), "ui.html"));
});

// Route to serve the main index page
app.get("/", (req, res) => {
  res.sendFile(
    path.join(dirname(fileURLToPath(import.meta.url)), "index.html")
  );
});

// Route to serve the history page
app.get("/history", (req, res) => {
  res.sendFile(
    path.join(dirname(fileURLToPath(import.meta.url)), "history/index.html")
  );
});

app.get("/History", (req, res) => {
  res.sendFile(
    path.join(dirname(fileURLToPath(import.meta.url)), "history/index.html")
  );
});

// Route to append content to the file
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
    return res.status(400).json({
      error:
        "Invalid content. Please provide an object with the required fields: issueDate, dueDate, subject, and description.",
    });
  }

  try {
    // Read existing data
    const data = await fs.readFile(config.filePath, "utf-8");
    let jsonData = JSON.parse(data); // Parse the existing data

    // Append the new content
    jsonData.push(content);

    // Write back to the file
    await fs.writeFile(config.filePath, JSON.stringify(jsonData, null, 2));
    res.json({ message: "Content appended successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to append to the file." });
  }
});

// Start the server
app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
