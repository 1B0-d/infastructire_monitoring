import "dotenv/config";
import express from "express";
import { requireAdmin, requireAuth } from "../shared/auth.js";
import { corsMiddleware } from "../shared/cors.js";
import { connectMongo, mongoHealth } from "../shared/db.js";
import { markServiceHealth, metricsHandler, metricsMiddleware } from "../shared/metrics.js";
import { ChatMessage } from "../shared/models.js";

const app = express();
const port = process.env.PORT || 4004;
const serviceName = "chat-service";

app.use(corsMiddleware);
app.use(express.json());
app.use(metricsMiddleware(serviceName));

app.get("/metrics", metricsHandler);

app.get("/health", (_req, res) => {
  const connected = mongoHealth() === "connected";
  markServiceHealth(serviceName, connected);
  res.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "degraded",
    service: serviceName,
    database: mongoHealth()
  });
});

app.post("/api/messages", requireAuth, async (req, res, next) => {
  try {
    const subject = String(req.body.subject || "").trim();
    const text = String(req.body.text || "").trim();
    const toUserId = String(req.body.toUserId || "support").trim();

    if (!subject || !text) {
      return res.status(400).json({ error: "subject and text are required" });
    }

    const message = await ChatMessage.create({
      userId: req.authUser.uid,
      userEmail: req.authUser.email,
      userName: req.authUser.name,
      toUserId,
      subject,
      text,
      status: "pending"
    });

    res.status(201).json(message);
  } catch (error) {
    next(error);
  }
});

app.get("/api/messages", requireAuth, async (req, res, next) => {
  try {
    const messages = await ChatMessage.find({ userId: req.authUser.uid }).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/messages", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const messages = await ChatMessage.find({}).sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/reply", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const id = String(req.body.id || "").trim();
    const reply = String(req.body.reply || "").trim();

    if (!id || !reply) {
      return res.status(400).json({ error: "id and reply are required" });
    }

    await ChatMessage.findByIdAndUpdate(id, {
      reply,
      status: "answered",
      answeredAt: new Date()
    });

    res.json({ status: "ok" });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Chat service error" });
});

const start = async () => {
  await connectMongo();
  app.listen(port, () => {
    console.log(`${serviceName} listening on ${port}`);
  });
};

start().catch((error) => {
  console.error(`${serviceName} failed to start`, error);
  process.exit(1);
});
