import mongoose from "mongoose";

const selectedSubjectSchema = new mongoose.Schema(
  {
    column: { type: String, required: true },
    id: { type: String, required: true },
    name: { type: String, required: true },
    cathedra: { type: String },
  },
  { _id: false }
);

const subjectSelectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    externalStudentId: { type: Number, required: true, index: true },
    studentName: { type: String },
    year: { type: Number, required: true, index: true },
    speciality: { type: String },
    course: { type: Number },
    group: { type: String },
    selections: { type: [selectedSubjectSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "confirmed", "edited_by_admin"],
      default: "confirmed",
    },
    confirmedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

subjectSelectionSchema.index({ externalStudentId: 1, year: 1 }, { unique: true });

export default mongoose.model("SubjectSelection", subjectSelectionSchema);
