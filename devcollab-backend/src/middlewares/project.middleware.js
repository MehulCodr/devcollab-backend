import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Membership } from "../models/membership.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";

export const requireProjectAccess = ({ orgRoles = [], projectRoles = [] }) => {
  return asyncHandler(async (req, res, next) => {
    const { projectId } = req.params;

    validateMongoId(projectId, "project id");

    const project = await Project.findById(projectId);

    if (!project) {
      throw new ApiError(404, "Project not found");
    }

    const organizationMembership = await Membership.findOne({
      user: req.user._id,
      organization: project.organization,
      status: "active"
    });

    if (!organizationMembership) {
      throw new ApiError(403, "You are not a member of this organization");
    }

    if (orgRoles.includes(organizationMembership.role)) {
      req.project = project;
      req.organizationMembership = organizationMembership;
      return next();
    }

    const projectMembership = await ProjectMember.findOne({
      user: req.user._id,
      project: project._id,
      status: "active"
    });

    if (!projectMembership) {
      throw new ApiError(403, "You are not a member of this project");
    }

    if (!projectRoles.includes(projectMembership.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    req.project = project;
    req.organizationMembership = organizationMembership;
    req.projectMembership = projectMembership;

    next();
  });
};