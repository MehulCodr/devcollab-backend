"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import { Building2, Plus } from "lucide-react";

export default function OrganizationsPage() {
  const router = useRouter();

  const [organizations, setOrganizations] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: ""
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiRequest("/organizations");
      setOrganizations(response.data.organizations || []);
    } catch (error) {
      setError(error.message || "Failed to load organizations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadOrganizations);
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

      await loadOrganizations();
    } catch (error) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Organizations">
        <div className="flex h-64 items-center justify-center">
          <p className="text-slate-400">Loading organizations...</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Organizations"
      description="Manage your workspaces and team collaboration hubs."
    >
      {error && (
        <p className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Your organizations</h2>
            <Badge variant="blue">{organizations.length} Workspaces</Badge>
          </div>

          {organizations.length === 0 ? (
            <EmptyState message="No organizations yet. Create your first one to get started." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {organizations.map((item) => (
                <Link
                  key={item.membershipId}
                  href={`/organizations/${item.organization._id}`}
                  className="group block h-full"
                >
                  <Card className="h-full transition-colors group-hover:border-blue-500 group-hover:bg-slate-900/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{item.organization.name}</h3>
                        </div>
                      </div>
                      <Badge variant="blue">{item.role}</Badge>
                    </div>
                    <p className="text-slate-400 mt-4 text-sm line-clamp-2">
                      {item.organization.description || "No description provided."}
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <div className="rounded-lg bg-slate-800 p-1.5">
                <Plus className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold">Create new</h2>
            </div>
            
            <p className="text-sm text-slate-400 mb-6">
              Create a new workspace for your team to manage projects and tasks together.
            </p>

            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Organization name
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Acme Corp"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
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
                  placeholder="What is this workspace for?"
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={creating}
                className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60 transition-colors"
              >
                {creating ? "Creating..." : "Create Organization"}
              </button>
            </form>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
