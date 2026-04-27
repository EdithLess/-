import express from "express";
import axios from "axios";
import SubjectSelection from "./models/SubjectSelection.js";

const router = express.Router();

const RSHU_API_BASE = process.env.RSHU_API_BASE || "http://localhost:3001";

function getCurrentSelectionYear() {
  const now = new Date();
  return now.getMonth() >= 8 ? now.getFullYear() + 1 : now.getFullYear();
}

async function fetchOptionalSpeciality(speciality, course) {
  const encodedSpeciality = encodeURIComponent(speciality);
  const url = `${RSHU_API_BASE}/subjects/optional/${encodedSpeciality}`;
  const params = {};
  if (Number.isFinite(course)) {
    params.course = course;
  }
  try {
    const response = await axios.get(url, { timeout: 10000, params });
    return response.data;
  } catch (err) {
    const isNotFound = err?.response?.status === 404;
    if (!isNotFound || !Number.isFinite(course)) {
      throw err;
    }

    // Fallback for RSHU API variant that exposes optional groups via curriculum route.
    const fallbackUrl = `${RSHU_API_BASE}/curriculum/${encodedSpeciality}/${course}/optional`;
    const fallbackResponse = await axios.get(fallbackUrl, { timeout: 10000 });
    const groups = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [];

    return {
      optional_speciality: groups.map((group) => {
        const column = String(group?.column || "");
        const subjects = Array.isArray(group?.subjects) ? group.subjects : [];
        return subjects
          .filter((subject) => subject?.id && subject?.name)
          .map((subject) => ({
            id: subject.id,
            column,
            name: subject.name,
            cathedra: subject.cathedra || undefined,
          }));
      }),
      optional_rshu: [],
    };
  }
}

function normalizeSelections(rawSelections) {
  if (!Array.isArray(rawSelections)) {
    return [];
  }

  return rawSelections
    .filter((item) => item && item.column && item.id && item.name)
    .map((item) => ({
      column: String(item.column),
      id: String(item.id),
      name: String(item.name),
      cathedra: item.cathedra ? String(item.cathedra) : undefined,
    }));
}

async function getStudentById(studentId) {
  const response = await axios.get(`${RSHU_API_BASE}/students/${studentId}`, { timeout: 10000 });
  return response.data;
}

router.get("/students", async (req, res) => {
  try {
    const group = req.query.group;
    const speciality = req.query.speciality;

    const response = await axios.get(`${RSHU_API_BASE}/students`, {
      timeout: 10000,
      params: {
        group,
        speciality,
      },
    });

    return res.json({ students: response.data || [] });
  } catch (err) {
    console.error("/api/electives/students error", err.message);
    return res.status(502).json({ message: "Failed to fetch students from RSHU API" });
  }
});

router.get("/student/:id", async (req, res) => {
  try {
    const studentId = Number(req.params.id);
    if (!studentId) {
      return res.status(400).json({ message: "Invalid student id" });
    }

    const student = await getStudentById(studentId);
    return res.json({ student });
  } catch (err) {
    if (err?.response?.status === 404) {
      return res.status(404).json({ message: "Student not found" });
    }
    console.error("/api/electives/student/:id error", err.message);
    return res.status(502).json({ message: "Failed to fetch student from RSHU API" });
  }
});

router.get("/options", async (req, res) => {
  try {
    const studentId = Number(req.query.studentId);
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }
    const student = await getStudentById(studentId);

    const speciality = req.query.speciality || student.speciality;
    const course = Number(req.query.course || student.course);

    if (!speciality) {
      return res.status(400).json({ message: "Speciality is required" });
    }

    const rawData = await fetchOptionalSpeciality(speciality, course);
    const optionalSpeciality = Array.isArray(rawData.optional_speciality)
      ? rawData.optional_speciality
      : [];

    const options = optionalSpeciality.map((columnGroup) => ({
      column: columnGroup[0]?.column || "",
      subjects: columnGroup.map((subj) => ({
        id: subj.id,
        name: subj.name,
      })),
    }));

    return res.json({
      student,
      year: getCurrentSelectionYear(),
      speciality,
      course: Number.isNaN(course) ? null : course,
      options,
      optional_rshu: rawData.optional_rshu || [],
    });
  } catch (err) {
    console.error("/api/electives/options error", err.message);
    return res.status(502).json({ message: "Failed to fetch options from RSHU API" });
  }
});

router.get("/my-selection", async (req, res) => {
  try {
    const studentId = Number(req.query.studentId);
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }

    const year = Number(req.query.year || getCurrentSelectionYear());
    const selection = await SubjectSelection.findOne({
      externalStudentId: studentId,
      year,
    });

    return res.json({ year, selection });
  } catch (err) {
    console.error("/api/electives/my-selection error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.post("/confirm", async (req, res) => {
  try {
    const studentId = Number(req.body.studentId);
    if (!studentId) {
      return res.status(400).json({ message: "studentId is required" });
    }
    const student = await getStudentById(studentId);

    const year = Number(req.body.year || getCurrentSelectionYear());
    const selections = normalizeSelections(req.body.selections);

    if (selections.length === 0) {
      return res.status(400).json({ message: "No selected subjects" });
    }

    const existing = await SubjectSelection.findOne({ externalStudentId: studentId, year });
    if (existing) {
      return res.status(409).json({ message: "Selection for this year already confirmed" });
    }

    const saved = await SubjectSelection.create({
      externalStudentId: studentId,
      studentName: student.name,
      year,
      speciality: student.speciality,
      course: student.course,
      group: student.group,
      selections,
      status: "confirmed",
      confirmedAt: new Date(),
    });

    const payload = {
      optional_subjects: selections.map((item) => ({
        id: item.id,
        name: item.name,
        cathedra: item.cathedra || null,
      })),
    };

    try {
      await axios.put(`${RSHU_API_BASE}/optional_subjects/${studentId}`, payload, {
        timeout: 10000,
      });
    } catch (externalErr) {
      console.error("RSHU optional_subjects sync error", externalErr.message);
    }

    return res.status(201).json({ message: "Selection confirmed", selection: saved });
  } catch (err) {
    console.error("/api/electives/confirm error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.get("/selections", async (req, res) => {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const group = req.query.group;
    const speciality = req.query.speciality;
    const studentId = req.query.studentId ? Number(req.query.studentId) : undefined;

    const filter = {};
    if (year) filter.year = year;
    if (group) filter.group = group;
    if (speciality) filter.speciality = speciality;
    if (studentId) filter.externalStudentId = studentId;

    const rows = await SubjectSelection.find(filter).sort({ createdAt: -1 });

    return res.json({ count: rows.length, selections: rows });
  } catch (err) {
    console.error("/api/electives/selections error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/selections/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const nextSelections = normalizeSelections(req.body.selections);
    const nextStatus = req.body.status;

    const update = {};
    if (nextSelections.length) {
      update.selections = nextSelections;
    }
    if (nextStatus && ["draft", "confirmed", "edited_by_admin"].includes(nextStatus)) {
      update.status = nextStatus;
    }

    const row = await SubjectSelection.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: true,
    });

    if (!row) {
      return res.status(404).json({ message: "Selection not found" });
    }

    return res.json({ message: "Selection updated", selection: row });
  } catch (err) {
    console.error("/api/electives/selections/:id error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
