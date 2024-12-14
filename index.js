import express from "express";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
// const token = process.env.GITHUB_TOKEN;

// Prevent HTTP cache
app.use((req, res, next) => {
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
 
 
 
// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

export default app;