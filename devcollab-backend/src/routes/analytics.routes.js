import { Router } from "express";
import {
  getOrganizationAnalytics,
  getProjectAnalytics
} from "../controllers/analytics.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireProjectAccess } from "../middlewares/project.middleware.js";
import { requireOrgRoles } from "../middlewares/rbac.middleware.js";

const router = Router();

router.use(verifyJWT);

router.get(
  "/projects/:projectId",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getProjectAnalytics
);

router.get(
  "/organizations/:organizationId",
  requireOrgRoles("owner", "admin", "member", "viewer"),
  getOrganizationAnalytics
);

export default router;