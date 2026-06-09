"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId;

  const [analytics, setAnalytics] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const [analyticsResponse, projectResponse] = await Promise.all([
        apiRequest(`/analytics/projects/${projectId}`),
        apiRequest(`/projects/${projectId}`)
      ]);

      setAnalytics(analyticsResponse.data);
      setProject(projectResponse.data.project);
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
      Promise.resolve().then(loadAnalytics);
    }
  }, [projectId]);

  const maxCount = (items) => {
    return Math.max(...items.map((item) => item.count), 1);
  };

  const formatHours = (hours) => {
    if (!hours) {
      return "0h";
    }

    if (hours < 24) {
      return `${hours}h`;
    }

    return `${(hours / 24).toFixed(1)}d`;
  };

  const organizationId = project?.organization?._id || project?.organization;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading analytics...</p>
      </main>
    );
  }

  return (
    <AppShell
      title="Project Analytics"
      description={`${project?.name || "Project"} task performance and workload.`}
      backHref={`/projects/${projectId}`}
      backLabel="Back to project"
      actions={
        organizationId ? (
          <Link
            href={`/analytics/organizations/${organizationId}`}
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-900"
          >
            Organization analytics
          </Link>
        ) : null
      }
    >
      {error && (
        <p className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Total tasks" value={analytics?.overview?.totalTasks || 0} />
        <MetricCard label="Completed" value={analytics?.overview?.completedTasks || 0} />
        <MetricCard label="Active" value={analytics?.overview?.activeTasks || 0} />
        <MetricCard label="Overdue" value={analytics?.overview?.overdueTasks || 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <MetricCard label="Progress" value={`${analytics?.overview?.progressPercentage || 0}%`} />
        <MetricCard
          label="Average completion time"
          value={formatHours(analytics?.overview?.averageCompletionTime?.averageHours)}
        />
      </div>

      <Panel className="mt-8">
        <h2 className="text-xl font-bold">Progress</h2>
        <p className="text-slate-400 mt-2">
          Percentage of completed tasks in this project.
        </p>

        <div className="mt-6">
          <ProgressRow
            label="Completed"
            value={`${analytics?.overview?.progressPercentage || 0}%`}
            percent={analytics?.overview?.progressPercentage || 0}
          />
        </div>
      </Panel>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <ChartCard
          title="Tasks by status"
          items={analytics?.tasksByStatus || []}
          labelKey="status"
          maxCount={maxCount(analytics?.tasksByStatus || [])}
        />

        <ChartCard
          title="Tasks by priority"
          items={analytics?.tasksByPriority || []}
          labelKey="priority"
          maxCount={maxCount(analytics?.tasksByPriority || [])}
        />
      </div>

      <Panel className="mt-8">
        <h2 className="text-xl font-bold">Completed tasks per week</h2>
        <p className="text-slate-400 mt-2">
          Weekly task completion trend.
        </p>

        {analytics?.completedPerWeek?.length === 0 ? (
          <EmptyState message="No completed task data yet." />
        ) : (
          <div className="mt-6 space-y-4">
            {analytics?.completedPerWeek?.map((item) => (
              <ProgressRow
                key={item.label}
                label={item.label}
                value={item.count}
                percent={(item.count / maxCount(analytics.completedPerWeek)) * 100}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel className="mt-8">
        <h2 className="text-xl font-bold">Workload by member</h2>
        <p className="text-slate-400 mt-2">
          Task load and completion rate for each project member.
        </p>

        {analytics?.workloadByMember?.length === 0 ? (
          <EmptyState message="No workload data yet." />
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics?.workloadByMember?.map((item) => (
              <div
                key={item.user._id}
                className="rounded-xl bg-slate-950 border border-slate-800 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold">{item.user.name}</h3>
                    <p className="text-sm text-slate-400 mt-1">{item.user.email}</p>
                  </div>

                  <span className="rounded-full bg-blue-500/10 text-blue-300 px-3 py-1 text-xs">
                    {item.completionRate}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5 text-sm">
                  <SmallMetric label="Total" value={item.totalTasks} />
                  <SmallMetric label="Active" value={item.activeTasks} />
                  <SmallMetric label="Completed" value={item.completedTasks} />
                  <SmallMetric label="Overdue" value={item.overdueTasks} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}

function MetricCard({ label, value }) {
  return (
    <Panel>
      <p className="text-sm text-slate-400">{label}</p>
      <p className="text-3xl font-bold mt-2">{value}</p>
    </Panel>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 p-3">
      <p className="text-slate-500">{label}</p>
      <p className="font-bold mt-1">{value}</p>
    </div>
  );
}

function ChartCard({ title, items, labelKey, maxCount }) {
  return (
    <Panel>
      <h2 className="text-xl font-bold">{title}</h2>

      {items.length === 0 ? (
        <EmptyState message="No data yet." />
      ) : (
        <div className="mt-6 space-y-4">
          {items.map((item) => (
            <ProgressRow
              key={item[labelKey]}
              label={item[labelKey]}
              value={item.count}
              percent={(item.count / maxCount) * 100}
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

function ProgressRow({ label, value, percent }) {
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-2">
        <span className="capitalize text-slate-300">{label}</span>
        <span className="text-slate-400">{value}</span>
      </div>

      <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500"
          style={{
            width: `${percent}%`
          }}
        />
      </div>
    </div>
  );
}
