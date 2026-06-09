import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { TaskActivity } from "../models/taskActivity.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { notifyCommentMentions } from "../services/notification.service.js";
import { validateMongoId } from "../utils/validateMongoId.js";
import { getIO } from "../socket/index.js";

const normalizeMentions = (mentions = []) => {
    if (!Array.isArray(mentions)) {
        throw new ApiError(400, "Mentions must be an array");
    }

    const uniqueMentions = [
        ...new Set(mentions.map((mention) => mention.toString().trim()).filter(Boolean))
    ];

    uniqueMentions.forEach((mention) => validateMongoId(mention, "mentioned user id"));

    return uniqueMentions;
};

const validateMentionedUsers = async ({ mentions, projectId }) => {
    if (mentions.length === 0) {
        return;
    }

    const activeMembers = await ProjectMember.find({
        user: {
            $in: mentions
        },
        project: projectId,
        status: "active"
    }).select("user");

    if (activeMembers.length !== mentions.length) {
        throw new ApiError(400, "All mentioned users must be active project members");
    }
};

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

const populateComment = async (commentId) => {
    return Comment.findById(commentId)
        .populate("author", "name email avatar")
        .populate("mentions", "name email avatar");
};

const canManageComment = (req) => {
    return (
        ["owner", "admin"].includes(req.organizationMembership?.role) ||
        req.projectMembership?.role === "manager"
    );
};

const isCommentAuthor = (req, comment) => {
    return comment.author.toString() === req.user._id.toString();
};

export const createComment = asyncHandler(async (req, res) => {
    const { body, mentions = [] } = req.body;

    if (!body?.trim()) {
        throw new ApiError(400, "Comment body is required");
    }

    const normalizedMentions = normalizeMentions(mentions);

    await validateMentionedUsers({
        mentions: normalizedMentions,
        projectId: req.task.project
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const [comment] = await Comment.create(
            [
                {
                    task: req.task._id,
                    project: req.task.project,
                    organization: req.task.organization,
                    author: req.user._id,
                    body,
                    mentions: normalizedMentions
                }
            ],
            { session }
        );

        await createTaskActivity({
            task: req.task._id,
            project: req.task.project,
            organization: req.task.organization,
            user: req.user._id,
            action: "comment_added",
            metadata: {
                commentId: comment._id,
                mentions: normalizedMentions
            },
            session
        });

        await session.commitTransaction();
        session.endSession();

        if (normalizedMentions.length > 0) {
            await notifyCommentMentions({
                comment,
                actor: req.user._id,
                mentions: normalizedMentions
            });
        }

        const populatedComment = await populateComment(comment._id);

        try {
            getIO().to(`task_${req.task._id}`).emit("comment_added", {
                comment: populatedComment
            });
        } catch (err) {
            // Socket not initialized or error, fail silently
            console.error("Socket emit failed", err);
        }

        return res
            .status(201)
            .json(new ApiResponse(201, { comment: populatedComment }, "Comment added successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

export const getTaskComments = asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const filter = {
        task: req.task._id,
        isDeleted: false
    };

    const [comments, totalComments] = await Promise.all([
        Comment.find(filter)
            .populate("author", "name email avatar")
            .populate("mentions", "name email avatar")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit),
        Comment.countDocuments(filter)
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                comments,
                pagination: {
                    totalComments,
                    currentPage: page,
                    totalPages: Math.ceil(totalComments / limit),
                    limit
                }
            },
            "Comments fetched successfully"
        )
    );
});

export const getCommentById = asyncHandler(async (req, res) => {
    const comment = await populateComment(req.comment._id);

    return res.status(200).json(new ApiResponse(200, { comment }, "Comment fetched successfully"));
});

export const updateComment = asyncHandler(async (req, res) => {
    const { body, mentions } = req.body;

    if (!isCommentAuthor(req, req.comment)) {
        throw new ApiError(403, "You can only edit your own comment");
    }

    const updateData = {};
    let newMentionsForNotification = [];

    if (body !== undefined) {
        if (!body.trim()) {
            throw new ApiError(400, "Comment body cannot be empty");
        }

        updateData.body = body;
    }

    if (mentions !== undefined) {
        const normalizedMentions = normalizeMentions(mentions);

        await validateMentionedUsers({
            mentions: normalizedMentions,
            projectId: req.comment.project
        });

        const oldMentions = req.comment.mentions.map((mention) => mention.toString());

        newMentionsForNotification = normalizedMentions.filter(
            (mention) => !oldMentions.includes(mention)
        );

        updateData.mentions = normalizedMentions;
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }

    updateData.isEdited = true;
    updateData.editedAt = new Date();

    const comment = await Comment.findByIdAndUpdate(
        req.comment._id,
        {
            $set: updateData
        },
        {
            new: true,
            runValidators: true
        }
    );

    await createTaskActivity({
        task: comment.task,
        project: comment.project,
        organization: comment.organization,
        user: req.user._id,
        action: "comment_updated",
        metadata: {
            commentId: comment._id
        }
    });

    if (newMentionsForNotification.length > 0) {
        await notifyCommentMentions({
            comment,
            actor: req.user._id,
            mentions: newMentionsForNotification
        });
    }

    const populatedComment = await populateComment(comment._id);

    try {
        getIO().to(`task_${comment.task}`).emit("comment_updated", {
            comment: populatedComment
        });
    } catch (err) {
        console.error("Socket emit failed", err);
    }

    return res
        .status(200)
        .json(new ApiResponse(200, { comment: populatedComment }, "Comment updated successfully"));
});

export const deleteComment = asyncHandler(async (req, res) => {
    if (!isCommentAuthor(req, req.comment) && !canManageComment(req)) {
        throw new ApiError(403, "You do not have permission to delete this comment");
    }

    const comment = await Comment.findByIdAndUpdate(
        req.comment._id,
        {
            $set: {
                isDeleted: true,
                deletedAt: new Date()
            }
        },
        {
            new: true
        }
    );

    await createTaskActivity({
        task: comment.task,
        project: comment.project,
        organization: comment.organization,
        user: req.user._id,
        action: "comment_deleted",
        metadata: {
            commentId: comment._id
        }
    });

    try {
        getIO().to(`task_${comment.task}`).emit("comment_deleted", {
            commentId: comment._id
        });
    } catch (err) {
        console.error("Socket emit failed", err);
    }

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"));
});