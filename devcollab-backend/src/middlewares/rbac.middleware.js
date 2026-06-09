import { Membership } from "../models/membership.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";

export const requireOrgRoles = (...allowedRoles) => {
  return asyncHandler(async (req, res, next) => {
    const organizationId = req.params.organizationId || req.body.organizationId;

    if (!organizationId) {
      throw new ApiError(400, "Organization id is required");
    }

    validateMongoId(organizationId, "organization id");

    const membership = await Membership.findOne({
      user: req.user._id,
      organization: organizationId,
      status: "active"
    });

    if (!membership) {
      throw new ApiError(403, "You are not a member of this organization");
    }

    if (!allowedRoles.includes(membership.role)) {
      throw new ApiError(403, "You do not have permission to perform this action");
    }

    req.membership = membership;
    next();
  });
};