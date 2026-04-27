import express from "express";
import User from "./models/User.js";
import bcrypt from "bcryptjs";

const router = express.Router();

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function toSessionUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    role: user.role,
    studentId: user.studentId,
    course: user.course,
    speciality: user.speciality,
    group: user.group,
  };
}

// Local registration
router.post("/register", async (req, res) => {
  try {
    const { name, password, course, speciality, group, studentId } = req.body;
    const email = normalizeEmail(req.body.email);
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hashed,
      provider: "local",
      course: course ? Number(course) : undefined,
      speciality: speciality || undefined,
      group: group || undefined,
      studentId: studentId ? Number(studentId) : undefined,
    });

    req.session.user = toSessionUser(user);

    return res.status(201).json({
      message: "Registered successfully",
      user: req.session.user,
    });
  } catch (err) {
    console.error("/register error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Local login
router.post("/login", async (req, res) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    req.session.user = toSessionUser(user);

    return res.json({ message: "Logged in", user: req.session.user });
  } catch (err) {
    console.error("/login error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  req.session = null;
  return res.json({ message: "Logged out" });
});

router.get("/me", async (req, res) => {
  try {
    if (!req.session?.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(req.session.user._id);
    if (!user) {
      req.session = null;
      return res.status(401).json({ message: "Unauthorized" });
    }

    const safeUser = toSessionUser(user);
    req.session.user = safeUser;
    return res.json({ user: safeUser });
  } catch (err) {
    console.error("/me error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

router.put("/profile", async (req, res) => {
  try {
    if (!req.session?.user?._id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const updates = {};
    if (req.body.course !== undefined) updates.course = Number(req.body.course);
    if (req.body.speciality !== undefined) updates.speciality = String(req.body.speciality || "").trim() || undefined;
    if (req.body.group !== undefined) updates.group = String(req.body.group || "").trim() || undefined;
    if (req.body.studentId !== undefined) {
      updates.studentId = req.body.studentId ? Number(req.body.studentId) : undefined;
    }

    const user = await User.findByIdAndUpdate(req.session.user._id, updates, {
      new: true,
      runValidators: true,
    });

    if (!user) {
      req.session = null;
      return res.status(401).json({ message: "Unauthorized" });
    }

    const safeUser = toSessionUser(user);
    req.session.user = safeUser;

    return res.json({ message: "Profile updated", user: safeUser });
  } catch (err) {
    console.error("/profile error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Debug: list users (verification)
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}).select("name email provider role studentId course speciality group");
    return res.json(users);
  } catch (err) {
    console.error("/users error", err);
    return res.status(500).json({ message: "Server error" });
  }
});

export default router;
