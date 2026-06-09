import { Router } from "express";
import {
  askProjectKnowledge,
  getProjectRiskAnalysis,
  syncProjectKnowledge
} from "../controllers/rag.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireProjectAccess } from "../middlewares/project.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post(
  "/projects/:projectId/sync",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager", "developer"]
  }),
  syncProjectKnowledge
);

router.post(
  "/projects/:projectId/ask",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  askProjectKnowledge
);

router.get(
  "/projects/:projectId/risk-analysis",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getProjectRiskAnalysis
);

export default router;