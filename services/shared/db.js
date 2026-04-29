import mongoose from "mongoose";

export const connectMongo = async () => {
  const mongoUrl = process.env.MONGO_URL;
  if (!mongoUrl) {
    throw new Error("MONGO_URL is not set");
  }

  await mongoose.connect(mongoUrl);
};

export const mongoHealth = () => (
  mongoose.connection.readyState === 1 ? "connected" : "disconnected"
);
