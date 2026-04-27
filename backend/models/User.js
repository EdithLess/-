import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  provider: { type: String, default: "local" },
  password: { type: String },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  studentId: { type: Number },
  course: { type: Number },
  speciality: { type: String },
  group: { type: String },
});

export default mongoose.model("User", userSchema);
