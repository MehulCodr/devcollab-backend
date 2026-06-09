import { Router } from "express";
import {
  addProjectMember,
  createProject,
  deleteProject,
  getOrganizationProjects,
  getProjectById,
  getProjectMembers,
  removeProjectMember,
  updateProject,
  updateProjectMemberRole
} from "../controllers/project.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { requireOrgRoles } from "../middlewares/rbac.middleware.js";
import { requireProjectAccess } from "../middlewares/project.middleware.js";

const router = Router();

router.use(verifyJWT);

router.post(
  "/organizations/:organizationId/projects",
  requireOrgRoles("owner", "admin"),
  createProject
);

router.get(
  "/organizations/:organizationId/projects",
  requireOrgRoles("owner", "admin", "member", "viewer"),
  getOrganizationProjects
);

router.get(
  "/projects/:projectId",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getProjectById
);

router.patch(
  "/projects/:projectId",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager"]
  }),
  updateProject
);

router.delete(
  "/projects/:projectId",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: []
  }),
  deleteProject
);

router.get(
  "/projects/:projectId/members",
  requireProjectAccess({
    orgRoles: ["owner", "admin", "member", "viewer"],
    projectRoles: ["manager", "developer", "viewer"]
  }),
  getProjectMembers
);

router.post(
  "/projects/:projectId/members",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager"]
  }),
  addProjectMember
);

router.patch(
  "/projects/:projectId/members/:projectMemberId/role",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager"]
  }),
  updateProjectMemberRole
);

router.delete(
  "/projects/:projectId/members/:projectMemberId",
  requireProjectAccess({
    orgRoles: ["owner", "admin"],
    projectRoles: ["manager"]
  }),
  removeProjectMember
);

export default router;