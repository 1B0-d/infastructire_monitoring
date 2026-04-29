import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import { requireAuth } from "../shared/auth.js";
import { corsMiddleware } from "../shared/cors.js";
import { connectMongo, mongoHealth } from "../shared/db.js";
import { markServiceHealth, metricsHandler, metricsMiddleware } from "../shared/metrics.js";
import { Category, Product } from "../shared/models.js";
import { seedCatalog } from "../shared/seedCatalog.js";

const app = express();
const port = process.env.PORT || 4001;
const serviceName = "product-service";

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

app.get("/api/categories", requireAuth, async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });
    res.json({ items: categories, total: categories.length });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products", requireAuth, async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;
    const filter = { isActive: true };

    if (req.query.category) {
      const categoryQuery = String(req.query.category);
      const categoryFilter = mongoose.Types.ObjectId.isValid(categoryQuery)
        ? { $or: [{ _id: categoryQuery }, { slug: categoryQuery }] }
        : { slug: categoryQuery };
      const category = await Category.findOne(categoryFilter);
      if (category) filter.category = category._id;
    }

    if (req.query.q) {
      const q = String(req.query.q).trim();
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } }
      ];
    }

    const [items, total] = await Promise.all([
      Product.find(filter).populate("category").sort({ createdAt: -1 }).skip(skip).limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({ items, page, limit, total, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/products/:id", requireAuth, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate("category");
    if (!product || product.isActive === false) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Product service error" });
});

const start = async () => {
  await connectMongo();
  await seedCatalog();
  app.listen(port, () => {
    console.log(`${serviceName} listening on ${port}`);
  });
};

start().catch((error) => {
  console.error(`${serviceName} failed to start`, error);
  process.exit(1);
});
