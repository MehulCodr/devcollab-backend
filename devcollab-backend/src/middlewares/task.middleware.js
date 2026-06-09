import { Membership } from "../models/membership.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";

export const requireTaskAccess = ({ orgRoles = [], projectRoles = [] }) => {
  return asyncHandler(async (req, res, next) => {
    const { taskId } = req.params;

    validateMongoId(taskId, "task id");

    const task = await Task.findById(taskId);

    if (!task) {
      throw new ApiError(404, "Task not found");
    }

    const organizationMembership = await Membership.findOne({
      user: req.user._id,
      organization: task.organization,
      status: "active"
    });

    if (!organizationMembership) {
      throw new ApiError(403, "You are not a member of this organization");
    }

    if (orgRoles.includes(organizationMembership.role)) {
      req.task = task;
      req.organizationMembership = organizationMembership;
      return next();
    }

    const projectMembership = await ProjectMember.findOne({
      user: req.user._id,
      project: task.project,
      status: "active"
    });

    if (!projectMembership) {
      throw new ApiError(403, "You are not a member of this project");
    }

    if (!projectRoles.includes(projectMembership.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    req.task = task;
    req.organizationMembership = organizationMembership;
    req.projectMembership = projectMembership;

    next();
  });
};