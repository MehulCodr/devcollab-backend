import { Router } from "express";
import {
  addSubtask,
  assignTask,
  createTask,
  deleteSubtask,
  deleteTask,
  getProjectTasks,
  getTaskActivity,
  getTaskById,
  updateSubtask,
  updateTask,
  updateTaskStatus
} from "../controllers/task.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireProjectAccess } from "../middlewares/project.middleware.js";
import { requireTaskAccess } from "../middlewares/task.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post(
  "/projects/:projectId/tasks",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  createTask
);

router.get(
  "/projects/:projectId/tasks",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getProjectTasks
);

router.get(
  "/tasks/:taskId",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getTaskById
);

router.patch(
  "/tasks/:taskId",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  updateTask
);

router.patch(
  "/tasks/:taskId/status",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  updateTaskStatus
);

router.patch(
  "/tasks/:taskId/assign",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager"]
  }),
  assignTask
);

router.delete(
  "/tasks/:taskId",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager"]
  }),
  deleteTask
);

router.post(
  "/tasks/:taskId/subtasks",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  addSubtask
);

router.patch(
  "/tasks/:taskId/subtasks/:subtaskId",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  updateSubtask
);

router.delete(
  "/tasks/:taskId/subtasks/:subtaskId",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  deleteSubtask
);

router.get(
  "/tasks/:taskId/activity",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getTaskActivity
);

export default router;