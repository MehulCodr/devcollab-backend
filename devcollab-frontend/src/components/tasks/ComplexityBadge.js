"use client";

/**
 * ComplexityBadge
 * A compact pill badge that displays the predicted complexity of a task.
 *
 * Props:
 *   complexity  – "low" | "medium" | "high" | "critical"
 *   estimatedHours – number
 *   confidence  – 0–1
 *   size        – "sm" | "md" (default "md")
 */

const COMPLEXITY_CONFIG = {
  low: {
    label: "LOW",
    bg: "rgba(34,197,94,0.12)",
    border: "rgba(34,197,94,0.35)",
    text: "#4ade80",
    bar: "#22c55e",
    icon: "✦"
  },
  medium: {
    label: "MEDIUM",
    bg: "rgba(251,191,36,0.12)",
    border: "rgba(251,191,36,0.35)",
    text: "#fbbf24",
    bar: "#f59e0b",
    icon: "◈"
  },
  high: {
    label: "HIGH",
    bg: "rgba(249,115,22,0.12)",
    border: "rgba(249,115,22,0.35)",
    text: "#fb923c",
    bar: "#f97316",
    icon: "◆"
  },
  critical: {
    label: "CRITICAL",
    bg: "rgba(239,68,68,0.12)",
    border: "rgba(239,68,68,0.35)",
    text: "#f87171",
    bar: "#ef4444",
    icon: "⬟"
  }
};

export default function ComplexityBadge({
  complexity = "medium",
  estimatedHours,
  confidence,
  size = "md"
}) {
  const cfg = COMPLEXITY_CONFIG[complexity] || COMPLEXITY_CONFIG.medium;
  const confidencePct = confidence != null ? Math.round(confidence * 100) : null;

  const isSmall = size === "sm";

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        borderRadius: isSmall ? "8px" : "12px",
        border: `1px solid ${cfg.border}`,
        background: cfg.bg,
        overflow: "hidden",
        minWidth: isSmall ? "72px" : "88px",
        fontFamily: "inherit"
      }}
      title={`Complexity: ${cfg.label}${estimatedHours != null ? ` · ~${estimatedHours}h` : ""}${confidencePct != null ? ` · ${confidencePct}% confidence` : ""}`}
    >
      {/* Main label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: isSmall ? "4px" : "6px",
          padding: isSmall ? "3px 8px" : "5px 10px"
        }}
      >
        <span
          style={{
            fontSize: isSmall ? "9px" : "10px",
            color: cfg.text,
            lineHeight: 1
          }}
        >
          {cfg.icon}
        </span>
        <span
          style={{
            fontSize: isSmall ? "9px" : "10px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: cfg.text,
            lineHeight: 1
          }}
        >
          {cfg.label}
        </span>
        {estimatedHours != null && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: isSmall ? "9px" : "10px",
              color: cfg.text,
              opacity: 0.8,
              fontWeight: 500,
              lineHeight: 1
            }}
          >
            ~{estimatedHours}h
          </span>
        )}
      </div>

      {/* Confidence bar */}
      {confidencePct != null && (
        <div
          style={{
            height: "3px",
            background: "rgba(255,255,255,0.06)",
            position: "relative"
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${confidencePct}%`,
              background: cfg.bar,
              borderRadius: "0 2px 2px 0",
              transition: "width 0.6s ease"
            }}
          />
        </div>
      )}
    </div>
  );
}
