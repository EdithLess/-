export function requireAuth(req, res, next) {
  if (!req.session?.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.user?._id) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (req.session.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  return next();
}
