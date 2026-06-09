import { Router } from "express";
import {
  predictTaskComplexity,
  refreshTaskComplexity,
  recordActualComplexity,
  getComplexityHistory
} from "../controllers/complexity.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireTaskAccess } from "../middlewares/task.middleware.js";

const router = Router();

router.use(verifyJWT);

/**
 * GET /api/v1/tasks/:taskId/complexity
 * Returns the latest prediction (cached ≤1h) or computes a fresh one.
 * Add ?refresh=true to force recompute.
 */
router.get(
  "/tasks/:taskId/complexity",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  predictTaskComplexity
);

/**
 * POST /api/v1/tasks/:taskId/complexity/refresh
 * Force-recomputes and stores a new prediction.
 */
router.post(
  "/tasks/:taskId/complexity/refresh",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member"],
    projectRoles: ["manager", "developer"]
  }),
  refreshTaskComplexity
);

/**
 * PATCH /api/v1/tasks/:taskId/complexity/actual
 * Records actual outcome after task completion (training data hook).
 * Body: { actualComplexity, actualHours?, actualNotes?, predictionId? }
 */
router.patch(
  "/tasks/:taskId/complexity/actual",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  recordActualComplexity
);

/**
 * GET /api/v1/tasks/:taskId/complexity/history
 * Returns all historical predictions for a task (audit trail + accuracy summary).
 */
router.get(
  "/tasks/:taskId/complexity/history",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getComplexityHistory
);

export default router;
