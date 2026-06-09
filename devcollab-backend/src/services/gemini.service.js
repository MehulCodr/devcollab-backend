/**
 * gemini.service.js
 *
 * Calls Google Gemini 2.5 Pro via its OpenAI-compatible REST endpoint.
 * Uses the same `openai` npm package — no new dependency needed.
 *
 * Falls back gracefully (returns null) if:
 *   - GEMINI_API_KEY is not set
 *   - API call times out or returns an unexpected response
 *   - JSON parsing fails
 */

import OpenAI from "openai";
import { env } from "../config/env.js";

// ─── Gemini client (OpenAI-compatible endpoint) ───────────────────────────────
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL    = "gemini-2.5-pro";
const CALL_TIMEOUT_MS = 15_000; // 15 s — don't block the response too long

let geminiClient = null;
if (env.geminiApiKey && env.geminiApiKey !== "your_gemini_api_key_here") {
  geminiClient = new OpenAI({
    apiKey: env.geminiApiKey,
    baseURL: GEMINI_BASE_URL
  });
}

// ─── Prompt ───────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert software engineering project manager.
Given a task description, you must estimate its complexity and development effort.

Respond ONLY with a valid JSON object — no markdown, no explanation, just raw JSON.

Schema:
{
  "complexity": "low" | "medium" | "high" | "critical",
  "estimatedHours": <number, e.g. 4.5>,
  "confidence": <number 0.0–1.0>,
  "rationale": "<1-2 sentence explanation>"
}

Complexity definitions:
- low: trivial, <4h, well-understood scope
- medium: moderate, 4–8h, some uncertainty
- high: complex, 8–16h, significant unknowns or risk
- critical: very complex or high-risk, 16–40h+

Be calibrated and realistic. Do not over-inflate complexity.`;

const buildUserPrompt = (taskContext) => {
  const lines = [
    `Task Title: ${taskContext.title}`,
    `Description: ${taskContext.description || "(none)"}`,
    `Priority: ${taskContext.priority}`,
    `Labels: ${taskContext.labels?.join(", ") || "(none)"}`,
    `Subtask Count: ${taskContext.subtaskCount}`,
    `GitHub Issue Labels: ${taskContext.githubIssueLabels?.join(", ") || "(none)"}`
  ];

  if (taskContext.historicalAvgHours != null) {
    lines.push(`Historical avg hours for similar-label tasks: ${taskContext.historicalAvgHours.toFixed(1)}h (based on ${taskContext.historicalSampleSize} tasks)`);
  }

  if (taskContext.developerCompletionRate != null) {
    lines.push(`Assigned developer completion rate: ${Math.round(taskContext.developerCompletionRate * 100)}% (${taskContext.developerCompletedCount} tasks completed)`);
  }

  return lines.join("\n");
};

// ─── Type guard ───────────────────────────────────────────────────────────────

const VALID_COMPLEXITIES = new Set(["low", "medium", "high", "critical"]);

const isValidGeminiResponse = (data) => {
  return (
    data &&
    typeof data === "object" &&
    VALID_COMPLEXITIES.has(data.complexity) &&
    typeof data.estimatedHours === "number" &&
    data.estimatedHours > 0 &&
    typeof data.confidence === "number" &&
    data.confidence >= 0 &&
    data.confidence <= 1
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Calls Gemini 2.5 Pro to estimate task complexity.
 *
 * @param {object} taskContext  – processed feature context (from extractFeatures)
 * @returns {object|null}       – { complexity, estimatedHours, confidence, rationale } or null on failure
 */
export const getGeminiComplexityEstimate = async (taskContext) => {
  if (!geminiClient) {
    return null; // Gemini not configured — graceful fallback
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

  try {
    const response = await geminiClient.chat.completions.create(
      {
        model: GEMINI_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user",   content: buildUserPrompt(taskContext) }
        ],
        temperature: 0.2,     // low temperature for consistent, calibrated outputs
        max_tokens: 300
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const raw = response.choices?.[0]?.message?.content?.trim();
    if (!raw) return null;

    // Strip markdown code fences if present
    const jsonText = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(jsonText);

    if (!isValidGeminiResponse(parsed)) {
      console.warn("[GeminiService] Invalid response shape:", parsed);
      return null;
    }

    return {
      complexity:     parsed.complexity,
      estimatedHours: Math.max(0.5, Math.round(parsed.estimatedHours * 2) / 2),
      confidence:     Math.min(Math.max(parsed.confidence, 0), 1),
      rationale:      parsed.rationale || ""
    };
  } catch (err) {
    clearTimeout(timeout);

    if (err.name === "AbortError" || err.message?.includes("abort")) {
      console.warn("[GeminiService] Request timed out — falling back to heuristic");
    } else {
      console.warn("[GeminiService] API call failed:", err.message);
    }

    return null;
  }
};

export const isGeminiConfigured = () => geminiClient !== null;
