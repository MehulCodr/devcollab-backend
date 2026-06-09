import mongoose from "mongoose";
import { TaskAttachment } from "../models/taskAttachment.model.js";
import { TaskActivity } from "../models/taskActivity.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";
import {
  deleteFromCloudinary,
  uploadBufferToCloudinary
} from "../services/cloudinary.service.js";

const createTaskActivity = async ({ task, project, organization, user, action, metadata = {}, session }) => {
  const payload = [
    {
      task,
      project,
      organization,
      user,
      action,
      metadata
    }
  ];

  if (session) {
    await TaskActivity.create(payload, { session });
    return;
  }

  await TaskActivity.create(payload);
};

const getResourceType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) {
    return "image";
  }

  if (mimeType.startsWith("video/")) {
    return "video";
  }

  return "raw";
};

const canManageAttachment = (req, attachment) => {
  const isOrgAdmin = ["owner", "admin"].includes(req.organizationMembership?.role);
  const isProjectManager = req.projectMembership?.role === "manager";
  const isUploader = attachment.uploadedBy.toString() === req.user._id.toString();

  return isOrgAdmin || isProjectManager || isUploader;
};

export const uploadAttachment = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, "File is required");
  }

  const resourceType = getResourceType(req.file.mimetype);

  const uploadedFile = await uploadBufferToCloudinary({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    folder: `devcollab/tasks/${req.task._id}`
  });

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [attachment] = await TaskAttachment.create(
      [
        {
          task: req.task._id,
          project: req.task.project,
          organization: req.task.organization,
          uploadedBy: req.user._id,
          originalName: req.file.originalname,
          storedName: uploadedFile.original_filename || req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          path: "",
          url: uploadedFile.secure_url,
          provider: "cloudinary",
          publicId: uploadedFile.public_id,
          resourceType
        }
      ],
      { session }
    );

    await createTaskActivity({
      task: req.task._id,
      project: req.task.project,
      organization: req.task.organization,
      user: req.user._id,
      action: "attachment_uploaded",
      metadata: {
        attachmentId: attachment._id,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        size: attachment.size,
        provider: "cloudinary"
      },
      session
    });

    await session.commitTransaction();
    session.endSession();

    const populatedAttachment = await TaskAttachment.findById(attachment._id).populate(
      "uploadedBy",
      "name email avatar"
    );

    return res
      .status(201)
      .json(new ApiResponse(201, { attachment: populatedAttachment }, "Attachment uploaded successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    await deleteFromCloudinary({
      publicId: uploadedFile.public_id,
      resourceType
    }).catch(() => null);

    throw error;
  }
});

export const getTaskAttachments = asyncHandler(async (req, res) => {
  const attachments = await TaskAttachment.find({
    task: req.task._id,
    isDeleted: false
  })
    .populate("uploadedBy", "name email avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { attachments }, "Attachments fetched successfully"));
});

export const deleteAttachment = asyncHandler(async (req, res) => {
  const { attachmentId } = req.params;

  validateMongoId(attachmentId, "attachment id");

  const attachment = await TaskAttachment.findOne({
    _id: attachmentId,
    task: req.task._id,
    isDeleted: false
  });

  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  if (!canManageAttachment(req, attachment)) {
    throw new ApiError(403, "You do not have permission to delete this attachment");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    attachment.isDeleted = true;
    attachment.deletedAt = new Date();

    await attachment.save({ session });

    await createTaskActivity({
      task: req.task._id,
      project: req.task.project,
      organization: req.task.organization,
      user: req.user._id,
      action: "attachment_deleted",
      metadata: {
        attachmentId: attachment._id,
        originalName: attachment.originalName,
        provider: attachment.provider
      },
      session
    });

    await session.commitTransaction();
    session.endSession();

    if (attachment.provider === "cloudinary") {
      await deleteFromCloudinary({
        publicId: attachment.publicId,
        resourceType: attachment.resourceType
      }).catch(() => null);
    }

    return res.status(200).json(new ApiResponse(200, {}, "Attachment deleted successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});