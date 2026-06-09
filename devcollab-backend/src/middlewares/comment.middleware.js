import { Comment } from "../models/comment.model.js";
import { Membership } from "../models/membership.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";

export const requireCommentAccess = asyncHandler(async (req, res, next) => {
  const { commentId } = req.params;

  validateMongoId(commentId, "comment id");

  const comment = await Comment.findById(commentId);

  if (!comment || comment.isDeleted) {
    throw new ApiError(404, "Comment not found");
  }

  const organizationMembership = await Membership.findOne({
    user: req.user._id,
    organization: comment.organization,
    status: "active"
  });

  if (!organizationMembership) {
    throw new ApiError(403, "You are not a member of this organization");
  }

  const projectMembership = await ProjectMember.findOne({
    user: req.user._id,
    project: comment.project,
    status: "active"
  });

  req.comment = comment;
  req.organizationMembership = organizationMembership;
  req.projectMembership = projectMembership;

  next();
});