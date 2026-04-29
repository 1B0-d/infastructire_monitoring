import "dotenv/config";
import express from "express";
import { requireAuth } from "../shared/auth.js";
import { corsMiddleware } from "../shared/cors.js";
import { markServiceHealth, metricsHandler, metricsMiddleware } from "../shared/metrics.js";

const app = express();
const port = process.env.PORT || 4000;
const serviceName = "auth-service";

app.use(corsMiddleware);
app.use(express.json());
app.use(metricsMiddleware(serviceName));

app.get("/metrics", metricsHandler);

app.get("/health", (_req, res) => {
  markServiceHealth(serviceName, true);
  res.json({ status: "ok", service: serviceName });
});

app.get("/api/me", requireAuth, (req, res) => {
  res.json(req.authUser);
});

app.post("/api/bootstrap-user", requireAuth, (req, res) => {
  res.json({
    status: "ok",
    user: {
      ...req.authUser,
      name: req.body?.name || req.authUser.name
    }
  });
});

app.get("/api/auth/verify", requireAuth, (req, res) => {
  res.json({ valid: true, user: req.authUser });
});

app.get("/api/auth/profile", requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(port, () => {
  console.log(`${serviceName} listening on ${port}`);
});
