import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import organizationRoutes from "./routes/organization.routes.js";
import { notFound } from "./middlewares/notFound.middleware.js";
import projectRoutes from "./routes/project.routes.js";
import taskRoutes from "./routes/task.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import attachmentRoutes from "./routes/attachment.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import githubRoutes from "./routes/github.routes.js";
import githubWebhookRoutes from "./routes/githubWebhook.routes.js";
import aiRoutes from "./routes/ai.routes.js";
import ragRoutes from "./routes/rag.routes.js";
import developerProfileRoutes from "./routes/developerProfile.routes.js";
import matchingRoutes from "./routes/matching.routes.js";
import complexityRoutes from "./routes/complexity.routes.js";
import recommendationRoutes from "./routes/recommendation.routes.js";

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(helmet());
const allowedOrigins = env.corsOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

if (env.nodeEnv === "production") {
  app.set("trust proxy", 1);
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);

app.use(
  "/api/v1/github/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb"
  }),
  githubWebhookRoutes
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
app.use(limiter);

app.use("/api/v1/health", healthRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1", projectRoutes);
app.use("/api/v1", taskRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1", commentRoutes);
app.use("/api/v1", attachmentRoutes);
app.use("/api/v1/organizations", organizationRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/github", githubRoutes);
app.use("/api/v1/rag", ragRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/developer-profile", developerProfileRoutes);
app.use("/api/v1/matching", matchingRoutes);
app.use("/api/v1", complexityRoutes);
app.use("/api/v1/recommendations", recommendationRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
