import mongoose from "mongoose";
import { Organization } from "../models/organization.model.js";
import { Membership } from "../models/membership.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { validateMongoId } from "../utils/validateMongoId.js";

const allowedRoles = ["admin", "member", "viewer"];

const generateUniqueSlug = async (name) => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (await Organization.exists({ slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

export const createOrganization = asyncHandler(async (req, res) => {
  const { name, description = "", logo = "" } = req.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Organization name is required");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const slug = await generateUniqueSlug(name);

    const [organization] = await Organization.create(
      [
        {
          name,
          slug,
          description,
          logo,
          owner: req.user._id
        }
      ],
      { session }
    );

    await Membership.create(
      [
        {
          user: req.user._id,
          organization: organization._id,
          role: "owner",
          status: "active"
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res
      .status(201)
      .json(new ApiResponse(201, { organization }, "Organization created successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const getUserOrganizations = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({
    user: req.user._id,
    status: "active"
  })
    .populate("organization")
    .sort({ createdAt: -1 });

  const organizations = memberships.map((membership) => ({
    membershipId: membership._id,
    role: membership.role,
    organization: membership.organization
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, { organizations }, "Organizations fetched successfully"));
});

export const getOrganizationById = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  validateMongoId(organizationId, "organization id");

  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { organization }, "Organization fetched successfully"));
});

export const updateOrganization = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const { name, description, logo } = req.body;

  validateMongoId(organizationId, "organization id");

  const updateData = {};

  if (name !== undefined) {
    if (!name.trim()) {
      throw new ApiError(400, "Organization name cannot be empty");
    }

    updateData.name = name;
  }

  if (description !== undefined) {
    updateData.description = description;
  }

  if (logo !== undefined) {
    updateData.logo = logo;
  }

  const organization = await Organization.findByIdAndUpdate(
    organizationId,
    {
      $set: updateData
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { organization }, "Organization updated successfully"));
});

export const deleteOrganization = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  validateMongoId(organizationId, "organization id");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const organization = await Organization.findById(organizationId).session(session);

    if (!organization) {
      throw new ApiError(404, "Organization not found");
    }

    await Membership.deleteMany({ organization: organizationId }).session(session);
    await Organization.findByIdAndDelete(organizationId).session(session);

    await session.commitTransaction();
    session.endSession();

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Organization deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const getOrganizationMembers = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  validateMongoId(organizationId, "organization id");

  const members = await Membership.find({
    organization: organizationId,
    status: "active"
  })
    .populate("user", "name email avatar")
    .sort({ createdAt: 1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { members }, "Members fetched successfully"));
});

export const addMember = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const { email, role = "member" } = req.body;

  validateMongoId(organizationId, "organization id");

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  if (req.membership.role !== "owner" && role === "admin") {
    throw new ApiError(403, "Only owner can add an admin");
  }

  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User not found. Register this user first");
  }

  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, "You are already a member of this organization");
  }

  const existingMembership = await Membership.findOne({
    user: user._id,
    organization: organizationId
  });

  if (existingMembership?.status === "active") {
    throw new ApiError(409, "User is already an active member");
  }

  let membership;

  if (existingMembership) {
    existingMembership.role = role;
    existingMembership.status = "active";
    existingMembership.joinedAt = new Date();
    membership = await existingMembership.save();
  } else {
    membership = await Membership.create({
      user: user._id,
      organization: organizationId,
      role,
      status: "active"
    });
  }

  const populatedMembership = await Membership.findById(membership._id).populate(
    "user",
    "name email avatar"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, { member: populatedMembership }, "Member added successfully"));
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const { organizationId, membershipId } = req.params;
  const { role } = req.body;

  validateMongoId(organizationId, "organization id");
  validateMongoId(membershipId, "membership id");

  if (!allowedRoles.includes(role)) {
    throw new ApiError(400, "Invalid role");
  }

  const targetMembership = await Membership.findOne({
    _id: membershipId,
    organization: organizationId,
    status: "active"
  });

  if (!targetMembership) {
    throw new ApiError(404, "Member not found");
  }

  if (targetMembership.role === "owner") {
    throw new ApiError(403, "Owner role cannot be changed");
  }

  if (req.membership.role !== "owner" && (targetMembership.role === "admin" || role === "admin")) {
    throw new ApiError(403, "Only owner can manage admin roles");
  }

  targetMembership.role = role;
  await targetMembership.save();

  const updatedMember = await Membership.findById(targetMembership._id).populate(
    "user",
    "name email avatar"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, { member: updatedMember }, "Member role updated successfully"));
});

export const removeMember = asyncHandler(async (req, res) => {
  const { organizationId, membershipId } = req.params;

  validateMongoId(organizationId, "organization id");
  validateMongoId(membershipId, "membership id");

  const targetMembership = await Membership.findOne({
    _id: membershipId,
    organization: organizationId,
    status: "active"
  });

  if (!targetMembership) {
    throw new ApiError(404, "Member not found");
  }

  if (targetMembership.role === "owner") {
    throw new ApiError(403, "Owner cannot be removed");
  }

  if (req.membership.role !== "owner" && targetMembership.role === "admin") {
    throw new ApiError(403, "Only owner can remove an admin");
  }

  targetMembership.status = "removed";
  await targetMembership.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Member removed successfully"));
});