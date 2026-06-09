"use client";

import { useEffect, useState } from "react";
import { apiRequest, API_BASE_URL } from "@/lib/api";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function GitHubProjectPanel({ projectId, projectMembers = [], onTaskCreated }) {
    const [status, setStatus] = useState(null);
    const [repositories, setRepositories] = useState([]);
    const [connectedRepositories, setConnectedRepositories] = useState([]);
    const [selectedRepository, setSelectedRepository] = useState("");
    const [selectedConnectedRepository, setSelectedConnectedRepository] = useState("");
    const [issues, setIssues] = useState([]);
    const [pulls, setPulls] = useState([]);

    const [loading, setLoading] = useState(true);
    const [loadingRepos, setLoadingRepos] = useState(false);
    const [connectingRepo, setConnectingRepo] = useState(false);
    const [loadingGithubData, setLoadingGithubData] = useState(false);
    const [error, setError] = useState("");
    const [creatingIssueTask, setCreatingIssueTask] = useState("");
    const [issueTaskForm, setIssueTaskForm] = useState({
        assignedTo: "",
        priority: "medium",
        status: "todo"
    });

    const loadGitHubPanel = async () => {
        try {
            setLoading(true);
            setError("");

            const [statusResponse, connectedReposResponse] = await Promise.all([
                apiRequest("/github/status"),
                apiRequest(`/github/projects/${projectId}/repositories`)
            ]);

            setStatus(statusResponse.data);
            setConnectedRepositories(connectedReposResponse.data.repositories || []);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleIssueTaskFormChange = (event) => {
        setIssueTaskForm((previous) => ({
            ...previous,
            [event.target.name]: event.target.value
        }));
    };

    const handleCreateTaskFromIssue = async (issue) => {
        if (!selectedConnectedRepository) {
            setError("Select a connected repository first");
            return;
        }

        try {
            setCreatingIssueTask(issue.id);
            setError("");

            const payload = {
                priority: issueTaskForm.priority,
                status: issueTaskForm.status,
                assignedTo: issueTaskForm.assignedTo || null,
                extraLabels: ["github-sync"]
            };

            await apiRequest(
                `/github/projects/${projectId}/repositories/${selectedConnectedRepository}/issues/${issue.number}/create-task`,
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            if (onTaskCreated) {
                await onTaskCreated();
            }

            await handleLoadRepositoryData(selectedConnectedRepository);
        } catch (error) {
            setError(error.message);
        } finally {
            setCreatingIssueTask("");
        }
    };

    const loadGithubRepositories = async () => {
        try {
            setLoadingRepos(true);
            setError("");

            const response = await apiRequest("/github/repositories");

            setRepositories(response.data.repositories || []);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoadingRepos(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            Promise.resolve().then(loadGitHubPanel);
        }
    }, [projectId]);

    useEffect(() => {
        if (status?.connected) {
            Promise.resolve().then(loadGithubRepositories);
        }
    }, [status?.connected]);

    const handleConnectGitHub = () => {
        window.location.href = `${API_BASE_URL}/github/connect`;
    };

    const handleConnectRepository = async (event) => {
        event.preventDefault();

        if (!selectedRepository) {
            setError("Please select a repository");
            return;
        }

        try {
            setConnectingRepo(true);
            setError("");

            await apiRequest(`/github/projects/${projectId}/repositories`, {
                method: "POST",
                body: JSON.stringify({
                    fullName: selectedRepository
                })
            });

            setSelectedRepository("");
            await loadGitHubPanel();
        } catch (error) {
            setError(error.message);
        } finally {
            setConnectingRepo(false);
        }
    };

    const handleLoadRepositoryData = async (repositoryId) => {
        if (!repositoryId) {
            setIssues([]);
            setPulls([]);
            return;
        }

        try {
            setLoadingGithubData(true);
            setError("");

            const [issuesResponse, pullsResponse] = await Promise.all([
                apiRequest(`/github/repositories/${repositoryId}/issues`),
                apiRequest(`/github/repositories/${repositoryId}/pulls`)
            ]);

            setIssues(issuesResponse.data.issues || []);
            setPulls(pullsResponse.data.pulls || []);
        } catch (error) {
            setError(error.message);
        } finally {
            setLoadingGithubData(false);
        }
    };

    const handleConnectedRepositoryChange = async (event) => {
        const repositoryId = event.target.value;

        setSelectedConnectedRepository(repositoryId);
        await handleLoadRepositoryData(repositoryId);
    };

    if (loading) {
        return (
            <Panel className="mt-8">
                <p className="text-slate-400">Loading GitHub integration...</p>
            </Panel>
        );
    }

    return (
        <Panel className="mt-8">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold">GitHub Integration</h2>
                    <p className="text-slate-400 mt-2">
                        Connect repositories, view issues, and track pull requests for this project.
                    </p>
                </div>

                {status?.connected ? (
                    <div className="flex items-center gap-3 rounded-xl bg-slate-950 border border-slate-800 px-4 py-3">
                        {status.connection?.avatarUrl && (
                            <img
                                src={status.connection.avatarUrl}
                                alt={status.connection.username}
                                className="h-9 w-9 rounded-full"
                            />
                        )}

                        <div>
                            <p className="text-sm text-slate-400">Connected as</p>
                            <p className="font-semibold">{status.connection?.username}</p>
                        </div>
                    </div>
                ) : (
                    <button
                        onClick={handleConnectGitHub}
                        className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
                    >
                        Connect GitHub
                    </button>
                )}
            </div>

            {error && (
                <p className="mt-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
                    {error}
                </p>
            )}

            {!status?.connected ? (
                <EmptyState message="Connect your GitHub account to attach repositories to this project." />
            ) : (
                <>
                    <form onSubmit={handleConnectRepository} className="mt-6 grid grid-cols-1 lg:grid-cols-4 gap-3">
                        <select
                            value={selectedRepository}
                            onChange={(event) => setSelectedRepository(event.target.value)}
                            className="lg:col-span-3 rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                        >
                            <option value="">
                                {loadingRepos ? "Loading repositories..." : "Select repository"}
                            </option>

                            {repositories.map((repository) => (
                                <option key={repository.githubRepoId} value={repository.fullName}>
                                    {repository.fullName}
                                </option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            disabled={connectingRepo || !selectedRepository}
                            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
                        >
                            {connectingRepo ? "Connecting..." : "Connect repo"}
                        </button>
                    </form>

                    <section className="mt-8">
                        <h3 className="text-lg font-bold">Connected repositories</h3>

                        {connectedRepositories.length === 0 ? (
                            <EmptyState message="No repositories connected to this project yet." />
                        ) : (
                            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                {connectedRepositories.map((repository) => (
                                    <div
                                        key={repository._id}
                                        className="rounded-xl bg-slate-950 border border-slate-800 p-5"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div>
                                                <a
                                                    href={repository.htmlUrl}
                                                    target="_blank"
                                                    className="font-bold text-blue-300 hover:text-blue-200"
                                                >
                                                    {repository.fullName}
                                                </a>

                                                <p className="text-sm text-slate-500 mt-2">
                                                    Default branch: {repository.defaultBranch}
                                                </p>
                                            </div>

                                            <Badge variant={repository.private ? "orange" : "green"}>
                                                {repository.private ? "Private" : "Public"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {connectedRepositories.length > 0 && (
                        <section className="mt-8">
                            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                                <div>
                                    <h3 className="text-lg font-bold">Issues and pull requests</h3>
                                    <p className="text-slate-400 mt-2">
                                        Select a connected repository to view recent GitHub work.
                                    </p>
                                </div>

                                <select
                                    value={selectedConnectedRepository}
                                    onChange={handleConnectedRepositoryChange}
                                    className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                                >
                                    <option value="">Select connected repo</option>

                                    {connectedRepositories.map((repository) => (
                                        <option key={repository._id} value={repository._id}>
                                            {repository.fullName}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="mt-6 rounded-xl bg-slate-950 border border-slate-800 p-5">
                                <h4 className="font-bold">Create tasks from GitHub issues</h4>
                                <p className="text-slate-400 text-sm mt-2">
                                    Choose default values for tasks created from issues.
                                </p>

                                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <select
                                        name="assignedTo"
                                        value={issueTaskForm.assignedTo}
                                        onChange={handleIssueTaskFormChange}
                                        className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="">Unassigned</option>

                                        {projectMembers.map((member) => (
                                            <option key={member._id} value={member.user?._id}>
                                                {member.user?.name}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        name="priority"
                                        value={issueTaskForm.priority}
                                        onChange={handleIssueTaskFormChange}
                                        className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>

                                    <select
                                        name="status"
                                        value={issueTaskForm.status}
                                        onChange={handleIssueTaskFormChange}
                                        className="rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                                    >
                                        <option value="backlog">Backlog</option>
                                        <option value="todo">Todo</option>
                                        <option value="in-progress">In progress</option>
                                        <option value="review">Review</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                            </div>
                            {loadingGithubData ? (
                                <p className="text-slate-400 mt-6">Loading GitHub issues and pull requests...</p>
                            ) : selectedConnectedRepository ? (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                                    <GitHubList
                                        title="Issues"
                                        items={issues}
                                        emptyMessage="No issues found."
                                        onCreateTask={handleCreateTaskFromIssue}
                                        creatingIssueTask={creatingIssueTask}
                                    />

                                    <GitHubList
                                        title="Pull requests"
                                        items={pulls}
                                        emptyMessage="No pull requests found."
                                    />
                                </div>
                            ) : (
                                <EmptyState message="Select a connected repository to load issues and pull requests." />
                            )}
                        </section>
                    )}
                </>
            )}
        </Panel>
    );
}

function GitHubList({ title, items, emptyMessage, onCreateTask, creatingIssueTask }) {
  return (
    <section className="rounded-xl bg-slate-950 border border-slate-800 p-5">
      <h3 className="font-bold text-lg">{title}</h3>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500 mt-4">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <a
                    href={item.html_url}
                    target="_blank"
                    className="font-medium text-blue-300 hover:text-blue-200"
                  >
                    {item.title}
                  </a>

                  <p className="text-sm text-slate-500 mt-1">
                    #{item.number} opened by {item.user?.login}
                  </p>
                </div>

                <Badge variant={item.state === "open" ? "green" : "default"}>
                  {item.state}
                </Badge>
              </div>

              {onCreateTask && (
                <button
                  onClick={() => onCreateTask(item)}
                  disabled={creatingIssueTask === item.id}
                  className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
                >
                  {creatingIssueTask === item.id ? "Creating task..." : "Create DevCollab task"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
