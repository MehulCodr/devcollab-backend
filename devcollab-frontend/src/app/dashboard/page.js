"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Card from "@/components/ui/Card";
import StatCard from "@/components/ui/StatCard";
import {
  Building2,
  FolderKanban,
  CheckSquare,
  Bell,
  Activity,
  ArrowRight
} from "lucide-react";

export default function DashboardOverviewPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);

  // We use mock stats for some of the overview until cross-org APIs are added
  const stats = {
    projects: 12,
    tasks: 45,
    notifications: 3
  };

  const recentActivity = [
    { id: 1, text: "You were assigned to task 'Implement Login API'", time: "2 hours ago", type: "task" },
    { id: 2, text: "Sarah created a new project 'Q3 Marketing site'", time: "5 hours ago", type: "project" },
    { id: 3, text: "Organization 'Acme Corp' settings updated", time: "1 day ago", type: "org" },
    { id: 4, text: "You completed task 'Fix navbar spacing'", time: "2 days ago", type: "task" }
  ];

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [userResponse, organizationsResponse] = await Promise.all([
        apiRequest("/auth/me"),
        apiRequest("/organizations")
      ]);

      setUser(userResponse.data.user);
      setOrganizations(organizationsResponse.data.organizations || []);
    } catch (error) {
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadDashboard);
  }, []);

  if (loading) {
    return (
      <AppShell title="Overview">
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-400">Loading overview...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`Welcome back, ${user?.name || "Developer"}`}
      description="Here's what's happening across your workspaces today."
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Organizations"
          value={organizations.length}
          icon={Building2}
          color="blue"
        />
        <StatCard
          title="Active Projects"
          value={stats.projects}
          icon={FolderKanban}
          color="purple"
        />
        <StatCard
          title="Pending Tasks"
          value={stats.tasks}
          icon={CheckSquare}
          color="amber"
          trend="up"
          trendValue="12%"
        />
        <StatCard
          title="Unread Alerts"
          value={stats.notifications}
          icon={Bell}
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                <h2 className="text-xl font-bold">Recent Activity</h2>
              </div>
              <Link href="/notifications" className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start gap-4 p-4 rounded-lg bg-slate-900/50 border border-slate-800/50">
                  <div className={`p-2 rounded-full ${
                    activity.type === 'task' ? 'bg-amber-500/10 text-amber-400' :
                    activity.type === 'project' ? 'bg-purple-500/10 text-purple-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {activity.type === 'task' ? <CheckSquare className="w-4 h-4" /> :
                     activity.type === 'project' ? <FolderKanban className="w-4 h-4" /> :
                     <Building2 className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-200">{activity.text}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Link href="/organizations" className="flex items-center justify-between p-3 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800">
                <span className="text-sm font-medium">Create workspace</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link href="/projects" className="flex items-center justify-between p-3 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800">
                <span className="text-sm font-medium">New project</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link href="/tasks" className="flex items-center justify-between p-3 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800">
                <span className="text-sm font-medium">View board</span>
                <ArrowRight className="w-4 h-4 text-slate-500" />
              </Link>
              <Link href="/ai-assistant" className="flex items-center justify-between p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors border border-blue-500/30">
                <span className="text-sm font-medium text-blue-400">Ask AI Assistant</span>
                <ArrowRight className="w-4 h-4 text-blue-400" />
              </Link>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold mb-4">Your Workspaces</h2>
            {organizations.length === 0 ? (
              <p className="text-sm text-slate-500">No organizations found.</p>
            ) : (
              <div className="space-y-3">
                {organizations.slice(0, 3).map((item) => (
                  <Link
                    key={item.membershipId}
                    href={`/organizations/${item.organization._id}`}
                    className="flex items-center gap-3 p-3 rounded-lg bg-slate-900 hover:bg-slate-800 transition-colors border border-slate-800"
                  >
                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                      {item.organization.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 truncate">
                      <p className="text-sm font-medium truncate">{item.organization.name}</p>
                      <p className="text-xs text-slate-500">{item.role}</p>
                    </div>
                  </Link>
                ))}
                {organizations.length > 3 && (
                  <Link href="/organizations" className="block text-center text-sm text-blue-400 hover:text-blue-300 mt-2">
                    View all {organizations.length} workspaces
                  </Link>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
