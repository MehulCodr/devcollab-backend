import crypto from "crypto";
import { GithubConnection } from "../models/githubConnection.model.js";
import { GithubRepository } from "../models/githubRepository.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";
import { encryptText, decryptText } from "../utils/crypto.js";
import { env } from "../config/env.js";
import {
  exchangeCodeForAccessToken,
  getAuthenticatedGithubRepos,
  getAuthenticatedGithubUser,
  getGithubRepoByFullName,
  getGithubRepoIssues,
  getGithubRepoPulls,
  getGithubIssueByNumber
} from "../services/github.service.js";
import mongoose from "mongoose";
import { Task } from "../models/task.model.js";
import { TaskActivity } from "../models/taskActivity.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { GithubTaskLink } from "../models/githubTaskLink.model.js";
import { notifyTaskAssigned } from "../services/notification.service.js";

const oauthCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === "production",
  sameSite: env.nodeEnv === "production" ? "none" : "lax",
  maxAge: 10 * 60 * 1000
};

const getGithubTokenForUser = async (userId) => {
  const connection = await GithubConnection.findOne({
    user: userId
  }).select("+accessTokenEncrypted");

  if (!connection) {
    throw new ApiError(400, "GitHub account is not connected");
  }

  return {
    connection,
    token: decryptText(connection.accessTokenEncrypted)
  };
};

export const startGithubOAuth = asyncHandler(async (req, res) => {
  const state = crypto.randomBytes(24).toString("hex");

  const scopes = ["repo", "read:user", "user:email"].join(" ");

  const authorizationUrl = new URL("https://github.com/login/oauth/authorize");

  authorizationUrl.searchParams.set("client_id", env.githubClientId);
  authorizationUrl.searchParams.set("redirect_uri", env.githubCallbackUrl);
  authorizationUrl.searchParams.set("scope", scopes);
  authorizationUrl.searchParams.set("state", state);

  return res
    .cookie("githubOAuthState", state, oauthCookieOptions)
    .cookie("githubOAuthUserId", req.user._id.toString(), oauthCookieOptions)
    .redirect(authorizationUrl.toString());
});

export const handleGithubCallback = asyncHandler(async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    throw new ApiError(400, "GitHub code and state are required");
  }

  const savedState = req.cookies?.githubOAuthState;
  const userId = req.cookies?.githubOAuthUserId;

  if (!savedState || !userId || savedState !== state) {
    throw new ApiError(400, "Invalid GitHub OAuth state");
  }

  const { accessToken, scope } = await exchangeCodeForAccessToken(code);

  const githubUser = await getAuthenticatedGithubUser(accessToken);

  await GithubConnection.findOneAndUpdate(
    {
      user: userId
    },
    {
      $set: {
        githubUserId: githubUser.id,
        username: githubUser.login,
        displayName: githubUser.name || "",
        avatarUrl: githubUser.avatar_url || "",
        profileUrl: githubUser.html_url || "",
        accessTokenEncrypted: encryptText(accessToken),
        scopes: scope ? scope.split(",").map((item) => item.trim()) : [],
        connectedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );

  return res
    .clearCookie("githubOAuthState", oauthCookieOptions)
    .clearCookie("githubOAuthUserId", oauthCookieOptions)
    .redirect(`${env.frontendUrl}/dashboard?github=connected`);
});

export const getGithubStatus = asyncHandler(async (req, res) => {
  const connection = await GithubConnection.findOne({
    user: req.user._id
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        connected: Boolean(connection),
        connection: connection
          ? {
              username: connection.username,
              displayName: connection.displayName,
              avatarUrl: connection.avatarUrl,
              profileUrl: connection.profileUrl,
              connectedAt: connection.connectedAt,
              scopes: connection.scopes
            }
          : null
      },
      "GitHub status fetched successfully"
    )
  );
});

export const getGithubRepositories = asyncHandler(async (req, res) => {
  const { token } = await getGithubTokenForUser(req.user._id);

  const repos = await getAuthenticatedGithubRepos(token);

  const formattedRepos = repos.map((repo) => ({
    githubRepoId: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login,
    name: repo.name,
    private: repo.private,
    htmlUrl: repo.html_url,
    defaultBranch: repo.default_branch,
    description: repo.description,
    language: repo.language,
    updatedAt: repo.updated_at
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, { repositories: formattedRepos }, "GitHub repositories fetched successfully"));
});

export const connectRepositoryToProject = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const { fullName } = req.body;

  validateMongoId(projectId, "project id");

  if (!fullName?.trim() || !fullName.includes("/")) {
    throw new ApiError(400, "Repository fullName is required, for example owner/repo");
  }

  const { connection, token } = await getGithubTokenForUser(req.user._id);

  const repo = await getGithubRepoByFullName({
    token,
    fullName
  });

  const repository = await GithubRepository.findOneAndUpdate(
    {
      project: req.project._id,
      githubRepoId: repo.id
    },
    {
      $set: {
        organization: req.project.organization,
        project: req.project._id,
        connection: connection._id,
        connectedBy: req.user._id,
        githubRepoId: repo.id,
        fullName: repo.full_name,
        owner: repo.owner.login,
        name: repo.name,
        private: repo.private,
        htmlUrl: repo.html_url,
        defaultBranch: repo.default_branch || "main"
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, { repository }, "Repository connected to project successfully"));
});

export const getProjectGithubRepositories = asyncHandler(async (req, res) => {
  const repositories = await GithubRepository.find({
    project: req.project._id
  })
    .populate("connectedBy", "name email avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { repositories }, "Project GitHub repositories fetched successfully"));
});

export const getRepositoryIssues = asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;

  validateMongoId(repositoryId, "repository id");

  const repository = await GithubRepository.findById(repositoryId);

  if (!repository) {
    throw new ApiError(404, "GitHub repository not found");
  }

  const { token } = await getGithubTokenForUser(req.user._id);

  const issues = await getGithubRepoIssues({
    token,
    owner: repository.owner,
    repo: repository.name
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { issues }, "GitHub issues fetched successfully"));
});

export const getRepositoryPulls = asyncHandler(async (req, res) => {
  const { repositoryId } = req.params;

  validateMongoId(repositoryId, "repository id");

  const repository = await GithubRepository.findById(repositoryId);

  if (!repository) {
    throw new ApiError(404, "GitHub repository not found");
  }

  const { token } = await getGithubTokenForUser(req.user._id);

  const pulls = await getGithubRepoPulls({
    token,
    owner: repository.owner,
    repo: repository.name
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { pulls }, "GitHub pull requests fetched successfully"));
});

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

const normalizeGithubLabels = (labels = []) => {
  return labels
    .map((label) => label.name?.toString().trim().toLowerCase())
    .filter(Boolean);
};

const ensureAssigneeIsProjectMember = async ({ assignedTo, projectId }) => {
  if (!assignedTo) {
    return;
  }

  const projectMember = await ProjectMember.findOne({
    user: assignedTo,
    project: projectId,
    status: "active"
  });

  if (!projectMember) {
    throw new ApiError(400, "Assigned user must be an active project member");
  }
};

export const createTaskFromGithubIssue = asyncHandler(async (req, res) => {
  const { repositoryId, issueNumber } = req.params;
  const {
    assignedTo = null,
    priority = "medium",
    status = "todo",
    extraLabels = []
  } = req.body;

  validateMongoId(repositoryId, "repository id");

  if (!["low", "medium", "high", "urgent"].includes(priority)) {
    throw new ApiError(400, "Invalid task priority");
  }

  if (!["backlog", "todo", "in-progress", "review", "completed"].includes(status)) {
    throw new ApiError(400, "Invalid task status");
  }

  if (assignedTo) {
    validateMongoId(assignedTo, "assigned user id");

    await ensureAssigneeIsProjectMember({
      assignedTo,
      projectId: req.project._id
    });
  }

  const repository = await GithubRepository.findOne({
    _id: repositoryId,
    project: req.project._id
  });

  if (!repository) {
    throw new ApiError(404, "GitHub repository not found for this project");
  }

  const existingLink = await GithubTaskLink.findOne({
    repository: repository._id,
    issueNumber: Number(issueNumber)
  }).populate("task", "title status priority");

  if (existingLink) {
    throw new ApiError(409, "A task already exists for this GitHub issue");
  }

  const { token } = await getGithubTokenForUser(req.user._id);

  const issue = await getGithubIssueByNumber({
    token,
    owner: repository.owner,
    repo: repository.name,
    issueNumber
  });

  const githubLabels = normalizeGithubLabels(issue.labels);
  const labels = [
    ...new Set([
      "github",
      "issue",
      ...githubLabels,
      ...extraLabels.map((label) => label.toString().trim().toLowerCase()).filter(Boolean)
    ])
  ];

  const description = [
    issue.body || "No GitHub issue description provided.",
    "",
    `GitHub issue: ${issue.html_url}`,
    `Repository: ${repository.fullName}`,
    `Issue number: #${issue.number}`,
    `State: ${issue.state}`
  ].join("\n");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const [task] = await Task.create(
      [
        {
          title: issue.title,
          description,
          project: req.project._id,
          organization: req.project.organization,
          createdBy: req.user._id,
          assignedTo,
          status,
          priority,
          dueDate: null,
          labels
        }
      ],
      { session }
    );

    const [link] = await GithubTaskLink.create(
      [
        {
          organization: req.project.organization,
          project: req.project._id,
          task: task._id,
          repository: repository._id,
          createdBy: req.user._id,
          githubIssueId: issue.id,
          issueNumber: issue.number,
          issueTitle: issue.title,
          issueUrl: issue.html_url,
          issueState: issue.state,
          labels: githubLabels
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
        source: "github_issue",
        repository: repository.fullName,
        issueNumber: issue.number,
        issueUrl: issue.html_url
      },
      session
    });

    await createTaskActivity({
      task: task._id,
      project: task.project,
      organization: task.organization,
      user: req.user._id,
      action: "github_issue_linked",
      metadata: {
        repositoryId: repository._id,
        githubTaskLinkId: link._id,
        repository: repository.fullName,
        issueNumber: issue.number,
        issueUrl: issue.html_url
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
          source: "github_issue"
        },
        session
      });
    }

    await session.commitTransaction();
    session.endSession();

    if (assignedTo) {
      await notifyTaskAssigned({
        task,
        actor: req.user._id,
        assignedTo
      });
    }

    const populatedTask = await Task.findById(task._id)
      .populate("createdBy", "name email avatar")
      .populate("assignedTo", "name email avatar");

    const populatedLink = await GithubTaskLink.findById(link._id).populate(
      "repository",
      "fullName htmlUrl"
    );

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          task: populatedTask,
          githubLink: populatedLink
        },
        "Task created from GitHub issue successfully"
      )
    );
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
});

export const getTaskGithubLinks = asyncHandler(async (req, res) => {
  const { taskId } = req.params;

  validateMongoId(taskId, "task id");

  const links = await GithubTaskLink.find({
    task: taskId
  })
    .populate("repository", "fullName htmlUrl defaultBranch private")
    .populate("createdBy", "name email avatar")
    .sort({ createdAt: -1 });

  return res
    .status(200)
    .json(new ApiResponse(200, { links }, "Task GitHub links fetched successfully"));
});