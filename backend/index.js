import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import cookieSession from "cookie-session";
import authRoutes from "./auth.js";
import electivesRoutes from "./electives.js";

dotenv.config();

const app = express();

// CORS (дозволяємо React)
app.use(
  cors({
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Cookie Session
app.use(
  cookieSession({
    name: "session",
    keys: ["supersecretkey123"],
    maxAge: 24 * 60 * 60 * 1000, // 1 day
  })
);

// ROUTES
app.use("/auth", authRoutes);
app.use("/api/electives", electivesRoutes);

// MongoDB CONNECT
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// START SERVER
app.listen(5000, () => console.log("🚀 Server running on port 5000",));

