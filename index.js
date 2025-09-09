import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoute.js";
import { sanitizeMiddleware } from "./middleware/sanitization.js";
import mongoose from "mongoose";
import connectDB from "./config/connectDB.js";
import { injecttionDetection } from "./middleware/injectionDetection.js";
const PORT = process.env.PORT || 8080;

const app = express();

connectDB()

app.use(cors());
app.use(express.json());

app.use("/chat", chatRoutes);

mongoose.connection.once('open', () => {
  console.log('Connected to MongoDB');
  app.listen(PORT,console.log(`Server running on http://localhost:${PORT}`)
  );
});
