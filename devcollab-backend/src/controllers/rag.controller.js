import { Task } from "../models/task.model.js";
import { Comment } from "../models/comment.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { GithubTaskLink } from "../models/githubTaskLink.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  generateProjectRiskAnalysis,
  generateRagAnswer,
  searchProjectKnowledge,
  upsertKnowledgeChunk
} from "../services/rag.service.js";

const buildTaskContent = (task) => {
  return [
    `Task: ${task.title}`,
    `Description: ${task.description || "No description"}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
    `Labels: ${(task.labels || []).join(", ") || "none"}`,
    `Assigned to: ${task.assignedTo?.name || "Unassigned"}`,
    `Created by: ${task.createdBy?.name || "Unknown"}`,
    `Due date: ${task.dueDate || "Not set"}`,
    `Subtasks: ${(task.subtasks || [])
      .map((subtask) => `${subtask.title} (${subtask.isCompleted ? "done" : "pending"})`)
      .join("; ") || "none"}`
  ].join("\n");
};

const buildCommentContent = (comment) => {
  return [
    `Comment by: ${comment.author?.name || "Unknown"}`,
    `Task: ${comment.task?.title || "Unknown task"}`,
    `Comment: ${comment.body}`,
    `Mentions: ${(comment.mentions || []).map((user) => user.name).join(", ") || "none"}`
  ].join("\n");
};

const buildGithubIssueContent = (link) => {
  return [
    `GitHub issue linked to DevCollab task`,
    `Repository: ${link.repository?.fullName || "Unknown repository"}`,
    `Issue: #${link.issueNumber} ${link.issueTitle}`,
    `Issue state: ${link.issueState}`,
    `Issue URL: ${link.issueUrl}`,
    `Task: ${link.task?.title || "Unknown task"}`,
    `Labels: ${(link.labels || []).join(", ") || "none"}`
  ].join("\n");
};

const getProjectTaskStats = async (projectId) => {
  const tasks = await Task.find({
    project: projectId
  })
    .populate("assignedTo", "name email avatar")
    .lean();

  const now = new Date();

  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    activeTasks: tasks.filter((task) => task.status !== "completed").length,
    overdueTasks: tasks.filter(
      (task) => task.status !== "completed" && task.dueDate && new Date(task.dueDate) < now
    ).length,
    highPriorityTasks: tasks.filter((task) => task.priority === "high").length,
    urgentTasks: tasks.filter((task) => task.priority === "urgent").length,
    unassignedTasks: tasks.filter((task) => !task.assignedTo).length,
    staleTasks: tasks.filter((task) => {
      const updatedAt = new Date(task.updatedAt);
      const daysSinceUpdate = (now - updatedAt) / (1000 * 60 * 60 * 24);

      return task.status !== "completed" && daysSinceUpdate >= 7;
    }).length
  };

  return {
    stats,
    tasks
  };
};

const getWorkloadByMember = async ({ projectId, tasks }) => {
  const members = await ProjectMember.find({
    project: projectId,
    status: "active"
  })
    .populate("user", "name email avatar")
    .lean();

  return members.map((member) => {
    const assignedTasks = tasks.filter(
      (task) => task.assignedTo?._id?.toString() === member.user._id.toString()
    );

    const activeTasks = assignedTasks.filter((task) => task.status !== "completed");
    const overdueTasks = activeTasks.filter(
      (task) => task.dueDate && new Date(task.dueDate) < new Date()
    );

    return {
      userId: member.user._id.toString(),
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      totalTasks: assignedTasks.length,
      activeTasks: activeTasks.length,
      completedTasks: assignedTasks.filter((task) => task.status === "completed").length,
      overdueTasks: overdueTasks.length,
      urgentTasks: assignedTasks.filter((task) => task.priority === "urgent").length
    };
  });
};

export const syncProjectKnowledge = asyncHandler(async (req, res) => {
  const project = req.project;

  const [tasks, comments, githubLinks] = await Promise.all([
    Task.find({
      project: project._id
    })
      .populate("createdBy", "name email avatar")
      .populate("assignedTo", "name email avatar"),
    Comment.find({
      project: project._id,
      isDeleted: false
    })
      .populate("author", "name email avatar")
      .populate("mentions", "name email avatar")
      .populate("task", "title"),
    GithubTaskLink.find({
      project: project._id
    })
      .populate("repository", "fullName htmlUrl")
      .populate("task", "title")
  ]);

  let indexedCount = 0;

  for (const task of tasks) {
    const chunk = await upsertKnowledgeChunk({
      organization: project.organization,
      project: project._id,
      sourceType: "task",
      sourceId: task._id,
      title: `Task: ${task.title}`,
      content: buildTaskContent(task),
      metadata: {
        taskId: task._id,
        status: task.status,
        priority: task.priority,
        assignedTo: task.assignedTo?._id || null
      }
    });

    if (chunk) {
      indexedCount += 1;
    }
  }

  for (const comment of comments) {
    const chunk = await upsertKnowledgeChunk({
      organization: project.organization,
      project: project._id,
      sourceType: "comment",
      sourceId: comment._id,
      title: `Comment on ${comment.task?.title || "task"}`,
      content: buildCommentContent(comment),
      metadata: {
        commentId: comment._id,
        taskId: comment.task?._id || null,
        author: comment.author?._id || null
      }
    });

    if (chunk) {
      indexedCount += 1;
    }
  }

  for (const link of githubLinks) {
    const chunk = await upsertKnowledgeChunk({
      organization: project.organization,
      project: project._id,
      sourceType: "github_issue",
      sourceId: link._id,
      title: `GitHub issue #${link.issueNumber}: ${link.issueTitle}`,
      content: buildGithubIssueContent(link),
      metadata: {
        githubTaskLinkId: link._id,
        taskId: link.task?._id || null,
        repositoryId: link.repository?._id || null,
        issueNumber: link.issueNumber,
        issueUrl: link.issueUrl,
        issueState: link.issueState
      }
    });

    if (chunk) {
      indexedCount += 1;
    }
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        indexedCount,
        tasksIndexed: tasks.length,
        commentsIndexed: comments.length,
        githubIssuesIndexed: githubLinks.length
      },
      "Project knowledge synced successfully"
    )
  );
});

export const askProjectKnowledge = asyncHandler(async (req, res) => {
  const { question } = req.body;

  if (!question?.trim()) {
    throw new ApiError(400, "Question is required");
  }

  const chunks = await searchProjectKnowledge({
    projectId: req.project._id,
    query: question,
    limit: 8
  });

  if (chunks.length === 0) {
    throw new ApiError(404, "No project knowledge found. Sync project knowledge first");
  }

  const answer = await generateRagAnswer({
    project: req.project,
    query: question,
    chunks
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { ...answer, retrievedChunks: chunks }, "Project answer generated successfully"));
});

export const getProjectRiskAnalysis = asyncHandler(async (req, res) => {
  const { stats, tasks } = await getProjectTaskStats(req.project._id);

  const workloadByMember = await getWorkloadByMember({
    projectId: req.project._id,
    tasks
  });

  let contextChunks = [];

  try {
    contextChunks = await searchProjectKnowledge({
      projectId: req.project._id,
      query:
        "project risks blockers overdue tasks stale work overloaded members urgent tasks comments github issues pull requests deadlines",
      limit: 12
    });
  } catch (error) {
    contextChunks = [];
  }

  const analysis = await generateProjectRiskAnalysis({
    project: req.project,
    taskStats: stats,
    workloadByMember,
    contextChunks
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        analysis,
        metrics: stats,
        workloadByMember,
        contextUsed: contextChunks
      },
      "Project risk analysis generated successfully"
    )
  );
});