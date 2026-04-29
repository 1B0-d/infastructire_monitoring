import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, unique: true },
  image: String,
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const productSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  sizes: [String],
  colors: [String],
  images: [String],
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",
    required: true
  },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const orderSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  userEmail: String,
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    size: String,
    color: String,
    quantity: Number,
    price: Number
  }],
  totalPrice: Number,
  status: {
    type: String,
    enum: ["created", "paid", "shipped", "cancelled"],
    default: "created"
  }
}, { timestamps: true });

const chatMessageSchema = new mongoose.Schema({
  userId: { type: String, index: true, required: true },
  userEmail: String,
  userName: String,
  toUserId: String,
  subject: { type: String, required: true },
  text: { type: String, required: true },
  reply: String,
  status: { type: String, default: "pending" },
  answeredAt: Date
}, { timestamps: true });

export const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export const Product = mongoose.models.Product || mongoose.model("Product", productSchema);
export const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export const ChatMessage = mongoose.models.ChatMessage || mongoose.model("ChatMessage", chatMessageSchema);
