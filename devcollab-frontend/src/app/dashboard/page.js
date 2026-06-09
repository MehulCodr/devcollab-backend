"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function DashboardPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError("");

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

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const handleCreateOrganization = async (event) => {
    event.preventDefault();
    setError("");
    setCreating(true);

    try {
      await apiRequest("/organizations", {
        method: "POST",
        body: JSON.stringify(form)
      });

      setForm({
        name: "",
        description: ""
      });

      await loadDashboard();
    } catch (error) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <AppShell
      title="Dashboard"
      description="Manage your workspaces, projects, tasks, notifications, and analytics."
    >
      {error && (
        <p className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel>
          <p className="text-sm text-slate-400">Logged in as</p>
          <h2 className="text-xl font-bold mt-2">{user?.name}</h2>
          <p className="text-slate-400 mt-1">{user?.email}</p>
        </Panel>

        <Panel className="lg:col-span-2">
          <h2 className="text-xl font-bold">Create organization</h2>
          <p className="text-slate-400 mt-2">
            Organizations are workspaces where your projects, members, tasks, files, and analytics live.
          </p>

          <form onSubmit={handleCreateOrganization} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Organization name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="DevCollab Team"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Main workspace for our collaboration project"
                rows={3}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create organization"}
            </button>
          </form>
        </Panel>
      </div>

      <Panel className="mt-8">
        <div>
          <h2 className="text-xl font-bold">Your organizations</h2>
          <p className="text-slate-400 mt-2">
            Select an organization to manage projects and members.
          </p>
        </div>

        {organizations.length === 0 ? (
          <EmptyState message="No organizations yet. Create your first one above." />
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {organizations.map((item) => (
              <Link
                key={item.membershipId}
                href={`/organizations/${item.organization._id}`}
                className="rounded-xl border border-slate-800 bg-slate-950 p-5 hover:border-blue-500 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg">{item.organization.name}</h3>
                    <p className="text-slate-400 mt-1">
                      {item.organization.description || "No description"}
                    </p>
                  </div>

                  <Badge variant="blue">{item.role}</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
