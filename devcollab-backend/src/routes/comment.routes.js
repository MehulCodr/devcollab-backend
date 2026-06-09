import { Router } from "express";
import {
  createComment,
  deleteComment,
  getCommentById,
  getTaskComments,
  updateComment
} from "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireCommentAccess } from "../middlewares/comment.middleware.js";
import { requireTaskAccess } from "../middlewares/task.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post(
  "/tasks/:taskId/comments",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  createComment
);

router.get(
  "/tasks/:taskId/comments",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getTaskComments
);

router.get("/comments/:commentId", requireCommentAccess, getCommentById);

router.patch("/comments/:commentId", requireCommentAccess, updateComment);

router.delete("/comments/:commentId", requireCommentAccess, deleteComment);

export default router;