import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io;

export const initSocket = (server) => {
  const allowedOrigins = env.corsOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    try {
      // Token can come from auth object or cookies
      // We'll rely on the auth object sent by the client
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decodedToken = jwt.verify(token, env.jwtAccessSecret);
      socket.user = decodedToken;
      next();
    } catch (error) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    // Join a personal room for direct notifications
    socket.join(socket.user._id);

    socket.on("join_task", ({ taskId }) => {
      if (!taskId) return;
      socket.join(`task_${taskId}`);

      // Broadcast to room that user joined (for active viewers list)
      socket.to(`task_${taskId}`).emit("user_joined_task", {
        userId: socket.user._id,
        taskId
      });
    });

    socket.on("leave_task", ({ taskId }) => {
      if (!taskId) return;
      socket.leave(`task_${taskId}`);

      socket.to(`task_${taskId}`).emit("user_left_task", {
        userId: socket.user._id,
        taskId
      });
    });

    socket.on("disconnect", () => {
      // User automatically leaves all rooms upon disconnect
      // But we can't easily emit "left" for all tasks without iterating through rooms
      // In a real prod environment, we'd use presence tracking.
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};
