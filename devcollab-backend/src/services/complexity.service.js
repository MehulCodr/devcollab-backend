/**
 * complexity.service.js
 *
 * Hybrid task complexity prediction engine.
 *
 * BLENDING STRATEGY (70 / 30):
 *   - Heuristic score  → 70% weight (fast, deterministic, always available)
 *   - Gemini 2.5 Pro   → 30% weight (LLM reasoning, contextual)
 *
 * Both signals are computed in parallel. If Gemini is not configured or
 * its call fails/times-out, the system gracefully falls back to 100%
 * heuristic so prediction never fails.
 *
 * ML-ready: every prediction (inputs + both signals + final blend) is
 * persisted as a training record for future model development.
 *
 * Model version: hybrid-v1 (heuristic-v1 when Gemini unavailable)
 */

import { GithubTaskLink } from "../models/githubTaskLink.model.js";
import { Task } from "../models/task.model.js";
import { ComplexityPrediction } from "../models/complexityPrediction.model.js";
import { getGeminiComplexityEstimate, isGeminiConfigured } from "./gemini.service.js";

// ─── Blend weights ────────────────────────────────────────────────────────────
export const WEIGHTS = {
  heuristic: 0.70,
  gemini:    0.30
};

export const MODEL_VERSION_HYBRID   = "hybrid-v1";
export const MODEL_VERSION_HEURISTIC = "heuristic-v1";

// ─── Complexity ordering ──────────────────────────────────────────────────────
const COMPLEXITY_LEVELS = ["low", "medium", "high", "critical"];
const complexityToIndex = (c) => COMPLEXITY_LEVELS.indexOf(c);
const indexToComplexity = (i) => COMPLEXITY_LEVELS[Math.max(0, Math.min(3, Math.round(i)))];

// ─── High / medium / low complexity label dictionaries ────────────────────────
const HIGH_COMPLEXITY_LABELS = new Set([
  "bug", "security", "migration", "architecture", "refactor", "performance",
  "breaking-change", "critical", "urgent", "database", "infrastructure",
  "auth", "authentication", "authorization", "payment", "encryption", "data-loss"
]);

const MEDIUM_COMPLEXITY_LABELS = new Set([
  "feature", "enhancement", "improvement", "api", "integration", "ui",
  "ux", "frontend", "backend", "test", "testing"
]);

const LOW_COMPLEXITY_LABELS = new Set([
  "docs", "documentation", "chore", "typo", "style", "cleanup",
  "minor", "trivial", "copy", "wording"
]);

const PRIORITY_SCORES = { low: 0, medium: 1, high: 2, urgent: 3 };

const COMPLEXITY_THRESHOLDS = [
  { min: 10, complexity: "critical", hoursMin: 16, hoursMax: 40 },
  { min: 7,  complexity: "high",     hoursMin: 8,  hoursMax: 16 },
  { min: 4,  complexity: "medium",   hoursMin: 4,  hoursMax: 8  },
  { min: 0,  complexity: "low",      hoursMin: 1,  hoursMax: 3  }
];

// ─── Feature Extraction ───────────────────────────────────────────────────────

export const extractFeatures = ({
  task,
  githubLabels = [],
  historicalTasks = [],
  developerHistory = null
}) => {
  const titleLength       = (task.title || "").trim().length;
  const descriptionLength = (task.description || "").trim().length;
  const labels            = (task.labels || []).map((l) => l.toLowerCase());
  const subtaskCount      = (task.subtasks || []).length;
  const allGithubLabels   = githubLabels.map((l) => l.toLowerCase());

  let historicalAvgHours = null;
  let historicalSampleSize = 0;

  if (historicalTasks.length > 0) {
    const withHours = historicalTasks.filter(
      (t) => t._actualHours != null && t._actualHours > 0
    );
    if (withHours.length > 0) {
      historicalAvgHours =
        withHours.reduce((sum, t) => sum + t._actualHours, 0) / withHours.length;
      historicalSampleSize = withHours.length;
    } else {
      historicalSampleSize = historicalTasks.length;
    }
  }

  let developerCompletionRate = null;
  let developerCompletedCount = 0;
  if (developerHistory) {
    const { completed, total } = developerHistory;
    developerCompletedCount = completed;
    developerCompletionRate = total > 0 ? completed / total : null;
  }

  return {
    titleLength,
    descriptionLength,
    priority: task.priority || "medium",
    labelCount: labels.length,
    labels,
    subtaskCount,
    githubIssueLabels: allGithubLabels,
    historicalAvgHours,
    historicalSampleSize,
    developerCompletionRate,
    developerCompletedCount
  };
};

// ─── Heuristic Engine ─────────────────────────────────────────────────────────

export const predictComplexityHeuristic = (features) => {
  const breakdown = {};
  let score = 0;

  // 1. Priority
  const priorityScore = PRIORITY_SCORES[features.priority] ?? 1;
  breakdown.priority = priorityScore;
  score += priorityScore;

  // 2. Title length
  let titleScore = 0;
  if (features.titleLength > 80)      titleScore = 2;
  else if (features.titleLength > 50) titleScore = 1;
  breakdown.titleLength = titleScore;
  score += titleScore;

  // 3. Description length
  let descScore = 0;
  if (features.descriptionLength > 1000)      descScore = 3;
  else if (features.descriptionLength > 500)  descScore = 2;
  else if (features.descriptionLength > 150)  descScore = 1;
  breakdown.descriptionLength = descScore;
  score += descScore;

  // 4. Subtask count
  let subtaskScore = 0;
  if (features.subtaskCount > 8)      subtaskScore = 3;
  else if (features.subtaskCount > 5) subtaskScore = 2;
  else if (features.subtaskCount > 2) subtaskScore = 1;
  breakdown.subtaskCount = subtaskScore;
  score += subtaskScore;

  // 5. Label signals
  let labelScore = 0;
  const allLabels = [...features.labels, ...features.githubIssueLabels];
  const matchedHighLabels   = [];
  const matchedMediumLabels = [];
  const matchedLowLabels    = [];

  for (const label of allLabels) {
    if (HIGH_COMPLEXITY_LABELS.has(label)) {
      labelScore += 2;
      matchedHighLabels.push(label);
    } else if (MEDIUM_COMPLEXITY_LABELS.has(label)) {
      labelScore += 1;
      matchedMediumLabels.push(label);
    } else if (LOW_COMPLEXITY_LABELS.has(label)) {
      labelScore -= 1;
      matchedLowLabels.push(label);
    }
  }

  breakdown.labels = {
    score: labelScore,
    highComplexityLabels:   [...new Set(matchedHighLabels)],
    mediumComplexityLabels: [...new Set(matchedMediumLabels)],
    lowComplexityLabels:    [...new Set(matchedLowLabels)]
  };
  score += labelScore;

  // 6. Historical data
  let historicalScore   = 0;
  let historicalHoursHint = null;
  if (features.historicalAvgHours != null) {
    historicalHoursHint = features.historicalAvgHours;
    if      (features.historicalAvgHours >= 24) historicalScore = 4;
    else if (features.historicalAvgHours >= 12) historicalScore = 3;
    else if (features.historicalAvgHours >= 6)  historicalScore = 2;
    else if (features.historicalAvgHours >= 3)  historicalScore = 1;
  }
  breakdown.historical = { score: historicalScore, avgHours: historicalHoursHint };
  score += historicalScore;

  score = Math.max(0, score);

  // Map score → complexity
  const threshold = COMPLEXITY_THRESHOLDS.find((t) => score >= t.min);
  const { complexity, hoursMin, hoursMax } = threshold;

  // Hours estimate
  let estimatedHours;
  if (historicalHoursHint != null) {
    const heuristicMidpoint  = (hoursMin + hoursMax) / 2;
    const historicalWeight   = Math.min(features.historicalSampleSize / 5, 0.7);
    estimatedHours =
      historicalHoursHint * historicalWeight +
      heuristicMidpoint * (1 - historicalWeight);
  } else {
    estimatedHours = (hoursMin + hoursMax) / 2;
  }
  estimatedHours = Math.max(0.5, Math.round(estimatedHours * 2) / 2);

  // Confidence
  let confidence = 0.50;
  if      (features.historicalSampleSize >= 10) confidence += 0.35;
  else if (features.historicalSampleSize >= 5)  confidence += 0.25;
  else if (features.historicalSampleSize >= 2)  confidence += 0.15;
  else if (features.historicalSampleSize >= 1)  confidence += 0.08;
  if (features.developerCompletionRate != null && features.developerCompletedCount >= 3) confidence += 0.05;
  if      (features.labelCount >= 3) confidence += 0.05;
  else if (features.labelCount >= 1) confidence += 0.02;
  confidence = Math.min(Math.max(confidence, 0), 0.90);
  confidence = Math.round(confidence * 100) / 100;

  return {
    complexity,
    estimatedHours,
    confidence,
    score,
    breakdown: {
      ...breakdown,
      totalScore: score,
      hoursRange: { min: hoursMin, max: hoursMax }
    }
  };
};

// ─── Blending Logic ───────────────────────────────────────────────────────────

/**
 * Blends heuristic and Gemini predictions with configurable weights.
 *
 * Strategy:
 *   - Convert complexity to numeric index (0–3) for weighted averaging
 *   - Blend estimatedHours and confidence the same way
 *   - Snap blended complexity index back to nearest level
 *   - Cap confidence at 0.95 for hybrid model (LLM isn't perfect either)
 */
const blendPredictions = (heuristic, gemini) => {
  if (!gemini) {
    // Gemini unavailable — pure heuristic
    return {
      ...heuristic,
      blendInfo: {
        heuristicWeight: 1.0,
        geminiWeight:    0.0,
        geminiUsed:      false
      }
    };
  }

  const hw = WEIGHTS.heuristic;
  const gw = WEIGHTS.gemini;

  // Complexity: weighted average of numeric indices
  const hIndex = complexityToIndex(heuristic.complexity);
  const gIndex = complexityToIndex(gemini.complexity);
  const blendedIndex = hw * hIndex + gw * gIndex;
  const finalComplexity = indexToComplexity(blendedIndex);

  // Hours: weighted average
  const finalHours = Math.max(
    0.5,
    Math.round((hw * heuristic.estimatedHours + gw * gemini.estimatedHours) * 2) / 2
  );

  // Confidence: weighted average, boosted slightly by having two signals
  const rawConfidence = hw * heuristic.confidence + gw * gemini.confidence;
  const finalConfidence = Math.min(rawConfidence + 0.05, 0.95);

  return {
    complexity:     finalComplexity,
    estimatedHours: finalHours,
    confidence:     Math.round(finalConfidence * 100) / 100,
    score:          heuristic.score,          // keep heuristic score for audit
    breakdown:      heuristic.breakdown,      // keep breakdown for UI display
    blendInfo: {
      heuristicWeight:      hw,
      geminiWeight:         gw,
      geminiUsed:           true,
      heuristicComplexity:  heuristic.complexity,
      geminiComplexity:     gemini.complexity,
      heuristicHours:       heuristic.estimatedHours,
      geminiHours:          gemini.estimatedHours,
      heuristicConfidence:  heuristic.confidence,
      geminiConfidence:     gemini.confidence,
      geminiRationale:      gemini.rationale || ""
    }
  };
};

// ─── Context Queries ──────────────────────────────────────────────────────────

const fetchHistoricalTasks = async (task) => {
  if (!task.labels || task.labels.length === 0) return [];
  return Task.find({
    organization: task.organization,
    status: "completed",
    labels: { $in: task.labels },
    _id: { $ne: task._id }
  })
    .select("labels priority subtasks")
    .limit(50)
    .lean();
};

const fetchDeveloperHistory = async (task) => {
  if (!task.assignedTo) return null;
  const [completed, total] = await Promise.all([
    Task.countDocuments({ organization: task.organization, assignedTo: task.assignedTo, status: "completed" }),
    Task.countDocuments({ organization: task.organization, assignedTo: task.assignedTo })
  ]);
  return { completed, total };
};

const fetchGithubLabels = async (taskId) => {
  const links = await GithubTaskLink.find({ task: taskId }).select("labels").lean();
  return links.flatMap((link) => link.labels || []);
};

// ─── Main Orchestrator ────────────────────────────────────────────────────────

/**
 * Full hybrid prediction pipeline:
 * 1. Load context in parallel (GitHub labels, historical tasks, developer history)
 * 2. Extract features
 * 3. Run heuristic + Gemini 2.5 Pro IN PARALLEL
 * 4. Blend results (70% heuristic, 30% Gemini)
 * 5. Persist full record (both signals + blend)
 * 6. Return blended result
 */
export const getPredictionForTask = async (task, requesterId) => {
  // Step 1 — context
  const [githubLabels, historicalTasks, developerHistory] = await Promise.all([
    fetchGithubLabels(task._id),
    fetchHistoricalTasks(task),
    fetchDeveloperHistory(task)
  ]);

  // Step 2 — features
  const features = extractFeatures({ task, githubLabels, historicalTasks, developerHistory });

  // Step 3 — run heuristic + Gemini in parallel
  const [heuristicResult, geminiResult] = await Promise.all([
    Promise.resolve(predictComplexityHeuristic(features)),
    getGeminiComplexityEstimate({
      title:                   task.title,
      description:             task.description,
      priority:                task.priority,
      labels:                  features.labels,
      subtaskCount:            features.subtaskCount,
      githubIssueLabels:       features.githubIssueLabels,
      historicalAvgHours:      features.historicalAvgHours,
      historicalSampleSize:    features.historicalSampleSize,
      developerCompletionRate: features.developerCompletionRate,
      developerCompletedCount: features.developerCompletedCount
    })
  ]);

  // Step 4 — blend
  const blended = blendPredictions(heuristicResult, geminiResult);

  const modelVersion = geminiResult ? MODEL_VERSION_HYBRID : MODEL_VERSION_HEURISTIC;

  // Step 5 — persist training record
  const saved = await ComplexityPrediction.create({
    task:         task._id,
    project:      task.project,
    organization: task.organization,
    inputs:       features,
    prediction: {
      complexity:     blended.complexity,
      estimatedHours: blended.estimatedHours,
      confidence:     blended.confidence,
      score:          blended.score,
      breakdown:      blended.breakdown
    },
    // Store both raw signals for ML training data quality
    heuristicSignal: {
      complexity:     heuristicResult.complexity,
      estimatedHours: heuristicResult.estimatedHours,
      confidence:     heuristicResult.confidence
    },
    geminiSignal: geminiResult
      ? {
          complexity:     geminiResult.complexity,
          estimatedHours: geminiResult.estimatedHours,
          confidence:     geminiResult.confidence,
          rationale:      geminiResult.rationale
        }
      : null,
    blendWeights: {
      heuristic: geminiResult ? WEIGHTS.heuristic : 1.0,
      gemini:    geminiResult ? WEIGHTS.gemini    : 0.0
    },
    modelVersion,
    recordedBy: requesterId || null
  });

  // Step 6 — return
  return {
    predictionId:   saved._id,
    taskId:         task._id,
    complexity:     blended.complexity,
    estimatedHours: blended.estimatedHours,
    confidence:     blended.confidence,
    score:          blended.score,
    breakdown:      blended.breakdown,
    blendInfo:      blended.blendInfo,
    modelVersion,
    context: {
      githubLabelsFound:           githubLabels.length,
      historicalTasksFound:        historicalTasks.length,
      developerHistoryAvailable:   developerHistory !== null,
      geminiUsed:                  geminiResult !== null,
      geminiConfigured:            isGeminiConfigured()
    }
  };
};

/**
 * Returns the latest saved prediction for a task (no recompute).
 */
export const getLatestPrediction = async (taskId) => {
  return ComplexityPrediction.findOne({ task: taskId })
    .sort({ createdAt: -1 })
    .lean();
};
