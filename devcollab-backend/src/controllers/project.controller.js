import mongoose from "mongoose";
import { Organization } from "../models/organization.model.js";
import { Membership } from "../models/membership.model.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { slugify } from "../utils/slugify.js";
import { validateMongoId } from "../utils/validateMongoId.js";

const allowedProjectRoles = ["manager", "developer", "viewer"];

const generateUniqueProjectSlug = async (name, organizationId) => {
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let counter = 1;

  while (await Project.exists({ organization: organizationId, slug })) {
    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }

  return slug;
};

export const createProject = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;
  const { name, description = "", status = "active", startDate, dueDate } = req.body;

  validateMongoId(organizationId, "organization id");

  if (!name?.trim()) {
    throw new ApiError(400, "Project name is required");
  }

  if (!["active", "completed", "archived"].includes(status)) {
    throw new ApiError(400, "Invalid project status");
  }

  const organization = await Organization.findById(organizationId);

  if (!organization) {
    throw new ApiError(404, "Organization not found");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const slug = await generateUniqueProjectSlug(name, organizationId);

    const [project] = await Project.create(
      [
        {
          name,
          slug,
          description,
          organization: organizationId,
          createdBy: req.user._id,
          status,
          startDate,
          dueDate
        }
      ],
      { session }
    );

    await ProjectMember.create(
      [
        {
          user: req.user._id,
          project: project._id,
          organization: organizationId,
          role: "manager",
          status: "active"
        }
      ],
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.status(201).json(new ApiResponse(201, { project }, "Project created successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const getOrganizationProjects = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  validateMongoId(organizationId, "organization id");

  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
  const skip = (page - 1) * limit;
  const search = req.query.search?.trim() || "";
  const status = req.query.status?.trim();
  const sortBy = req.query.sortBy || "createdAt";
  const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

  const filter = {
    organization: organizationId
  };

  if (status) {
    if (!["active", "completed", "archived"].includes(status)) {
      throw new ApiError(400, "Invalid project status");
    }

    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } }
    ];
  }

  const [projects, totalProjects] = await Promise.all([
    Project.find(filter)
      .populate("createdBy", "name email avatar")
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    Project.countDocuments(filter)
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        projects,
        pagination: {
          totalProjects,
          currentPage: page,
          totalPages: Math.ceil(totalProjects / limit),
          limit
        }
      },
      "Projects fetched successfully"
    )
  );
});

export const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.project._id)
    .populate("createdBy", "name email avatar")
    .populate("organization", "name slug logo");

  return res.status(200).json(new ApiResponse(200, { project }, "Project fetched successfully"));
});

export const updateProject = asyncHandler(async (req, res) => {
  const { name, description, status, startDate, dueDate } = req.body;

  const updateData = {};

  if (name !== undefined) {
    if (!name.trim()) {
      throw new ApiError(400, "Project name cannot be empty");
    }

    updateData.name = name;
  }

  if (description !== undefined) {
    updateData.description = description;
  }

  if (status !== undefined) {
    if (!["active", "completed", "archived"].includes(status)) {
      throw new ApiError(400, "Invalid project status");
    }

    updateData.status = status;
  }

  if (startDate !== undefined) {
    updateData.startDate = startDate;
  }

  if (dueDate !== undefined) {
    updateData.dueDate = dueDate;
  }

  const project = await Project.findByIdAndUpdate(
    req.project._id,
    {
      $set: updateData
    },
    {
      new: true,
      runValidators: true
    }
  );

  return res.status(200).json(new ApiResponse(200, { project }, "Project updated successfully"));
});

export const deleteProject = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await ProjectMember.deleteMany({ project: req.project._id }).session(session);
    await Project.findByIdAndDelete(req.project._id).session(session);

    await session.commitTransaction();
    session.endSession();

    return res.status(200).json(new ApiResponse(200, {}, "Project deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const getProjectMembers = asyncHandler(async (req, res) => {
  const members = await ProjectMember.find({
    project: req.project._id,
    status: "active"
  })
    .populate("user", "name email avatar")
    .sort({ createdAt: 1 });

  return res.status(200).json(new ApiResponse(200, { members }, "Project members fetched successfully"));
});

export const addProjectMember = asyncHandler(async (req, res) => {
  const { email, role = "developer" } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  if (!allowedProjectRoles.includes(role)) {
    throw new ApiError(400, "Invalid project role");
  }

  const user = await User.findOne({ email: email.toLowerCase() });

  if (!user) {
    throw new ApiError(404, "User not found. Register this user first");
  }

  const organizationMembership = await Membership.findOne({
    user: user._id,
    organization: req.project.organization,
    status: "active"
  });

  if (!organizationMembership) {
    throw new ApiError(400, "User must be an organization member before joining a project");
  }

  const existingProjectMember = await ProjectMember.findOne({
    user: user._id,
    project: req.project._id
  });

  if (existingProjectMember?.status === "active") {
    throw new ApiError(409, "User is already an active project member");
  }

  let projectMember;

  if (existingProjectMember) {
    existingProjectMember.role = role;
    existingProjectMember.status = "active";
    existingProjectMember.joinedAt = new Date();
    projectMember = await existingProjectMember.save();
  } else {
    projectMember = await ProjectMember.create({
      user: user._id,
      project: req.project._id,
      organization: req.project.organization,
      role,
      status: "active"
    });
  }

  const populatedMember = await ProjectMember.findById(projectMember._id).populate(
    "user",
    "name email avatar"
  );

  return res.status(201).json(new ApiResponse(201, { member: populatedMember }, "Project member added successfully"));
});

export const updateProjectMemberRole = asyncHandler(async (req, res) => {
  const { projectMemberId } = req.params;
  const { role } = req.body;

  validateMongoId(projectMemberId, "project member id");

  if (!allowedProjectRoles.includes(role)) {
    throw new ApiError(400, "Invalid project role");
  }

  const targetProjectMember = await ProjectMember.findOne({
    _id: projectMemberId,
    project: req.project._id,
    status: "active"
  });

  if (!targetProjectMember) {
    throw new ApiError(404, "Project member not found");
  }

  if (targetProjectMember.role === "manager" && role !== "manager") {
    const managerCount = await ProjectMember.countDocuments({
      project: req.project._id,
      role: "manager",
      status: "active"
    });

    if (managerCount <= 1) {
      throw new ApiError(400, "Project must have at least one manager");
    }
  }

  targetProjectMember.role = role;
  await targetProjectMember.save();

  const updatedMember = await ProjectMember.findById(targetProjectMember._id).populate(
    "user",
    "name email avatar"
  );

  return res.status(200).json(new ApiResponse(200, { member: updatedMember }, "Project member role updated successfully"));
});

export const removeProjectMember = asyncHandler(async (req, res) => {
  const { projectMemberId } = req.params;

  validateMongoId(projectMemberId, "project member id");

  const targetProjectMember = await ProjectMember.findOne({
    _id: projectMemberId,
    project: req.project._id,
    status: "active"
  });

  if (!targetProjectMember) {
    throw new ApiError(404, "Project member not found");
  }

  if (targetProjectMember.role === "manager") {
    const managerCount = await ProjectMember.countDocuments({
      project: req.project._id,
      role: "manager",
      status: "active"
    });

    if (managerCount <= 1) {
      throw new ApiError(400, "Project must have at least one manager");
    }
  }

  targetProjectMember.status = "removed";
  await targetProjectMember.save();

  return res.status(200).json(new ApiResponse(200, {}, "Project member removed successfully"));
});