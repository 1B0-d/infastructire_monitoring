import "dotenv/config";
import express from "express";
import { requireAuth } from "../shared/auth.js";
import { corsMiddleware } from "../shared/cors.js";
import { markServiceHealth, metricsHandler, metricsMiddleware } from "../shared/metrics.js";

const app = express();
const port = process.env.PORT || 4003;
const serviceName = "user-service";
const orderServiceUrl = (process.env.ORDER_SERVICE_URL || "http://order-service:4002").replace(/\/+$/, "");

app.use(corsMiddleware);
app.use(express.json());
app.use(metricsMiddleware(serviceName));

app.get("/metrics", metricsHandler);

app.get("/health", (_req, res) => {
  markServiceHealth(serviceName, true);
  res.json({ status: "ok", service: serviceName });
});

app.get("/api/users/me", requireAuth, (req, res) => {
  res.json({ user: req.authUser });
});

app.get("/api/profile", requireAuth, (req, res) => {
  res.json({
    user: req.authUser,
    profile: {
      name: "Ildar Savzikhanov",
      headline: "Software Engineering student",
      location: "Kazakhstan",
      skills: ["Go", "Node.js", "React", "MongoDB", "Firebase", "Docker"]
    }
  });
});

app.get("/api/projects", requireAuth, (_req, res) => {
  res.json([
    {
      id: "auth-service",
      title: "Authentication Service",
      description: "Verifies Firebase ID tokens and provides authenticated session information.",
      stack: ["Node.js", "Firebase Admin"]
    },
    {
      id: "product-service",
      title: "Product Service",
      description: "Serves product and category data from MongoDB.",
      stack: ["Node.js", "MongoDB"]
    },
    {
      id: "order-service",
      title: "Order Service",
      description: "Creates and lists user orders with Firebase uid ownership.",
      stack: ["Node.js", "MongoDB"]
    },
    {
      id: "user-service",
      title: "User Service",
      description: "Owns profile/project API and calls Order Service internally for user orders.",
      stack: ["Node.js", "HTTP"]
    },
    {
      id: "chat-service",
      title: "Chat Between User Service",
      description: "Stores user messages and admin replies.",
      stack: ["Node.js", "MongoDB"]
    }
  ]);
});

app.get("/api/my-orders", requireAuth, async (req, res) => {
  const target = new URL("/api/orders/my", orderServiceUrl);
  target.search = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

  try {
    const response = await fetch(target, {
      headers: { Authorization: req.headers.authorization }
    });

    if (response.status >= 500) {
      return res.status(503).json({ error: "Order service unavailable" });
    }

    const payload = await response.text();
    res.status(response.status).type(response.headers.get("content-type") || "application/json").send(payload);
  } catch {
    res.status(503).json({ error: "Order service unavailable" });
  }
});

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(port, () => {
  console.log(`${serviceName} listening on ${port}`);
});
