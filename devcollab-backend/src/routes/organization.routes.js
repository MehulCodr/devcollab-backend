import { Router } from "express";
import {
  addMember,
  createOrganization,
  deleteOrganization,
  getOrganizationById,
  getOrganizationMembers,
  getUserOrganizations,
  removeMember,
  updateMemberRole,
  updateOrganization
} from "../controllers/organization.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireOrgRoles } from "../middlewares/rbac.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post("/", createOrganization);
router.get("/", getUserOrganizations);

router.get(
  "/:organizationId",
  requireOrgRoles("owner", "admin", "member", "viewer"),
  getOrganizationById
);

router.patch(
  "/:organizationId",
  requireOrgRoles("owner", "admin"),
  updateOrganization
);

router.delete(
  "/:organizationId",
  requireOrgRoles("owner"),
  deleteOrganization
);

router.get(
  "/:organizationId/members",
  requireOrgRoles("owner", "admin", "member", "viewer"),
  getOrganizationMembers
);

router.post(
  "/:organizationId/members",
  requireOrgRoles("owner", "admin"),
  addMember
);

router.patch(
  "/:organizationId/members/:membershipId/role",
  requireOrgRoles("owner", "admin"),
  updateMemberRole
);

router.delete(
  "/:organizationId/members/:membershipId",
  requireOrgRoles("owner", "admin"),
  removeMember
);

export default router;