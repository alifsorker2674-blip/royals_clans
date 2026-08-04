import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(env.mongoUri);
    console.log("MongoDB connected");
  } catch (error) {
    console.error("MongoDB connection failed:", (error as Error).message);
    console.error("The API will keep running, but any DB-backed route will fail until this is fixed.");
  }
}
