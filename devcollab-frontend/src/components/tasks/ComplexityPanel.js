"use client";

import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/api";
import ComplexityBadge from "./ComplexityBadge";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COMPLEXITY_LEVELS = ["low", "medium", "high", "critical"];

const COMPLEXITY_META = {
  low:      { color: "#4ade80", label: "Low",      desc: "Straightforward, minimal unknowns" },
  medium:   { color: "#fbbf24", label: "Medium",   desc: "Moderate effort, some complexity" },
  high:     { color: "#fb923c", label: "High",     desc: "Significant effort, many moving parts" },
  critical: { color: "#f87171", label: "Critical", desc: "Very complex, high risk or urgency" }
};

const BREAKDOWN_LABELS = {
  priority:          "Priority weight",
  titleLength:       "Title complexity",
  descriptionLength: "Description depth",
  subtaskCount:      "Subtask count",
  labels:            "Label signals",
  historical:        "Historical data"
};

function ScoreBar({ label, score, maxScore = 5, color = "#60a5fa" }) {
  const pct = Math.min((score / maxScore) * 100, 100);
  return (
    <div style={{ marginBottom: "8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: "12px", color: "#cbd5e1", fontWeight: 600 }}>+{score}</span>
      </div>
      <div
        style={{
          height: "5px",
          borderRadius: "3px",
          background: "rgba(255,255,255,0.06)"
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "3px",
            background: color,
            transition: "width 0.5s ease"
          }}
        />
      </div>
    </div>
  );
}

function ConfidenceMeter({ confidence }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 80 ? "#4ade80" : pct >= 60 ? "#fbbf24" : "#fb923c";
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          position: "relative",
          width: "80px",
          height: "80px",
          margin: "0 auto"
        }}
      >
        <svg viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="32" fill="none"
            stroke={color} strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 32}`}
            strokeDashoffset={`${2 * Math.PI * 32 * (1 - confidence)}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <span style={{ fontSize: "16px", fontWeight: 700, color }}>{pct}%</span>
        </div>
      </div>
      <p style={{ fontSize: "11px", color: "#64748b", marginTop: "6px" }}>Confidence</p>
    </div>
  );
}

/** Shows heuristic vs Gemini signals side-by-side with blend bar */
function BlendSection({ blendInfo }) {
  if (!blendInfo || !blendInfo.geminiUsed) return null;

  const COMPLEXITY_COLOR = {
    low: "#4ade80", medium: "#fbbf24", high: "#fb923c", critical: "#f87171"
  };

  const hw = Math.round(blendInfo.heuristicWeight * 100);
  const gw = Math.round(blendInfo.geminiWeight * 100);

  return (
    <div
      style={{
        marginTop: "14px",
        padding: "12px",
        borderRadius: "10px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.025)"
      }}
    >
      <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
        Model Signals
      </p>

      {/* Two model cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        {/* Heuristic */}
        <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(96,165,250,0.07)", border: "1px solid rgba(96,165,250,0.18)" }}>
          <p style={{ fontSize: "9px", color: "#60a5fa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Heuristic</p>
          <p style={{ fontSize: "13px", fontWeight: 700, color: COMPLEXITY_COLOR[blendInfo.heuristicComplexity] || "#e2e8f0" }}>
            {blendInfo.heuristicComplexity?.toUpperCase()}
          </p>
          <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>~{blendInfo.heuristicHours}h</p>
          <p style={{ fontSize: "10px", color: "#60a5fa", marginTop: "4px", fontWeight: 600 }}>{hw}% weight</p>
        </div>

        {/* Gemini */}
        <div style={{ padding: "8px 10px", borderRadius: "8px", background: "rgba(52,211,153,0.07)", border: "1px solid rgba(52,211,153,0.18)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
            <p style={{ fontSize: "9px", color: "#34d399", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Gemini 2.5 Pro</p>
          </div>
          <p style={{ fontSize: "13px", fontWeight: 700, color: COMPLEXITY_COLOR[blendInfo.geminiComplexity] || "#e2e8f0" }}>
            {blendInfo.geminiComplexity?.toUpperCase()}
          </p>
          <p style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>~{blendInfo.geminiHours}h</p>
          <p style={{ fontSize: "10px", color: "#34d399", marginTop: "4px", fontWeight: 600 }}>{gw}% weight</p>
        </div>
      </div>

      {/* Blend bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontSize: "10px", color: "#475569" }}>Blend ratio</span>
          <span style={{ fontSize: "10px", color: "#475569" }}>{hw}% heuristic · {gw}% Gemini</span>
        </div>
        <div style={{ height: "6px", borderRadius: "4px", background: "rgba(255,255,255,0.06)", overflow: "hidden", display: "flex" }}>
          <div style={{ width: `${hw}%`, background: "#3b82f6", borderRadius: "4px 0 0 4px" }} />
          <div style={{ width: `${gw}%`, background: "#10b981", borderRadius: "0 4px 4px 0" }} />
        </div>
      </div>

      {/* Gemini rationale */}
      {blendInfo.geminiRationale && (
        <div style={{ marginTop: "10px", padding: "8px", borderRadius: "8px", background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.12)" }}>
          <p style={{ fontSize: "10px", color: "#475569", marginBottom: "3px", fontWeight: 600 }}>Gemini rationale</p>
          <p style={{ fontSize: "11px", color: "#94a3b8", lineHeight: "1.5" }}>{blendInfo.geminiRationale}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ComplexityPanel({ taskId }) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showActualForm, setShowActualForm] = useState(false);
  const [actualForm, setActualForm] = useState({
    actualComplexity: "medium",
    actualHours: "",
    actualNotes: ""
  });
  const [savingActual, setSavingActual] = useState(false);
  const [savedActual, setSavedActual] = useState(false);
  const [error, setError] = useState("");

  // ── Load prediction on mount ────────────────────────────────────────────────
  const loadPrediction = useCallback(async (forceRefresh = false) => {
    try {
      setError("");
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const url = forceRefresh
        ? `/tasks/${taskId}/complexity?refresh=true`
        : `/tasks/${taskId}/complexity`;

      const res = await apiRequest(url);
      setPrediction(res.data);
    } catch (err) {
      setError(err.message || "Failed to load complexity prediction");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (taskId) {
      loadPrediction();
    }
  }, [taskId, loadPrediction]);

  // ── Record actual ────────────────────────────────────────────────────────────
  const handleRecordActual = async (e) => {
    e.preventDefault();
    setSavingActual(true);
    setError("");

    try {
      await apiRequest(`/tasks/${taskId}/complexity/actual`, {
        method: "PATCH",
        body: JSON.stringify({
          actualComplexity: actualForm.actualComplexity,
          actualHours: actualForm.actualHours ? parseFloat(actualForm.actualHours) : undefined,
          actualNotes: actualForm.actualNotes || undefined,
          predictionId: prediction?.predictionId
        })
      });

      setSavedActual(true);
      setShowActualForm(false);
      setTimeout(() => setSavedActual(false), 3000);
    } catch (err) {
      setError(err.message || "Failed to record actual complexity");
    } finally {
      setSavingActual(false);
    }
  };

  // ── Breakdown rendering ──────────────────────────────────────────────────────
  const renderBreakdown = () => {
    if (!prediction?.breakdown) return null;
    const bd = prediction.breakdown;

    return (
      <div style={{ marginTop: "14px" }}>
        <p style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "10px" }}>
          Score Breakdown
        </p>
        {bd.priority != null && (
          <ScoreBar label="Priority weight" score={bd.priority} maxScore={3} color="#a78bfa" />
        )}
        {bd.titleLength != null && (
          <ScoreBar label="Title complexity" score={bd.titleLength} maxScore={2} color="#60a5fa" />
        )}
        {bd.descriptionLength != null && (
          <ScoreBar label="Description depth" score={bd.descriptionLength} maxScore={3} color="#34d399" />
        )}
        {bd.subtaskCount != null && (
          <ScoreBar label="Subtask count" score={bd.subtaskCount} maxScore={3} color="#fb923c" />
        )}
        {bd.labels?.score != null && (
          <ScoreBar label="Label signals" score={Math.max(bd.labels.score, 0)} maxScore={8} color="#f472b6" />
        )}
        {bd.historical?.score != null && bd.historical.score > 0 && (
          <ScoreBar label="Historical data" score={bd.historical.score} maxScore={4} color="#fbbf24" />
        )}

        {/* High complexity labels */}
        {bd.labels?.highComplexityLabels?.length > 0 && (
          <div style={{ marginTop: "10px" }}>
            <p style={{ fontSize: "11px", color: "#f87171", marginBottom: "4px" }}>⬆ High complexity signals</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {bd.labels.highComplexityLabels.map((l) => (
                <span key={l} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Low complexity labels */}
        {bd.labels?.lowComplexityLabels?.length > 0 && (
          <div style={{ marginTop: "8px" }}>
            <p style={{ fontSize: "11px", color: "#4ade80", marginBottom: "4px" }}>⬇ Low complexity signals</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {bd.labels.lowComplexityLabels.map((l) => (
                <span key={l} style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: "rgba(34,197,94,0.12)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.25)" }}>
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Historical data note */}
        {bd.historical?.avgHours != null && (
          <p style={{ fontSize: "11px", color: "#64748b", marginTop: "8px" }}>
            📊 Historical avg for similar tasks: ~{Math.round(bd.historical.avgHours * 10) / 10}h
          </p>
        )}

        {/* Total score */}
        <div style={{ marginTop: "12px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.04)", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>Total score</span>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "#e2e8f0" }}>{bd.totalScore} pts</span>
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.08)",
        background: "linear-gradient(135deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.8) 100%)",
        overflow: "hidden",
        backdropFilter: "blur(12px)"
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 20px",
          borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
          cursor: "pointer",
          userSelect: "none"
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "14px" }}>🧠</span>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "#f1f5f9" }}>
            Complexity AI
          </span>
          {prediction && !loading && (
            <ComplexityBadge
              complexity={prediction.complexity}
              estimatedHours={prediction.estimatedHours}
              confidence={prediction.confidence}
              size="sm"
            />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {prediction?.modelVersion && (
            <span style={{ fontSize: "10px", color: "#475569", fontFamily: "monospace" }}>
              {prediction.modelVersion}
            </span>
          )}
          <span style={{ color: "#475569", fontSize: "12px" }}>
            {expanded ? "▲" : "▼"}
          </span>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div style={{ padding: "20px" }}>
          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div
                style={{
                  width: "28px", height: "28px",
                  border: "2px solid rgba(255,255,255,0.08)",
                  borderTop: "2px solid #60a5fa",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                  margin: "0 auto 12px"
                }}
              />
              <p style={{ fontSize: "13px", color: "#64748b" }}>Analyzing task complexity...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div style={{ padding: "12px 14px", borderRadius: "10px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", marginBottom: "12px" }}>
              <p style={{ fontSize: "13px", color: "#f87171" }}>{error}</p>
            </div>
          )}

          {/* Prediction result */}
          {prediction && !loading && (
            <>
              {/* Top row: badge + hours + confidence ring */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "16px" }}>
                <div>
                  <ComplexityBadge
                    complexity={prediction.complexity}
                    estimatedHours={prediction.estimatedHours}
                    confidence={prediction.confidence}
                    size="md"
                  />
                  <p style={{ fontSize: "12px", color: "#64748b", marginTop: "8px" }}>
                    {COMPLEXITY_META[prediction.complexity]?.desc}
                  </p>
                  <div style={{ display: "flex", gap: "16px", marginTop: "10px" }}>
                    <div>
                      <p style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Est. Hours</p>
                      <p style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0" }}>
                        ~{prediction.estimatedHours}h
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: "10px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Range</p>
                      <p style={{ fontSize: "13px", fontWeight: 600, color: "#94a3b8" }}>
                        {prediction.breakdown?.hoursRange
                          ? `${prediction.breakdown.hoursRange.min}–${prediction.breakdown.hoursRange.max}h`
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
                <ConfidenceMeter confidence={prediction.confidence} />
              </div>

              {/* Context pills */}
              {prediction.context && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
                  {prediction.context.historicalTasksFound > 0 && (
                    <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
                      📚 {prediction.context.historicalTasksFound} historical tasks
                    </span>
                  )}
                  {prediction.context.githubLabelsFound > 0 && (
                    <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                      🐙 {prediction.context.githubLabelsFound} GitHub labels
                    </span>
                  )}
                  {prediction.context.developerHistoryAvailable && (
                    <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.2)" }}>
                      👤 Dev history
                    </span>
                  )}
                  {prediction.cached && (
                    <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "6px", background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.08)" }}>
                      ⚡ Cached
                    </span>
                  )}
                </div>
              )}

              {/* Model blend signals */}
              <BlendSection blendInfo={prediction.blendInfo} />

              {/* Score breakdown */}
              {renderBreakdown()}

              {/* Divider */}
              <div style={{ height: "1px", background: "rgba(255,255,255,0.06)", margin: "16px 0" }} />

              {/* Actions */}
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => loadPrediction(true)}
                  disabled={refreshing}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(96,165,250,0.3)",
                    background: "rgba(96,165,250,0.08)",
                    color: "#60a5fa",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: refreshing ? "not-allowed" : "pointer",
                    opacity: refreshing ? 0.6 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  {refreshing ? "Refreshing..." : "🔄 Refresh"}
                </button>

                <button
                  onClick={() => setShowActualForm((v) => !v)}
                  style={{
                    flex: 1,
                    padding: "9px 12px",
                    borderRadius: "10px",
                    border: "1px solid rgba(167,139,250,0.3)",
                    background: "rgba(167,139,250,0.08)",
                    color: "#a78bfa",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  {showActualForm ? "✕ Cancel" : "📝 Record Actual"}
                </button>
              </div>

              {/* Success message */}
              {savedActual && (
                <div style={{ marginTop: "10px", padding: "8px 12px", borderRadius: "8px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
                  <p style={{ fontSize: "12px", color: "#4ade80" }}>✓ Actual outcome saved for ML training</p>
                </div>
              )}

              {/* Record actual form */}
              {showActualForm && (
                <form
                  onSubmit={handleRecordActual}
                  style={{
                    marginTop: "14px",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid rgba(167,139,250,0.2)",
                    background: "rgba(167,139,250,0.04)"
                  }}
                >
                  <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "12px", fontWeight: 600 }}>
                    Record actual complexity (training data)
                  </p>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                      Actual complexity
                    </label>
                    <select
                      value={actualForm.actualComplexity}
                      onChange={(e) => setActualForm((f) => ({ ...f, actualComplexity: e.target.value }))}
                      style={{
                        width: "100%", padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#e2e8f0",
                        fontSize: "13px",
                        outline: "none"
                      }}
                    >
                      {COMPLEXITY_LEVELS.map((c) => (
                        <option key={c} value={c}>{COMPLEXITY_META[c].label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: "10px" }}>
                    <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                      Actual hours spent (optional)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      placeholder="e.g. 6.5"
                      value={actualForm.actualHours}
                      onChange={(e) => setActualForm((f) => ({ ...f, actualHours: e.target.value }))}
                      style={{
                        width: "100%", padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#e2e8f0",
                        fontSize: "13px",
                        outline: "none",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontSize: "11px", color: "#64748b", display: "block", marginBottom: "4px" }}>
                      Notes (optional)
                    </label>
                    <textarea
                      placeholder="Any notes on why it was harder/easier than predicted..."
                      rows={2}
                      value={actualForm.actualNotes}
                      onChange={(e) => setActualForm((f) => ({ ...f, actualNotes: e.target.value }))}
                      style={{
                        width: "100%", padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(0,0,0,0.3)",
                        color: "#e2e8f0",
                        fontSize: "13px",
                        outline: "none",
                        resize: "vertical",
                        fontFamily: "inherit",
                        boxSizing: "border-box"
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={savingActual}
                    style={{
                      width: "100%",
                      padding: "9px",
                      borderRadius: "8px",
                      border: "none",
                      background: savingActual
                        ? "rgba(167,139,250,0.3)"
                        : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "#fff",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: savingActual ? "not-allowed" : "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    {savingActual ? "Saving..." : "Save Actual Outcome"}
                  </button>
                </form>
              )}
            </>
          )}

          {/* No prediction yet (and not loading) */}
          {!prediction && !loading && !error && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: "13px", color: "#64748b" }}>No prediction available yet.</p>
              <button
                onClick={() => loadPrediction(true)}
                style={{
                  marginTop: "12px",
                  padding: "9px 16px",
                  borderRadius: "10px",
                  border: "none",
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Generate Prediction
              </button>
            </div>
          )}

          {/* ML-ready notice */}
          <div style={{ marginTop: "16px", padding: "8px 12px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <p style={{ fontSize: "10px", color: "#334155", lineHeight: "1.5" }}>
              🔬 <strong style={{ color: "#475569" }}>Hybrid AI</strong> · 70% heuristic rules + 30% Gemini 2.5 Pro. Every prediction is stored as ML training data.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
