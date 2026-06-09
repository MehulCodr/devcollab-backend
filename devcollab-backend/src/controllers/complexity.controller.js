import { Task } from "../models/task.model.js";
import { ComplexityPrediction } from "../models/complexityPrediction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  getPredictionForTask,
  getLatestPrediction,
  MODEL_VERSION_HYBRID
} from "../services/complexity.service.js";

// ─── GET /tasks/:taskId/complexity ───────────────────────────────────────────
/**
 * Returns the latest cached prediction if it was computed within the last hour,
 * otherwise computes a fresh prediction and stores it.
 */
export const predictTaskComplexity = asyncHandler(async (req, res) => {
  const task = req.task;
  const forceRefresh = req.query.refresh === "true";

  // Try serving from cache (last prediction within 1 hour)
  if (!forceRefresh) {
    const latest = await getLatestPrediction(task._id);

    if (latest) {
      const ageMs = Date.now() - new Date(latest.createdAt).getTime();
      const ONE_HOUR_MS = 60 * 60 * 1000;

      if (ageMs < ONE_HOUR_MS) {
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              predictionId: latest._id,
              taskId: task._id,
              complexity: latest.prediction.complexity,
              estimatedHours: latest.prediction.estimatedHours,
              confidence: latest.prediction.confidence,
              score: latest.prediction.score,
              breakdown: latest.prediction.breakdown,
              modelVersion: latest.modelVersion,
              cached: true,
              computedAt: latest.createdAt
            },
            "Complexity prediction fetched from cache"
          )
        );
      }
    }
  }

  // Fresh prediction
  const result = await getPredictionForTask(task, req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        predictionId:   result.predictionId,
        taskId:         result.taskId,
        complexity:     result.complexity,
        estimatedHours: result.estimatedHours,
        confidence:     result.confidence,
        score:          result.score,
        breakdown:      result.breakdown,
        blendInfo:      result.blendInfo,
        modelVersion:   result.modelVersion,
        context:        result.context,
        cached: false,
        computedAt: new Date().toISOString()
      },
      "Complexity prediction computed successfully"
    )
  );
});

// ─── POST /tasks/:taskId/complexity/refresh ──────────────────────────────────
/**
 * Forces a fresh recompute regardless of cache age.
 */
export const refreshTaskComplexity = asyncHandler(async (req, res) => {
  const result = await getPredictionForTask(req.task, req.user._id);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...result,
        cached: false,
        computedAt: new Date().toISOString()
      },
      "Complexity prediction refreshed"
    )
  );
});

// ─── PATCH /tasks/:taskId/complexity/actual ───────────────────────────────────
/**
 * Records the actual complexity/hours after task completion.
 * This is the "ground truth" hook for future ML training.
 */
export const recordActualComplexity = asyncHandler(async (req, res) => {
  const { actualComplexity, actualHours, actualNotes, predictionId } = req.body;

  const allowedComplexities = ["low", "medium", "high", "critical"];

  if (!actualComplexity || !allowedComplexities.includes(actualComplexity)) {
    throw new ApiError(
      400,
      `actualComplexity must be one of: ${allowedComplexities.join(", ")}`
    );
  }

  if (actualHours !== undefined && (typeof actualHours !== "number" || actualHours < 0)) {
    throw new ApiError(400, "actualHours must be a non-negative number");
  }

  // Find the prediction to update (specific or latest)
  let prediction;

  if (predictionId) {
    prediction = await ComplexityPrediction.findOne({
      _id: predictionId,
      task: req.task._id
    });

    if (!prediction) {
      throw new ApiError(404, "Prediction record not found for this task");
    }
  } else {
    prediction = await ComplexityPrediction.findOne({ task: req.task._id }).sort({
      createdAt: -1
    });

    if (!prediction) {
      throw new ApiError(404, "No complexity prediction found for this task. Run a prediction first.");
    }
  }

  prediction.actualComplexity = actualComplexity;
  if (actualHours !== undefined) prediction.actualHours = actualHours;
  if (actualNotes !== undefined) prediction.actualNotes = actualNotes;
  prediction.recordedBy = req.user._id;

  await prediction.save();

  // Calculate accuracy delta for transparency
  const complexityLevels = ["low", "medium", "high", "critical"];
  const predictedIndex = complexityLevels.indexOf(prediction.prediction.complexity);
  const actualIndex = complexityLevels.indexOf(actualComplexity);
  const accuracyDelta = Math.abs(predictedIndex - actualIndex);
  const isExact = accuracyDelta === 0;
  const isClose = accuracyDelta <= 1;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        predictionId: prediction._id,
        taskId: req.task._id,
        predicted: prediction.prediction.complexity,
        actual: actualComplexity,
        accuracyDelta,
        isExact,
        isClose,
        trainingDataSaved: true,
        modelVersion: prediction.modelVersion
      },
      "Actual complexity recorded. This data will be used to improve future predictions."
    )
  );
});

// ─── GET /tasks/:taskId/complexity/history ───────────────────────────────────
/**
 * Returns all stored predictions for a task (prediction audit trail).
 */
export const getComplexityHistory = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
  const skip = (page - 1) * limit;

  const [predictions, total] = await Promise.all([
    ComplexityPrediction.find({ task: req.task._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("recordedBy", "name email avatar")
      .lean(),
    ComplexityPrediction.countDocuments({ task: req.task._id })
  ]);

  // Summarize accuracy across all records that have actual values
  const withActual = predictions.filter((p) => p.actualComplexity != null);
  const exactMatches = withActual.filter(
    (p) => p.prediction.complexity === p.actualComplexity
  ).length;
  const accuracySummary =
    withActual.length > 0
      ? {
          total: withActual.length,
          exactMatches,
          exactMatchRate: Math.round((exactMatches / withActual.length) * 100)
        }
      : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        predictions,
        accuracySummary,
        modelVersion: MODEL_VERSION_HYBRID,
        pagination: {
          total,
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          limit
        }
      },
      "Complexity prediction history fetched successfully"
    )
  );
});
