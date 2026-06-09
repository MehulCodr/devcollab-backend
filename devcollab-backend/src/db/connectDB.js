import mongoose from "mongoose";
import { env } from "../config/env.js";

export const connectDB = async () => {
  try {
    const options = {
      serverSelectionTimeoutMS: 5000,
      family: 4
    };

    const connection = await mongoose.connect(env.mongoUri, options);

    console.log(`MongoDB connected: ${connection.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};