import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json()); // To parse JSON request bodies

const filePath = path.join(__dirname, "ti.json"); // File to read/write


// Route to read file content
app.get("/read-file", (req, res) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read the file." });
        }
        res.status(200).json({ data: JSON.parse(data) });
    });
});

// Route to write new content to the file
app.post("/write-file", (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: "Content is required." });
    }

    fs.writeFile(filePath, JSON.stringify(content, null, 2), (err) => {
        if (err) {
            return res.status(500).json({ error: "Failed to write to the file." });
        }
        res.json({ message: "File updated successfully." });
    });
});

// Route to append content to the file
app.post("/append-file", (req, res) => {
    const { content } = req.body;

    if (!content) {
        return res.status(400).json({ error: "Content is required." });
    }

    fs.readFile(filePath, "utf-8", (err, data) => {
        if (err) {
            return res.status(500).json({ error: "Failed to read the file." });
        }

        let jsonData = JSON.parse(data);
        jsonData.push(content);

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