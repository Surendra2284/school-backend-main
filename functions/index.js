require("dotenv").config();
console.log("MongoDB URI:", process.env.MONGODB_URI);
const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const app = require("./rest");
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`Received request: ${req.method} ${req.url}`);
  next();
});
// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Hello from Firebase!" });
});
app.use((err, req, res, next) => {
  console.error("Internal Error:", err.message);
  res.status(500).json({ message: "Internal Server Error", error: err.message });
});
console.log("Function is starting...");
exports.api = functions.https.onRequest(app);
// Export the function
console.log("Function initialized successfully!");