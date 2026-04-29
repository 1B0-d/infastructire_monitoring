import "dotenv/config";
import express from "express";
import { requireAuth } from "../shared/auth.js";
import { corsMiddleware } from "../shared/cors.js";
import { connectMongo, mongoHealth } from "../shared/db.js";
import { markServiceHealth, metricsHandler, metricsMiddleware } from "../shared/metrics.js";
import { Order, Product } from "../shared/models.js";

const app = express();
const port = process.env.PORT || 4002;
const serviceName = "order-service";

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

app.post("/api/orders", requireAuth, async (req, res, next) => {
  try {
    const { productId, size, color } = req.body;
    const quantity = Math.max(parseInt(req.body.quantity || "1", 10), 1);

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }

    const product = await Product.findById(productId);
    if (!product || product.isActive === false) {
      return res.status(404).json({ error: "Product not found" });
    }

    const items = [{
      product: product._id,
      size: size || product.sizes?.[0] || "",
      color: color || product.colors?.[0] || "",
      quantity,
      price: product.price
    }];

    const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = await Order.create({
      userId: req.authUser.uid,
      userEmail: req.authUser.email,
      productId: product._id,
      items,
      totalPrice,
      status: "created"
    });

    const populated = await Order.findById(order._id).populate("items.product");
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

app.get("/api/orders/my", requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const skip = (page - 1) * limit;
    const filter = { userId: req.authUser.uid };

    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate("items.product"),
      Order.countDocuments(filter)
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Order service error" });
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
