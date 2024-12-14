import express from "express";
import fs from "fs/promises"; // Use the promisified version of fs
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import crypto from "crypto";
import cors from "cors";
const app = express();
app.use(cors());




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



// Route to append content to the file
app.post("/append-file", async (req, res) => {
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


const PORT = 3033;

// Start the server 
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export default app;