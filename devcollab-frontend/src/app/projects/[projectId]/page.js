"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";
import GitHubProjectPanel from "@/components/github/GitHubProjectPanel";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import AITaskAssistantPanel from "@/components/ai/AITaskAssistantPanel";
import AIProjectIntelligencePanel from "@/components/ai/AIProjectIntelligencePanel";
import Badge from "@/components/ui/Badge";
import RecommendedTeammatesPanel from "@/components/matching/RecommendedTeammatesPanel";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId;

  const [project, setProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [memberForm, setMemberForm] = useState({
    email: "",
    role: "developer"
  });

  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    status: "todo",
    priority: "medium",
    dueDate: "",
    labels: ""
  });

  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    search: ""
  });

  const [loading, setLoading] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.status) {
      params.set("status", filters.status);
    }

    if (filters.priority) {
      params.set("priority", filters.priority);
    }

    if (filters.search.trim()) {
      params.set("search", filters.search.trim());
    }

    const value = params.toString();

    return value ? `?${value}` : "";
  }, [filters]);

  const loadProjectPage = async () => {
    try {
      setLoading(true);
      setError("");

      const [projectResponse, membersResponse, tasksResponse] = await Promise.all([
        apiRequest(`/projects/${projectId}`),
        apiRequest(`/projects/${projectId}/members`),
        apiRequest(`/projects/${projectId}/tasks${queryString}`)
      ]);

      setProject(projectResponse.data.project);
      setProjectMembers(membersResponse.data.members || []);
      setTasks(tasksResponse.data.tasks || []);
    } catch (error) {
      setError(error.message);

      if (error.message.toLowerCase().includes("unauthorized")) {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      Promise.resolve().then(loadProjectPage);
    }
  }, [projectId, queryString]);

  const handleMemberChange = (event) => {
    setMemberForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const handleTaskChange = (event) => {
    setTaskForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const handleFilterChange = (event) => {
    setFilters((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const handleAddProjectMember = async (event) => {
    event.preventDefault();
    setAddingMember(true);
    setError("");

    try {
      await apiRequest(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify(memberForm)
      });

      setMemberForm({
        email: "",
        role: "developer"
      });

      await loadProjectPage();
    } catch (error) {
      setError(error.message);
    } finally {
      setAddingMember(false);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    setCreatingTask(true);
    setError("");

    try {
      const labels = taskForm.labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean);

      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        status: taskForm.status,
        priority: taskForm.priority,
        labels
      };

      if (taskForm.assignedTo) {
        payload.assignedTo = taskForm.assignedTo;
      }

      if (taskForm.dueDate) {
        payload.dueDate = taskForm.dueDate;
      }

      await apiRequest(`/projects/${projectId}/tasks`, {
        method: "POST",
        body: JSON.stringify(payload)
      });

      setTaskForm({
        title: "",
        description: "",
        assignedTo: "",
        status: "todo",
        priority: "medium",
        dueDate: "",
        labels: ""
      });

      await loadProjectPage();
    } catch (error) {
      setError(error.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const organizationId = project?.organization?._id || project?.organization;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading project...</p>
      </main>
    );
  }

  return (
    <AppShell
      title={project?.name || "Project"}
      description={project?.description || "Manage tasks and members for this project."}
      backHref={organizationId ? `/organizations/${organizationId}` : "/dashboard"}
      backLabel="Back to organization"
      actions={
        <Link
          href={`/analytics/projects/${projectId}`}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
        >
          Analytics
        </Link>
      }
    >
      {error && (
        <p className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2">
          <h2 className="text-xl font-bold">Create task</h2>
          <p className="text-slate-400 mt-2">
            Tasks can be assigned to project members and tracked by status, priority, labels, and due date.
          </p>

          <form onSubmit={handleCreateTask} className="mt-6 space-y-4">
            <input
              name="title"
              value={taskForm.title}
              onChange={handleTaskChange}
              placeholder="Task title"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              required
            />

            <textarea
              name="description"
              value={taskForm.description}
              onChange={handleTaskChange}
              placeholder="Task description"
              rows={3}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select
                name="assignedTo"
                value={taskForm.assignedTo}
                onChange={handleTaskChange}
                className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="">Unassigned</option>
                {projectMembers.map((member) => (
                  <option key={member._id} value={member.user?._id}>
                    {member.user?.name}
                  </option>
                ))}
              </select>

              <select
                name="status"
                value={taskForm.status}
                onChange={handleTaskChange}
                className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">Todo</option>
                <option value="in-progress">In progress</option>
                <option value="review">Review</option>
                <option value="completed">Completed</option>
              </select>

              <select
                name="priority"
                value={taskForm.priority}
                onChange={handleTaskChange}
                className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>

              <input
                name="dueDate"
                type="date"
                value={taskForm.dueDate}
                onChange={handleTaskChange}
                className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <input
              name="labels"
              value={taskForm.labels}
              onChange={handleTaskChange}
              placeholder="backend, auth, security"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={creatingTask}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {creatingTask ? "Creating task..." : "Create task"}
            </button>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel>
            <h2 className="text-xl font-bold">Add project member</h2>
            <p className="text-slate-400 mt-2">User must already be an organization member.</p>

            <form onSubmit={handleAddProjectMember} className="mt-6 space-y-4">
              <input
                name="email"
                type="email"
                value={memberForm.email}
                onChange={handleMemberChange}
                placeholder="member@example.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                required
              />

              <select
                name="role"
                value={memberForm.role}
                onChange={handleMemberChange}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="manager">Manager</option>
                <option value="developer">Developer</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={addingMember}
                className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {addingMember ? "Adding..." : "Add project member"}
              </button>
            </form>
          </Panel>

          <RecommendedTeammatesPanel projectId={projectId} onMemberAdded={loadProjectPage} />
        </div>
      </div>

      <Panel className="mt-8">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Tasks</h2>
            <p className="text-slate-400 mt-2">Filter tasks by status, priority, or search text.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full lg:w-auto">
            <input
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search tasks"
              className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            />

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">All statuses</option>
              <option value="backlog">Backlog</option>
              <option value="todo">Todo</option>
              <option value="in-progress">In progress</option>
              <option value="review">Review</option>
              <option value="completed">Completed</option>
            </select>

            <select
              name="priority"
              value={filters.priority}
              onChange={handleFilterChange}
              className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">All priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {tasks.length === 0 ? (
          <EmptyState message="No tasks found." />
        ) : (
          <div className="mt-6 space-y-4">
            {tasks.map((task) => (
              <Link
                key={task._id}
                href={`/tasks/${task._id}`}
                className="block rounded-xl border border-slate-800 bg-slate-950 p-5 hover:border-blue-500 transition"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{task.title}</h3>
                    <p className="text-slate-400 mt-1">{task.description || "No description"}</p>
                  </div>

                  <div className="flex flex-wrap md:justify-end gap-2">
                    <Badge variant="blue">{task.status}</Badge>
                    <Badge variant="orange">{task.priority}</Badge>
                    <Badge>{task.assignedTo?.name || "Unassigned"}</Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
      <AITaskAssistantPanel projectId={projectId} onTasksCreated={loadProjectPage} />
      <AITaskAssistantPanel projectId={projectId} onTasksCreated={loadProjectPage} />

      <AIProjectIntelligencePanel projectId={projectId} />

      <GitHubProjectPanel
        projectId={projectId}
        projectMembers={projectMembers}
        onTaskCreated={loadProjectPage}
      />
      <GitHubProjectPanel
        projectId={projectId}
        projectMembers={projectMembers}
        onTaskCreated={loadProjectPage}
      />

      <Panel className="mt-8">
        <h2 className="text-xl font-bold">Project members</h2>
        <p className="text-slate-400 mt-2">Members assigned to this project.</p>

        {projectMembers.length === 0 ? (
          <EmptyState message="No project members found." />
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectMembers.map((member) => (
              <div key={member._id} className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{member.user?.name}</h3>
                    <p className="text-slate-400 text-sm mt-1">{member.user?.email}</p>
                  </div>

                  <Badge>{member.role}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
