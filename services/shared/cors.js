export const corsMiddleware = (req, res, next) => {
  const configured = String(process.env.CORS_ORIGINS || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowAll = configured.length === 0 || configured.includes("*");
  const origin = req.headers.origin;

  if (allowAll) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    if (origin) res.setHeader("Vary", "Origin");
  } else if (origin && configured.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
};
