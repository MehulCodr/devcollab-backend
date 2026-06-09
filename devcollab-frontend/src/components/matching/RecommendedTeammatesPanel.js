"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import Panel from "@/components/ui/Panel";

export default function RecommendedTeammatesPanel({ projectId, onMemberAdded }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addingUserId, setAddingUserId] = useState("");
  const [error, setError] = useState("");

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(`/matching/projects/${projectId}/developers`);
      setRecommendations(response.data.recommendations || []);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      Promise.resolve().then(loadRecommendations);
    }
  }, [projectId]);

  const handleAddMember = async (recommendation) => {
    setAddingUserId(recommendation.user?._id);
    setError("");

    try {
      await apiRequest(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({
          email: recommendation.user?.email,
          role: "developer"
        })
      });

      await Promise.all([loadRecommendations(), onMemberAdded?.()]);
    } catch (error) {
      setError(error.message);
    } finally {
      setAddingUserId("");
    }
  };

  return (
    <Panel>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">Recommended teammates</h2>
          <p className="text-slate-400 mt-2">Ranked by skill, interest, availability, workload, and history.</p>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500 mt-5">Loading recommendations...</p>
      ) : recommendations.length === 0 ? (
        <EmptyState message="No teammate recommendations available." />
      ) : (
        <div className="mt-6 space-y-4">
          {recommendations.map((recommendation) => (
            <div
              key={recommendation.user?._id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-bold">{recommendation.user?.name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{recommendation.user?.email}</p>
                </div>

                <Badge variant="green">{recommendation.matchScore}%</Badge>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <SmallMetric label="Hours" value={`${recommendation.profile?.availabilityHoursPerWeek || 0}/wk`} />
                <SmallMetric label="Workload" value={recommendation.activeWorkload} />
                <SmallMetric label="Level" value={recommendation.profile?.experienceLevel || "junior"} />
                <SmallMetric label="Role" value={recommendation.organizationRole} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {(recommendation.reasons?.matchedSkills || []).slice(0, 5).map((skill) => (
                  <Badge key={skill} variant="blue">
                    {skill}
                  </Badge>
                ))}

                {(recommendation.reasons?.matchedInterests || []).slice(0, 3).map((interest) => (
                  <Badge key={interest}>{interest}</Badge>
                ))}
              </div>

              <button
                type="button"
                disabled={addingUserId === recommendation.user?._id}
                onClick={() => handleAddMember(recommendation)}
                className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold hover:bg-blue-500 disabled:opacity-60"
              >
                {addingUserId === recommendation.user?._id ? "Adding..." : "Add as developer"}
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function SmallMetric({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-900 border border-slate-800 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold text-slate-200 mt-1">{value}</p>
    </div>
  );
}
