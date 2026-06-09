import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const GITHUB_API_BASE_URL = "https://api.github.com";

export const exchangeCodeForAccessToken = async (code) => {
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
      redirect_uri: env.githubCallbackUrl
    })
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new ApiError(400, data.error_description || "GitHub OAuth failed");
  }

  return {
    accessToken: data.access_token,
    scope: data.scope || ""
  };
};

export const githubRequest = async ({ token, endpoint, method = "GET", body }) => {
  const response = await fetch(`${GITHUB_API_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.message || "GitHub API request failed"
    );
  }

  return data;
};

export const getAuthenticatedGithubUser = async (token) => {
  return githubRequest({
    token,
    endpoint: "/user"
  });
};

export const getAuthenticatedGithubRepos = async (token) => {
  return githubRequest({
    token,
    endpoint:
      "/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member"
  });
};

export const getGithubRepoByFullName = async ({ token, fullName }) => {
  return githubRequest({
    token,
    endpoint: `/repos/${fullName}`
  });
};

export const getGithubRepoIssues = async ({ token, owner, repo }) => {
  const issues = await githubRequest({
    token,
    endpoint: `/repos/${owner}/${repo}/issues?state=all&per_page=50&sort=updated&direction=desc`
  });

  return issues.filter((issue) => !issue.pull_request);
};

export const getGithubRepoPulls = async ({ token, owner, repo }) => {
  return githubRequest({
    token,
    endpoint: `/repos/${owner}/${repo}/pulls?state=all&per_page=50&sort=updated&direction=desc`
  });
};
export const getGithubIssueByNumber = async ({ token, owner, repo, issueNumber }) => {
  const issue = await githubRequest({
    token,
    endpoint: `/repos/${owner}/${repo}/issues/${issueNumber}`
  });

  if (issue.pull_request) {
    throw new ApiError(400, "This GitHub item is a pull request, not an issue");
  }

  return issue;
};