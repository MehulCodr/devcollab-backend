import { GithubRepository } from "../models/githubRepository.model.js";
import { GithubTaskLink } from "../models/githubTaskLink.model.js";
import { Task } from "../models/task.model.js";
import { TaskActivity } from "../models/taskActivity.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  extractIssueNumbersFromText,
  verifyGithubWebhookSignature
} from "../utils/githubWebhook.js";

const createTaskActivity = async ({ task, project, organization, user, action, metadata = {} }) => {
  await TaskActivity.create({
    task,
    project,
    organization,
    user,
    action,
    metadata
  });
};

export const handleGithubWebhook = asyncHandler(async (req, res) => {
  const signature = req.header("x-hub-signature-256");
  const event = req.header("x-github-event");

  const isValid = verifyGithubWebhookSignature({
    rawBody: req.body,
    signature
  });

  if (!isValid) {
    throw new ApiError(401, "Invalid GitHub webhook signature");
  }

  const payload = JSON.parse(req.body.toString("utf8"));

  if (event !== "pull_request") {
    return res.status(200).json({
      success: true,
      message: "Event ignored"
    });
  }

  const pullRequest = payload.pull_request;

  if (payload.action !== "closed" || !pullRequest?.merged) {
    return res.status(200).json({
      success: true,
      message: "Pull request event ignored"
    });
  }

  const repositoryFullName = payload.repository?.full_name;

  if (!repositoryFullName) {
    return res.status(200).json({
      success: true,
      message: "Repository not found in payload"
    });
  }

  const issueNumbers = extractIssueNumbersFromText(
    `${pullRequest.title || ""}\n${pullRequest.body || ""}`
  );

  if (issueNumbers.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No linked issue references found"
    });
  }

  const repositories = await GithubRepository.find({
    fullName: repositoryFullName
  });

  if (repositories.length === 0) {
    return res.status(200).json({
      success: true,
      message: "Repository is not connected to DevCollab"
    });
  }

  const repositoryIds = repositories.map((repository) => repository._id);

  const links = await GithubTaskLink.find({
    repository: {
      $in: repositoryIds
    },
    issueNumber: {
      $in: issueNumbers
    }
  });

  if (links.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No linked DevCollab tasks found"
    });
  }

  const updatedTaskIds = [];

  for (const link of links) {
    const task = await Task.findById(link.task);

    if (!task) {
      continue;
    }

    const oldStatus = task.status;

    task.status = "completed";
    await task.save();

    updatedTaskIds.push(task._id);

    await createTaskActivity({
      task: task._id,
      project: task.project,
      organization: task.organization,
      user: link.createdBy,
      action: "github_pr_merged",
      metadata: {
        from: oldStatus,
        to: "completed",
        repository: repositoryFullName,
        issueNumber: link.issueNumber,
        pullRequestNumber: pullRequest.number,
        pullRequestTitle: pullRequest.title,
        pullRequestUrl: pullRequest.html_url,
        mergedBy: pullRequest.merged_by?.login || null
      }
    });
  }

  return res.status(200).json({
    success: true,
    message: "GitHub webhook processed successfully",
    updatedTaskIds
  });
});