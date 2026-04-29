import { getFirebaseAuth } from "./firebaseAdmin.js";

const userFromToken = (decoded) => {
  const rawRole = typeof decoded.role === "string" ? decoded.role.toLowerCase() : "";
  const isAdmin = decoded.admin === true || rawRole === "admin";

  return {
    uid: decoded.uid,
    email: decoded.email || "",
    name: decoded.name || decoded.email || "Firebase user",
    role: isAdmin ? "admin" : "user",
    claims: decoded
  };
};

export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const idToken = authHeader.slice("Bearer ".length).trim();
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    req.authUser = userFromToken(decoded);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
};

export const requireAdmin = (req, res, next) => {
  if (!req.authUser) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.authUser.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  next();
};
