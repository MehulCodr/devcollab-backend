import { Router } from "express";
import {
  deleteAttachment,
  getTaskAttachments,
  uploadAttachment
} from "../controllers/attachment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireTaskAccess } from "../middlewares/task.middleware.js";
import { uploadTaskAttachment } from "../middlewares/upload.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post(
  "/tasks/:taskId/attachments",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  uploadTaskAttachment.single("file"),
  uploadAttachment
);

router.get(
  "/tasks/:taskId/attachments",
  requireTaskAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getTaskAttachments
);

router.delete(
  "/tasks/:taskId/attachments/:attachmentId",
  requireTaskAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  deleteAttachment
);

export default router;