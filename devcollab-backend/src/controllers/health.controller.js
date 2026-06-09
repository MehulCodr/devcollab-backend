import mongoose from "mongoose";
import { ApiResponse } from "../utils/ApiResponse.js";

export const healthCheck = async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status: "ok",
        uptime: process.uptime(),
        database: dbStatus,
        timestamp: new Date().toISOString()
      },
      "Server is running"
    )
  );
};