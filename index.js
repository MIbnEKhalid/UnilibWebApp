import express from "express";
import fs from "fs/promises"; // Use the promisified version of fs
import path from "path";
import { fileURLToPath } from "url";
const app = express();
// const token = process.env.GITHUB_TOKEN;

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

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export default app;