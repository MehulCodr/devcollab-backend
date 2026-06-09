import mongoose from "mongoose";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";
import { TaskActivity } from "../models/taskActivity.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateTaskSuggestionsWithAI } from "../services/ai.service.js";
import { notifyTaskAssigned } from "../services/notification.service.js";

const allowedStatuses = ["backlog", "todo", "in-progress", "review", "completed"];
const allowedPriorities = ["low", "medium", "high", "urgent"];

const normalizeLabels = (labels = []) => {
  if (!Array.isArray(labels)) {
    return [];
  }

  return [...new Set(labels.map((label) => label.toString().trim().toLowerCase()).filter(Boolean))];
};

const getProjectWorkload = async (projectId) => {
  const workload = await Task.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        assignedTo: {
          $ne: null
        }
      }
    },
    {
      $group: {
        _id: "$assignedTo",
        totalTasks: {
          $sum: 1
        },
        activeTasks: {
          $sum: {
            $cond: [
              {
                $ne: ["$status", "completed"]
              },
              1,
              0
            ]
          }
        },
        completedTasks: {
          $sum: {
            $cond: [
              {
                $eq: ["$status", "completed"]
              },
              1,
              0
            ]
          }
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $ne: ["$status", "completed"]
                  },
                  {
                    $ne: ["$dueDate", null]
                  },
                  {
                    $lt: ["$dueDate", new Date()]
                  }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  return workload.reduce((acc, item) => {
    acc[item._id.toString()] = {
      totalTasks: item.totalTasks,
      activeTasks: item.activeTasks,
      completedTasks: item.completedTasks,
      overdueTasks: item.overdueTasks
    };

    return acc;
  }, {});
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

const validateSuggestedTask = (task) => {
  if (!task.title?.trim()) {
    throw new ApiError(400, "Every suggested task must have a title");
  }

  if (!allowedStatuses.includes(task.status)) {
    throw new ApiError(400, "Invalid task status in suggestion");
  }

  if (!allowedPriorities.includes(task.priority)) {
    throw new ApiError(400, "Invalid task priority in suggestion");
  }
};

export const generateTaskSuggestions = asyncHandler(async (req, res) => {
  const { transcript } = req.body;

  if (!transcript?.trim()) {
    throw new ApiError(400, "Meeting transcript is required");
  }

  if (transcript.length < 30) {
    throw new ApiError(400, "Transcript is too short to generate useful tasks");
  }

  if (transcript.length > 12000) {
    throw new ApiError(400, "Transcript is too long. Please keep it under 12000 characters");
  }

  const members = await ProjectMember.find({
    project: req.project._id,
    status: "active"
  }).populate("user", "name email avatar");

  if (members.length === 0) {
    throw new ApiError(400, "Project must have members before AI can suggest assignees");
  }

  const workload = await getProjectWorkload(req.project._id);

  const result = await generateTaskSuggestionsWithAI({
    transcript,
    project: req.project,
    members,
    workload
  });

  const validMemberIds = new Set(members.map((member) => member.user._id.toString()));

  const suggestions = result.suggestions.map((suggestion) => {
    const assigneeId = suggestion.suggestedAssigneeId;

    if (assigneeId && !validMemberIds.has(assigneeId)) {
      return {
        ...suggestion,
        suggestedAssigneeId: null,
        suggestedAssigneeName: null,
        rationale: `${suggestion.rationale} Assignee removed because AI returned a user outside the project.`
      };
    }

    return suggestion;
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        summary: result.summary,
        suggestions
      },
      "AI task suggestions generated successfully"
    )
  );
});

export const createTasksFromSuggestions = asyncHandler(async (req, res) => {
  const { tasks = [] } = req.body;

  if (!Array.isArray(tasks) || tasks.length === 0) {
    throw new ApiError(400, "Tasks array is required");
  }

  if (tasks.length > 10) {
    throw new ApiError(400, "You can create at most 10 AI suggested tasks at once");
  }

  const members = await ProjectMember.find({
    project: req.project._id,
    status: "active"
  }).select("user");

  const validMemberIds = new Set(members.map((member) => member.user.toString()));

  tasks.forEach(validateSuggestedTask);

  const session = await mongoose.startSession();
  session.startTransaction();

  const createdTasks = [];

  try {
    for (const suggestion of tasks) {
      const assignedTo =
        suggestion.suggestedAssigneeId && validMemberIds.has(suggestion.suggestedAssigneeId)
          ? suggestion.suggestedAssigneeId
          : null;

      const [task] = await Task.create(
        [
          {
            title: suggestion.title,
            description: suggestion.description || "",
            project: req.project._id,
            organization: req.project.organization,
            createdBy: req.user._id,
            assignedTo,
            status: suggestion.status || "todo",
            priority: suggestion.priority || "medium",
            dueDate: suggestion.dueDate || null,
            labels: normalizeLabels(suggestion.labels)
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
          title: task.title,
          source: "ai_meeting_transcript"
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
            assignedTo,
            source: "ai_meeting_transcript"
          },
          session
        });
      }

      createdTasks.push(task);
    }

    await session.commitTransaction();
    session.endSession();

    await Promise.all(
      createdTasks
        .filter((task) => task.assignedTo)
        .map((task) =>
          notifyTaskAssigned({
            task,
            actor: req.user._id,
            assignedTo: task.assignedTo
          })
        )
    );

    const populatedTasks = await Task.find({
      _id: {
        $in: createdTasks.map((task) => task._id)
      }
    })
      .populate("createdBy", "name email avatar")
      .populate("assignedTo", "name email avatar");

    return res
      .status(201)
      .json(new ApiResponse(201, { tasks: populatedTasks }, "AI suggested tasks created successfully"));
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});