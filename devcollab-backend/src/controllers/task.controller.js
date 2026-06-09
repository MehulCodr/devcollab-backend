import mongoose from "mongoose";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";
import { TaskActivity } from "../models/taskActivity.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";
import {
    notifyTaskAssigned,
    notifyTaskStatusChanged
} from "../services/notification.service.js";
import { getIO } from "../socket/index.js";
const allowedStatuses = ["backlog", "todo", "in-progress", "review", "completed"];
const allowedPriorities = ["low", "medium", "high", "urgent"];

const normalizeLabels = (labels = []) => {
    if (!Array.isArray(labels)) {
        throw new ApiError(400, "Labels must be an array");
    }

    return [...new Set(labels.map((label) => label.toString().trim().toLowerCase()).filter(Boolean))];
};

const normalizeSubtasks = (subtasks = []) => {
    if (!Array.isArray(subtasks)) {
        throw new ApiError(400, "Subtasks must be an array");
    }

    return subtasks.map((subtask) => {
        if (typeof subtask === "string") {
            return {
                title: subtask,
                isCompleted: false
            };
        }

        return {
            title: subtask.title,
            isCompleted: Boolean(subtask.isCompleted)
        };
    });
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

const ensureAssigneeIsProjectMember = async ({ assignedTo, projectId }) => {
    if (!assignedTo) {
        return;
    }

    validateMongoId(assignedTo, "assigned user id");

    const projectMember = await ProjectMember.findOne({
        user: assignedTo,
        project: projectId,
        status: "active"
    });

    if (!projectMember) {
        throw new ApiError(400, "Assigned user must be an active project member");
    }
};

const canManageAnyTask = (req) => {
    return ["owner", "admin"].includes(req.organizationMembership?.role) || req.projectMembership?.role === "manager";
};

const canWorkOnTask = (req, task) => {
    const userId = req.user._id.toString();
    const assignedTo = task.assignedTo?.toString();
    const createdBy = task.createdBy?.toString();

    return canManageAnyTask(req) || assignedTo === userId || createdBy === userId;
};

const populateTask = async (taskId) => {
    return Task.findById(taskId)
        .populate("createdBy", "name email avatar")
        .populate("assignedTo", "name email avatar")
        .populate("project", "name slug")
        .populate("organization", "name slug");
};

export const createTask = asyncHandler(async (req, res) => {
    const { projectId } = req.params;
    const {
        title,
        description = "",
        assignedTo = null,
        status = "todo",
        priority = "medium",
        dueDate = null,
        labels = [],
        subtasks = []
    } = req.body;

    validateMongoId(projectId, "project id");

    if (!title?.trim()) {
        throw new ApiError(400, "Task title is required");
    }

    if (!allowedStatuses.includes(status)) {
        throw new ApiError(400, "Invalid task status");
    }

    if (!allowedPriorities.includes(priority)) {
        throw new ApiError(400, "Invalid task priority");
    }

    await ensureAssigneeIsProjectMember({
        assignedTo,
        projectId
    });

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const [task] = await Task.create(
            [
                {
                    title,
                    description,
                    project: req.project._id,
                    organization: req.project.organization,
                    createdBy: req.user._id,
                    assignedTo,
                    status,
                    priority,
                    dueDate,
                    labels: normalizeLabels(labels),
                    subtasks: normalizeSubtasks(subtasks)
                }
            ],
            { session }
        );

        await createTaskActivity({
            task: task._id,
            project: task.project,
            organization: task.organization,
            user: req.user._id,
            action: "task_created",
            metadata: {
                title: task.title
            },
            session
        });

        if (assignedTo) {
            await createTaskActivity({
                task: task._id,
                project: task.project,
                organization: task.organization,
                user: req.user._id,
                action: "task_assigned",
                metadata: {
                    assignedTo
                },
                session
            });
        }

        await session.commitTransaction();
        session.endSession();

        const populatedTask = await populateTask(task._id);

        if (assignedTo) {
            await notifyTaskAssigned({
                task,
                actor: req.user._id,
                assignedTo
            });
        }

        return res.status(201).json(new ApiResponse(201, { task: populatedTask }, "Task created successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

export const getProjectTasks = asyncHandler(async (req, res) => {
    const { projectId } = req.params;

    validateMongoId(projectId, "project id");

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim() || "";
    const status = req.query.status?.trim();
    const priority = req.query.priority?.trim();
    const assignedTo = req.query.assignedTo?.trim();
    const label = req.query.label?.trim()?.toLowerCase();
    const dueBefore = req.query.dueBefore;
    const dueAfter = req.query.dueAfter;
    const sortBy = req.query.sortBy || "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const filter = {
        project: projectId
    };

    if (status) {
        if (!allowedStatuses.includes(status)) {
            throw new ApiError(400, "Invalid task status");
        }

        filter.status = status;
    }

    if (priority) {
        if (!allowedPriorities.includes(priority)) {
            throw new ApiError(400, "Invalid task priority");
        }

        filter.priority = priority;
    }

    if (assignedTo) {
        validateMongoId(assignedTo, "assigned user id");
        filter.assignedTo = assignedTo;
    }

    if (label) {
        filter.labels = label;
    }

    if (dueBefore || dueAfter) {
        filter.dueDate = {};

        if (dueBefore) {
            filter.dueDate.$lte = new Date(dueBefore);
        }

        if (dueAfter) {
            filter.dueDate.$gte = new Date(dueAfter);
        }
    }

    if (search) {
        filter.$or = [
            {
                title: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                description: {
                    $regex: search,
                    $options: "i"
                }
            }
        ];
    }

    const [tasks, totalTasks] = await Promise.all([
        Task.find(filter)
            .populate("createdBy", "name email avatar")
            .populate("assignedTo", "name email avatar")
            .sort({ [sortBy]: sortOrder })
            .skip(skip)
            .limit(limit),
        Task.countDocuments(filter)
    ]);

    return res.status(200).json(
        new ApiResponse(
            200,
            {
                tasks,
                pagination: {
                    totalTasks,
                    currentPage: page,
                    totalPages: Math.ceil(totalTasks / limit),
                    limit
                }
            },
            "Tasks fetched successfully"
        )
    );
});

export const getTaskById = asyncHandler(async (req, res) => {
    const task = await populateTask(req.task._id);

    return res.status(200).json(new ApiResponse(200, { task }, "Task fetched successfully"));
});

export const updateTask = asyncHandler(async (req, res) => {
    if (!canWorkOnTask(req, req.task)) {
        throw new ApiError(403, "You can only update tasks you manage, created, or are assigned to");
    }

    const { title, description, status, priority, dueDate, labels, assignedTo } = req.body;

    const updateData = {};
    const activities = [];

    if (title !== undefined) {
        if (!title.trim()) {
            throw new ApiError(400, "Task title cannot be empty");
        }

        updateData.title = title;
    }

    if (description !== undefined) {
        updateData.description = description;
    }

    if (status !== undefined) {
        if (!allowedStatuses.includes(status)) {
            throw new ApiError(400, "Invalid task status");
        }

        if (status !== req.task.status) {
            activities.push({
                action: "status_changed",
                metadata: {
                    from: req.task.status,
                    to: status
                }
            });
        }

        updateData.status = status;
    }

    if (priority !== undefined) {
        if (!allowedPriorities.includes(priority)) {
            throw new ApiError(400, "Invalid task priority");
        }

        if (priority !== req.task.priority) {
            activities.push({
                action: "priority_changed",
                metadata: {
                    from: req.task.priority,
                    to: priority
                }
            });
        }

        updateData.priority = priority;
    }

    if (dueDate !== undefined) {
        updateData.dueDate = dueDate;

        activities.push({
            action: "due_date_updated",
            metadata: {
                from: req.task.dueDate,
                to: dueDate
            }
        });
    }

    if (labels !== undefined) {
        updateData.labels = normalizeLabels(labels);

        activities.push({
            action: "labels_updated",
            metadata: {
                labels: updateData.labels
            }
        });
    }

    if (assignedTo !== undefined) {
        if (!canManageAnyTask(req)) {
            throw new ApiError(403, "Only managers, admins, or owners can assign tasks");
        }

        if (assignedTo) {
            await ensureAssigneeIsProjectMember({
                assignedTo,
                projectId: req.task.project
            });
        }

        updateData.assignedTo = assignedTo || null;

        activities.push({
            action: assignedTo ? "task_assigned" : "task_unassigned",
            metadata: {
                from: req.task.assignedTo,
                to: assignedTo || null
            }
        });
    }

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "No valid fields provided for update");
    }

    const task = await Task.findByIdAndUpdate(
        req.task._id,
        {
            $set: updateData
        },
        {
            new: true,
            runValidators: true
        }
    );

    activities.unshift({
        action: "task_updated",
        metadata: {
            fields: Object.keys(updateData)
        }
    });

    await Promise.all(
        activities.map((activity) =>
            createTaskActivity({
                task: task._id,
                project: task.project,
                organization: task.organization,
                user: req.user._id,
                action: activity.action,
                metadata: activity.metadata
            })
        )
    );

    if (assignedTo !== undefined && assignedTo) {
        await notifyTaskAssigned({
            task,
            actor: req.user._id,
            assignedTo
        });
    }

    if (status !== undefined && status !== req.task.status) {
        await notifyTaskStatusChanged({
            task,
            actor: req.user._id,
            oldStatus: req.task.status,
            newStatus: status
        });
    }

    const populatedTask = await populateTask(task._id);

    try {
        const io = getIO();
        io.to(`task_${task._id}`).emit("task_updated", { task: populatedTask });
        io.to(`project_${task.project}`).emit("task_updated", { task: populatedTask });
    } catch (err) {
        console.error("Socket emit failed", err);
    }

    return res.status(200).json(new ApiResponse(200, { task: populatedTask }, "Task updated successfully"));
});

export const updateTaskStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;

    if (!canWorkOnTask(req, req.task)) {
        throw new ApiError(403, "You can only update status for tasks you manage, created, or are assigned to");
    }

    if (!allowedStatuses.includes(status)) {
        throw new ApiError(400, "Invalid task status");
    }

    const oldStatus = req.task.status;

    const task = await Task.findByIdAndUpdate(
        req.task._id,
        {
            $set: {
                status
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    await createTaskActivity({
        task: task._id,
        project: task.project,
        organization: task.organization,
        user: req.user._id,
        action: "status_changed",
        metadata: {
            from: oldStatus,
            to: status
        }
    });

    await notifyTaskStatusChanged({
        task,
        actor: req.user._id,
        oldStatus,
        newStatus: status
    });

    const populatedTask = await populateTask(task._id);

    try {
        const io = getIO();
        io.to(`task_${task._id}`).emit("task_updated", { task: populatedTask });
        io.to(`project_${task.project}`).emit("task_updated", { task: populatedTask });
    } catch (err) {
        console.error("Socket emit failed", err);
    }

    return res.status(200).json(new ApiResponse(200, { task: populatedTask }, "Task status updated successfully"));
});

export const assignTask = asyncHandler(async (req, res) => {
    const { assignedTo = null } = req.body;

    if (assignedTo) {
        await ensureAssigneeIsProjectMember({
            assignedTo,
            projectId: req.task.project
        });
    }

    const task = await Task.findByIdAndUpdate(
        req.task._id,
        {
            $set: {
                assignedTo: assignedTo || null
            }
        },
        {
            new: true,
            runValidators: true
        }
    );

    await createTaskActivity({
        task: task._id,
        project: task.project,
        organization: task.organization,
        user: req.user._id,
        action: assignedTo ? "task_assigned" : "task_unassigned",
        metadata: {
            from: req.task.assignedTo,
            to: assignedTo || null
        }
    });

    if (assignedTo) {
        await notifyTaskAssigned({
            task,
            actor: req.user._id,
            assignedTo
        });
    }

    const populatedTask = await populateTask(task._id);

    try {
        const io = getIO();
        io.to(`task_${task._id}`).emit("task_updated", { task: populatedTask });
        io.to(`project_${task.project}`).emit("task_updated", { task: populatedTask });
    } catch (err) {
        console.error("Socket emit failed", err);
    }

    return res.status(200).json(new ApiResponse(200, { task: populatedTask }, "Task assignment updated successfully"));
});

export const deleteTask = asyncHandler(async (req, res) => {
    if (!canManageAnyTask(req)) {
        throw new ApiError(403, "Only managers, admins, or owners can delete tasks");
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await createTaskActivity({
            task: req.task._id,
            project: req.task.project,
            organization: req.task.organization,
            user: req.user._id,
            action: "task_deleted",
            metadata: {
                title: req.task.title
            },
            session
        });

        await Task.findByIdAndDelete(req.task._id).session(session);

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json(new ApiResponse(200, {}, "Task deleted successfully"));
    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }
});

export const addSubtask = asyncHandler(async (req, res) => {
    const { title } = req.body;

    if (!canWorkOnTask(req, req.task)) {
        throw new ApiError(403, "You can only modify subtasks for tasks you manage, created, or are assigned to");
    }

    if (!title?.trim()) {
        throw new ApiError(400, "Subtask title is required");
    }

    req.task.subtasks.push({
        title,
        isCompleted: false
    });

    await req.task.save();

    await createTaskActivity({
        task: req.task._id,
        project: req.task.project,
        organization: req.task.organization,
        user: req.user._id,
        action: "subtask_added",
        metadata: {
            title
        }
    });

    const task = await populateTask(req.task._id);

    return res.status(201).json(new ApiResponse(201, { task }, "Subtask added successfully"));
});

export const updateSubtask = asyncHandler(async (req, res) => {
    const { subtaskId } = req.params;
    const { title, isCompleted } = req.body;

    if (!canWorkOnTask(req, req.task)) {
        throw new ApiError(403, "You can only modify subtasks for tasks you manage, created, or are assigned to");
    }

    const subtask = req.task.subtasks.id(subtaskId);

    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    if (title !== undefined) {
        if (!title.trim()) {
            throw new ApiError(400, "Subtask title cannot be empty");
        }

        subtask.title = title;
    }

    if (isCompleted !== undefined) {
        subtask.isCompleted = Boolean(isCompleted);
    }

    await req.task.save();

    await createTaskActivity({
        task: req.task._id,
        project: req.task.project,
        organization: req.task.organization,
        user: req.user._id,
        action: "subtask_updated",
        metadata: {
            subtaskId,
            title: subtask.title,
            isCompleted: subtask.isCompleted
        }
    });

    const task = await populateTask(req.task._id);

    return res.status(200).json(new ApiResponse(200, { task }, "Subtask updated successfully"));
});

export const deleteSubtask = asyncHandler(async (req, res) => {
    const { subtaskId } = req.params;

    if (!canWorkOnTask(req, req.task)) {
        throw new ApiError(403, "You can only modify subtasks for tasks you manage, created, or are assigned to");
    }

    const subtask = req.task.subtasks.id(subtaskId);

    if (!subtask) {
        throw new ApiError(404, "Subtask not found");
    }

    const title = subtask.title;

    req.task.subtasks.pull(subtaskId);
    await req.task.save();

    await createTaskActivity({
        task: req.task._id,
        project: req.task.project,
        organization: req.task.organization,
        user: req.user._id,
        action: "subtask_deleted",
        metadata: {
            subtaskId,
            title
        }
    });

    const task = await populateTask(req.task._id);

    return res.status(200).json(new ApiResponse(200, { task }, "Subtask deleted successfully"));
});

export const getTaskActivity = asyncHandler(async (req, res) => {
    const activities = await TaskActivity.find({
        task: req.task._id
    })
        .populate("user", "name email avatar")
        .sort({ createdAt: -1 });

    return res.status(200).json(new ApiResponse(200, { activities }, "Task activity fetched successfully"));
});