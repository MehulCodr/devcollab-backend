import { Router } from "express";
import {
  createTasksFromSuggestions,
  generateTaskSuggestions
} from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireProjectAccess } from "../middlewares/project.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post(
  "/projects/:projectId/task-suggestions",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  generateTaskSuggestions
);

router.post(
  "/projects/:projectId/create-tasks",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  createTasksFromSuggestions
);

export default router;