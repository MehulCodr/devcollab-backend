import { Router } from "express";
import { getProjectDeveloperMatches } from "../controllers/matching.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireProjectAccess } from "../middlewares/project.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get(
  "/projects/:projectId/developers",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getProjectDeveloperMatches
);

export default router;
