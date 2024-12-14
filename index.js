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
  "project_id": "unilib-98598",
  "private_key_id": "0b76eacb46de4895ac315896d395d6813e1dd643",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCgJbZgWjyl8zFS\nLWYI0nhTim9Maf6gRYnxquCQjc5UlrkZziU51aAmGcGQAb939DhQSetCRptQ/uGF\n20GGrROhKuMnYdfTLiewI3VCFOMLSR2+3NcCxwK6iUMor54BwtlW0zjp8V6T50bU\nES0tgYWZ/vjpBmaZRL9afyalMnksr+7L3iqRHr8EtMAP+PSUoMPeRqBvmmN+fEFq\nihTQSMLnXQDBqkJTCz6H17IV7ldsiiPUT71jSeAwXalp3jXdRMkJddA5ddHhhVER\nlErKjBmTJt/RLvsGnjfmGRK10UrN8XkNZ+JfDA7l4SvKVK1iUSALW2SXstX1l2hZ\npedIV7lZAgMBAAECggEAFym9OixzDzGglZk5Y9dFThf8xxmhmX7VV932QxIvoK54\nMVJOshHC6x/YjkKidfAd4Qb//wMFXe6vodO3o4oPB8WTO1P8im/nj6NhR2CMAkre\nAYghlSZBr8dArnbQLMMI+nTsi3G80zmlVfDyDt3n/AET8WhamJqH7sfrSAOH4T2K\nUfphyPWEidQerRTrOEc/71ko5bbZJ2ieQ0EAlCQMkQQYc/A/KiTYObAhpcWKtWzV\nrpRUP4Yn5vfunfs8s0mpiufF2RXLWCMme2gt9yXmC76//EpQJGfXhKVIHXwKSM2N\ns+Ei0xxdS5hLweKflqCPwtgHNq+X01h41OybEvJ+sQKBgQDbhDp6jZov7jJoE3b2\n6+FnMwdEpROqu1D5IMY+AHAlS2vot0g5W1kqZ1mcAtvQ/NnRNRP2GC4EGzXglmRi\n0q7n1dSJhLtlz46fUL5LFENHHANZuvbrqDTyHkB+waP9z+EwOtnGMmoGc3o7WQ55\nqYWgdg9BmvHRfzVUmr2jaERe7QKBgQC6w4B6C15ib5ZzSPnJO64nGQdW2iuTkRO9\nt+SFrcX2MMlvU5SJFBtXmmt4I8jdKCjMYrzE1vevi2yAbCaY4YZh2RgBhIe+y29R\ndUCV8Yqo/f2WDACTafh+PUBKoszrND6BxMkuuLanyii7gPR+LG9kzui/xWULZ6f+\nX1gutr1KnQKBgCj3wY4ztS3yz3d7An3MwfFnpZibElOPx+nmwvi5TjS3obj508HY\nmYh/Z0rlga68Mc6IkGQiWRwtE94JU0zaMwhTcOoFWpACr4RuJkWOz4uK39k0Onb6\nmn8BRFoju35X+Jfus8v4hq8TiCFhWoE8MRMkVW6SA0Vs70AN7Qx9Hh11AoGBALa+\n27UP8MADDkUqL/g/JG5vaCYM/ry7JYTrLnm7iswV+tSrBNmIyiRTHjuFUGNOi3VK\nXAmDiwLDO10B9lZ7vqF56qp5gtYne3pKb/MIUTSAqySqA9o6xALKbmFZoYe4LD2Q\nT4cfCONvxaGLUjEvy6PpbgdP4EpjmBcoNkInX1tlAoGBAL53EgiypbXNf4HiPFAp\nniqq3jpQAAomNJpBi7qAvNkSO2IDZP/hhJv2mHBByRJiSEoFnUyB37JAC5qfctIh\n7Lmozd6Pamda/duWBLuAmcD9DPF51TTu593iOYUR/z72nyf4LdfCflI2cQeeW+yJ\n2vPXU9RAA2vyngU7JI3uvBi5\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-zu9tu@unilib-98598.iam.gserviceaccount.com",
  "client_id": "116911042752294791781",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-zu9tu%40unilib-98598.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://unilib-98598-default-rtdb.asia-southeast1.firebasedatabase.app/" // Replace with your database URL
});

const db = admin.database(); // For  Realtime Database

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
