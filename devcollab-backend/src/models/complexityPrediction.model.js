import mongoose from "mongoose";

/**
 * Stores every task complexity prediction as a training record.
 * - `inputs`  : raw feature vector used to produce the prediction (ML-ready)
 * - `prediction` : model output at prediction time
 * - `actualComplexity` / `actualHours` : set post-completion for supervised learning
 */
const complexityPredictionSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },

    // ── Feature vector (raw inputs captured at prediction time) ─────────────
    inputs: {
      titleLength: { type: Number, default: 0 },
      descriptionLength: { type: Number, default: 0 },
      priority: { type: String, default: "medium" },
      labelCount: { type: Number, default: 0 },
      labels: { type: [String], default: [] },
      subtaskCount: { type: Number, default: 0 },
      githubIssueLabels: { type: [String], default: [] },
      historicalAvgHours: { type: Number, default: null },
      historicalSampleSize: { type: Number, default: 0 },
      developerCompletionRate: { type: Number, default: null },
      developerCompletedCount: { type: Number, default: 0 }
    },

    // ── Prediction output ────────────────────────────────────────────────────
    prediction: {
      complexity: {
        type: String,
        enum: ["low", "medium", "high", "critical"],
        required: true
      },
      estimatedHours: { type: Number, required: true },
      confidence: { type: Number, min: 0, max: 1, required: true },
      score: { type: Number, required: true },
      breakdown: { type: mongoose.Schema.Types.Mixed, default: {} }
    },

    // ── Individual model signals (stored for ML training data quality) ────────
    heuristicSignal: {
      complexity:     { type: String, enum: ["low", "medium", "high", "critical"] },
      estimatedHours: { type: Number },
      confidence:     { type: Number }
    },
    geminiSignal: {
      complexity:     { type: String, enum: ["low", "medium", "high", "critical", null], default: null },
      estimatedHours: { type: Number, default: null },
      confidence:     { type: Number, default: null },
      rationale:      { type: String, default: "" }
    },
    blendWeights: {
      heuristic: { type: Number, default: 1.0 },
      gemini:    { type: Number, default: 0.0 }
    },

    // ── Actual outcome (filled in by user after task completion) ─────────────
    actualComplexity: {
      type: String,
      enum: ["low", "medium", "high", "critical", null],
      default: null
    },
    actualHours: {
      type: Number,
      default: null
    },
    actualNotes: {
      type: String,
      default: "",
      maxlength: [500, "Notes cannot exceed 500 characters"]
    },

    // ── Meta ─────────────────────────────────────────────────────────────────
    modelVersion: {
      type: String,
      default: "heuristic-v1"
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

complexityPredictionSchema.index({ task: 1, createdAt: -1 });
complexityPredictionSchema.index({ project: 1, "prediction.complexity": 1 });
// Useful for future ML training queries
complexityPredictionSchema.index({ actualComplexity: 1, modelVersion: 1 });

export const ComplexityPrediction = mongoose.model(
  "ComplexityPrediction",
  complexityPredictionSchema
);
