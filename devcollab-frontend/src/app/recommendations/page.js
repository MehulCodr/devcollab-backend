"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";

// ─── Constants ────────────────────────────────────────────────────────────────

const MATCH_TIER_CONFIG = {
  excellent: { label: "Excellent Match",  color: "#4ade80", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.30)",  dot: "#22c55e" },
  good:      { label: "Good Match",       color: "#60a5fa", bg: "rgba(96,165,250,0.10)", border: "rgba(96,165,250,0.30)", dot: "#3b82f6" },
  fair:      { label: "Fair Match",       color: "#fbbf24", bg: "rgba(251,191,36,0.10)", border: "rgba(251,191,36,0.30)", dot: "#f59e0b" },
  low:       { label: "Low Match",        color: "#94a3b8", bg: "rgba(148,163,184,0.06)",border: "rgba(148,163,184,0.15)",dot: "#64748b" }
};

const FACTOR_CONFIG = [
  { key: "skillMatch",    label: "Skills",       icon: "⚡", color: "#a78bfa", max: 30 },
  { key: "interestMatch", label: "Interests",    icon: "💡", color: "#60a5fa", max: 20 },
  { key: "activityScore", label: "Activity",     icon: "🔥", color: "#fb923c", max: 15 },
  { key: "availability",  label: "Availability", icon: "🕐", color: "#34d399", max: 15 },
  { key: "roleFit",       label: "Role Fit",     icon: "🎯", color: "#f472b6", max: 10 },
  { key: "openness",      label: "Openness",     icon: "🚪", color: "#fbbf24", max: 10 }
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function MatchBadge({ tier }) {
  const cfg = MATCH_TIER_CONFIG[tier] || MATCH_TIER_CONFIG.low;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: "5px",
        padding: "3px 10px", borderRadius: "20px",
        fontSize: "11px", fontWeight: 700, letterSpacing: "0.04em",
        color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`
      }}
    >
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
      {cfg.label}
    </span>
  );
}

function ScoreMeter({ score, maxScore = 100 }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  const color =
    pct >= 75 ? "#4ade80" :
    pct >= 50 ? "#60a5fa" :
    pct >= 25 ? "#fbbf24" : "#94a3b8";

  return (
    <div style={{ position: "relative", width: "60px", height: "60px" }}>
      <svg viewBox="0 0 60 60" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="30" cy="30" r="24" fill="none"
          stroke={color} strokeWidth="6"
          strokeDasharray={`${2 * Math.PI * 24}`}
          strokeDashoffset={`${2 * Math.PI * 24 * (1 - pct / 100)}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "center"
      }}>
        <span style={{ fontSize: "13px", fontWeight: 800, color }}>{score}</span>
      </div>
    </div>
  );
}

function FactorBar({ factor, score }) {
  const pct = Math.min((score / factor.max) * 100, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
      <span style={{ fontSize: "11px", width: "14px", textAlign: "center" }}>{factor.icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
          <span style={{ fontSize: "10px", color: "#64748b" }}>{factor.label}</span>
          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 600 }}>
            {score}/{factor.max}
          </span>
        </div>
        <div style={{ height: "4px", borderRadius: "2px", background: "rgba(255,255,255,0.06)" }}>
          <div style={{ height: "100%", width: `${pct}%`, borderRadius: "2px", background: factor.color, transition: "width 0.6s ease" }} />
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ rec, onExplain, explainLoading }) {
  const { project, score, matchTier, scoreBreakdown, context, alreadyMember } = rec;
  const cfg = MATCH_TIER_CONFIG[matchTier] || MATCH_TIER_CONFIG.low;
  const [showFactors, setShowFactors] = useState(false);

  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px solid ${showFactors ? cfg.border : "rgba(255,255,255,0.08)"}`,
        background: "linear-gradient(145deg, rgba(15,23,42,0.98) 0%, rgba(15,23,42,0.85) 100%)",
        overflow: "hidden",
        backdropFilter: "blur(16px)",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: showFactors ? `0 0 0 1px ${cfg.border}, 0 8px 32px rgba(0,0,0,0.3)` : "0 4px 16px rgba(0,0,0,0.2)"
      }}
    >
      {/* Card header */}
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
              <MatchBadge tier={matchTier} />
              {alreadyMember && (
                <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "10px", background: "rgba(255,255,255,0.06)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Already member
                </span>
              )}
            </div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, color: "#f1f5f9", marginBottom: "4px", lineHeight: "1.3" }}>
              {project.name}
            </h3>
            <p style={{ fontSize: "13px", color: "#64748b" }}>
              {project.organization?.name}
            </p>
          </div>
          <ScoreMeter score={score} maxScore={100} />
        </div>

        {project.description && (
          <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: "1.6", marginTop: "10px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {project.description}
          </p>
        )}

        {/* Context pills */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
          {context.openTaskCount > 0 && (
            <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(251,191,36,0.10)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.20)" }}>
              📋 {context.openTaskCount} open tasks
            </span>
          )}
          {context.recentTaskCount > 0 && (
            <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(249,115,22,0.10)", color: "#fb923c", border: "1px solid rgba(249,115,22,0.20)" }}>
              🔥 {context.recentTaskCount} tasks this month
            </span>
          )}
          {context.activeMemberCount > 0 && (
            <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(96,165,250,0.10)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.20)" }}>
              👥 {context.activeMemberCount} members
            </span>
          )}
          {context.matchedSkills?.length > 0 && (
            <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(167,139,250,0.10)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.20)" }}>
              ⚡ {context.matchedSkills.slice(0, 2).join(", ")} match
            </span>
          )}
        </div>
      </div>

      {/* Expandable factor breakdown */}
      {showFactors && (
        <div style={{ padding: "16px 20px 0", borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "14px" }}>
          <p style={{ fontSize: "10px", color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
            Score Breakdown
          </p>
          {FACTOR_CONFIG.map((f) => (
            <FactorBar key={f.key} factor={f} score={scoreBreakdown[f.key] || 0} />
          ))}
          {context.matchedSkills?.length > 0 && (
            <div style={{ marginTop: "10px" }}>
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "5px" }}>Matched skills</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {context.matchedSkills.map((s) => (
                  <span key={s} style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "5px", background: "rgba(167,139,250,0.12)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)" }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
          {context.matchedInterests?.length > 0 && (
            <div style={{ marginTop: "8px" }}>
              <p style={{ fontSize: "10px", color: "#475569", marginBottom: "5px" }}>Matched interests</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                {context.matchedInterests.map((i) => (
                  <span key={i} style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "5px", background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)" }}>
                    {i}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Card footer */}
      <div style={{ display: "flex", gap: "8px", padding: "14px 20px 16px", marginTop: showFactors ? "14px" : "0" }}>
        <button
          onClick={() => setShowFactors((v) => !v)}
          style={{
            flex: 1, padding: "9px 0", borderRadius: "10px", fontSize: "12px", fontWeight: 600,
            cursor: "pointer", transition: "all 0.2s",
            border: `1px solid ${showFactors ? "rgba(167,139,250,0.4)" : "rgba(255,255,255,0.08)"}`,
            background: showFactors ? "rgba(167,139,250,0.08)" : "rgba(255,255,255,0.03)",
            color: showFactors ? "#a78bfa" : "#64748b"
          }}
        >
          {showFactors ? "Hide breakdown" : "Why this?"}
        </button>

        {!alreadyMember && (
          <Link
            href={`/organizations/${project.organization?._id}`}
            style={{
              flex: 2, padding: "9px 0", borderRadius: "10px", fontSize: "12px", fontWeight: 700,
              cursor: "pointer", transition: "all 0.2s",
              border: "none",
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              color: "#fff", textDecoration: "none",
              display: "flex", alignItems: "center", justifyContent: "center", gap: "6px"
            }}
          >
            View project →
          </Link>
        )}
      </div>
    </div>
  );
}

// ─── Filter bar ───────────────────────────────────────────────────────────────

function FilterBar({ filter, setFilter }) {
  const tiers = ["all", "excellent", "good", "fair"];
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
      {tiers.map((t) => {
        const active = filter === t;
        const cfg = t !== "all" ? MATCH_TIER_CONFIG[t] : null;
        return (
          <button
            key={t}
            onClick={() => setFilter(t)}
            style={{
              padding: "7px 16px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
              cursor: "pointer", transition: "all 0.2s",
              border: active ? `1px solid ${cfg?.border || "rgba(255,255,255,0.25)"}` : "1px solid rgba(255,255,255,0.08)",
              background: active ? (cfg?.bg || "rgba(255,255,255,0.08)") : "rgba(255,255,255,0.03)",
              color: active ? (cfg?.color || "#e2e8f0") : "#64748b"
            }}
          >
            {t === "all" ? "All projects" : MATCH_TIER_CONFIG[t].label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Empty / profile prompt ───────────────────────────────────────────────────

function ProfilePrompt() {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>🧩</div>
      <h3 style={{ fontSize: "20px", fontWeight: 700, color: "#f1f5f9", marginBottom: "8px" }}>
        Complete your developer profile
      </h3>
      <p style={{ fontSize: "14px", color: "#64748b", maxWidth: "400px", margin: "0 auto 24px", lineHeight: "1.6" }}>
        Add your skills, interests, and availability to get personalised project recommendations.
      </p>
      <Link
        href="/profile"
        style={{
          display: "inline-block", padding: "11px 28px", borderRadius: "12px",
          background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
          color: "#fff", fontWeight: 700, fontSize: "14px", textDecoration: "none",
          transition: "opacity 0.2s"
        }}
      >
        Complete profile →
      </Link>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecommendationsPage() {
  const router = useRouter();
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [filter, setFilter]       = useState("all");
  const [limit, setLimit]         = useState(10);
  const [generatedAt, setGeneratedAt] = useState(null);

  const loadRecommendations = useCallback(async (newLimit = limit) => {
    try {
      setLoading(true);
      setError("");
      const res = await apiRequest(`/recommendations/projects?limit=${newLimit}`);
      setRecommendations(res.data.recommendations || []);
      setGeneratedAt(res.data.generatedAt);
    } catch (err) {
      if (err.message?.toLowerCase().includes("unauthorized")) {
        router.push("/");
        return;
      }
      setError(err.message || "Failed to load recommendations");
    } finally {
      setLoading(false);
    }
  }, [limit, router]);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const filtered = filter === "all"
    ? recommendations
    : recommendations.filter((r) => r.matchTier === filter);

  const tierCounts = recommendations.reduce((acc, r) => {
    acc[r.matchTier] = (acc[r.matchTier] || 0) + 1;
    return acc;
  }, {});

  return (
    <AppShell
      title="Project Recommendations"
      description="Personalised projects matched to your skills, interests, and availability."
      backHref="/dashboard"
      backLabel="Back to dashboard"
    >
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .rec-card { animation: fadeInUp 0.4s ease both; }
      `}</style>

      {/* ── Hero header ───────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: "20px",
          background: "linear-gradient(135deg, rgba(37,99,235,0.15) 0%, rgba(124,58,237,0.12) 50%, rgba(16,185,129,0.10) 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "28px 32px",
          marginBottom: "28px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "200px", height: "200px", borderRadius: "50%", background: "rgba(124,58,237,0.06)", filter: "blur(40px)" }} />
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <span style={{ fontSize: "28px" }}>🎯</span>
            <h1 style={{ fontSize: "24px", fontWeight: 800, color: "#f1f5f9" }}>
              Projects for You
            </h1>
          </div>
          <p style={{ fontSize: "14px", color: "#94a3b8", maxWidth: "600px", lineHeight: "1.6" }}>
            Ranked by skill match, activity, availability, and role fit across all your organisations.
          </p>

          {!loading && recommendations.length > 0 && (
            <div style={{ display: "flex", gap: "20px", marginTop: "16px", flexWrap: "wrap" }}>
              {Object.entries(tierCounts).map(([tier, count]) => {
                const cfg = MATCH_TIER_CONFIG[tier];
                if (!cfg) return null;
                return (
                  <div key={tier} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: cfg.dot, display: "inline-block" }} />
                    <span style={{ fontSize: "12px", color: "#64748b" }}>{count} {cfg.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Controls bar ──────────────────────────────────────────────── */}
      {!loading && recommendations.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <FilterBar filter={filter} setFilter={setFilter} />
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {generatedAt && (
              <span style={{ fontSize: "11px", color: "#334155" }}>
                Generated {new Date(generatedAt).toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => loadRecommendations()}
              style={{
                padding: "7px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 600,
                border: "1px solid rgba(96,165,250,0.3)", background: "rgba(96,165,250,0.08)",
                color: "#60a5fa", cursor: "pointer"
              }}
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      )}

      {/* ── Loading state ──────────────────────────────────────────────── */}
      {loading && (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          <div style={{
            width: "36px", height: "36px",
            border: "3px solid rgba(255,255,255,0.06)",
            borderTop: "3px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px"
          }} />
          <p style={{ fontSize: "14px", color: "#64748b" }}>Finding your best-fit projects...</p>
        </div>
      )}

      {/* ── Error ──────────────────────────────────────────────────────── */}
      {error && !loading && (
        <div style={{ padding: "16px 20px", borderRadius: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "20px" }}>
          <p style={{ fontSize: "14px", color: "#f87171" }}>{error}</p>
        </div>
      )}

      {/* ── Empty — no profile ─────────────────────────────────────────── */}
      {!loading && !error && recommendations.length === 0 && (
        <div style={{ borderRadius: "18px", border: "1px solid rgba(255,255,255,0.08)", background: "rgba(15,23,42,0.8)" }}>
          <ProfilePrompt />
        </div>
      )}

      {/* ── Recommendation grid ────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "16px" }}>
          {filtered.map((rec, index) => (
            <div key={rec.project._id} className="rec-card" style={{ animationDelay: `${index * 0.05}s` }}>
              <ProjectCard rec={rec} />
            </div>
          ))}
        </div>
      )}

      {/* ── Filtered empty ─────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && recommendations.length > 0 && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <p style={{ fontSize: "14px", color: "#64748b" }}>
            No {filter} match projects. Try a different filter.
          </p>
        </div>
      )}

      {/* ── Load more ──────────────────────────────────────────────────── */}
      {!loading && recommendations.length >= limit && (
        <div style={{ textAlign: "center", marginTop: "28px" }}>
          <button
            onClick={() => {
              const newLimit = limit + 10;
              setLimit(newLimit);
              loadRecommendations(newLimit);
            }}
            style={{
              padding: "11px 28px", borderRadius: "12px", fontSize: "13px", fontWeight: 600,
              border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)",
              color: "#94a3b8", cursor: "pointer", transition: "all 0.2s"
            }}
          >
            Load more projects
          </button>
        </div>
      )}

      {/* ── Score weights legend ───────────────────────────────────────── */}
      {!loading && recommendations.length > 0 && (
        <div style={{
          marginTop: "40px", padding: "20px 24px", borderRadius: "16px",
          border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)"
        }}>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "14px" }}>
            How we rank projects
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
            {FACTOR_CONFIG.map((f) => (
              <div key={f.key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", background: f.color, display: "inline-block" }} />
                <span style={{ fontSize: "11px", color: "#475569" }}>{f.icon} {f.label} ({f.max}pts)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </AppShell>
  );
}
