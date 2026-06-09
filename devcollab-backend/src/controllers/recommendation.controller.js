import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";
import {
  getProjectRecommendationsForUser,
  SCORE_WEIGHTS
} from "../services/recommendation.service.js";

// ─── GET /api/v1/recommendations/projects ────────────────────────────────────
/**
 * Returns personalised project recommendations for the authenticated user.
 *
 * Query params:
 *   limit         {number}  1–50, default 10
 *   includeJoined {boolean} include projects user is already a member of
 *   orgId         {string}  restrict to a single org (optional)
 */
export const getProjectRecommendations = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const limit  = Math.min(Math.max(parseInt(req.query.limit || "10", 10), 1), 50);
  const includeJoined = req.query.includeJoined === "true";
  const orgId  = req.query.orgId?.trim() || null;

  if (orgId) {
    validateMongoId(orgId, "organization id");
  }

  const recommendations = await getProjectRecommendationsForUser(userId, {
    limit,
    includeJoined,
    orgIds: orgId ? [orgId] : undefined
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        recommendations,
        total: recommendations.length,
        scoreWeights: SCORE_WEIGHTS,
        generatedAt: new Date().toISOString()
      },
      recommendations.length > 0
        ? "Project recommendations generated successfully"
        : "No project recommendations found. Complete your developer profile to get personalised recommendations."
    )
  );
});

// ─── GET /api/v1/recommendations/projects/explain/:projectId ─────────────────
/**
 * Returns a detailed explanation of why a specific project was (or wasn't)
 * recommended to the user — useful for transparency in the UI.
 */
export const explainProjectRecommendation = asyncHandler(async (req, res) => {
  const { projectId } = req.params;
  const userId = req.user._id;

  validateMongoId(projectId, "project id");

  // Run recommendation with includeJoined=true to cover edge case
  const recs = await getProjectRecommendationsForUser(userId, {
    limit: 200,
    includeJoined: true
  });

  const match = recs.find((r) => r.project._id.toString() === projectId);

  if (!match) {
    throw new ApiError(
      404,
      "This project was not found in your recommendation pool. " +
      "Ensure you are a member of the same organization as this project."
    );
  }

  // Build human-readable reason strings
  const reasons = [];
  const bd = match.scoreBreakdown;
  const ctx = match.context;

  if (bd.skillMatch >= 15) {
    reasons.push(`Strong skill alignment: ${ctx.matchedSkills.slice(0, 5).join(", ")}`);
  } else if (bd.skillMatch >= 8) {
    reasons.push(`Partial skill match: ${ctx.matchedSkills.slice(0, 3).join(", ")}`);
  } else {
    reasons.push("Limited skill overlap with this project's tech stack");
  }

  if (bd.interestMatch >= 10) {
    reasons.push(`Your interests align: ${ctx.matchedInterests.slice(0, 3).join(", ")}`);
  }

  if (bd.activityScore >= 10) {
    reasons.push(`Active project: ${ctx.recentTaskCount} tasks created in the last 30 days`);
  } else if (ctx.openTaskCount > 0) {
    reasons.push(`${ctx.openTaskCount} open tasks need contributors`);
  } else {
    reasons.push("Project has low recent activity");
  }

  if (bd.availability >= 10) {
    reasons.push("Your availability matches the project's workload");
  }

  if (bd.openness >= 7) {
    reasons.push(`Open project with ${ctx.activeMemberCount} current members — room to grow`);
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        project:        match.project,
        score:          match.score,
        matchTier:      match.matchTier,
        scoreBreakdown: match.scoreBreakdown,
        scoreWeights:   SCORE_WEIGHTS,
        context:        match.context,
        reasons,
        alreadyMember:  match.alreadyMember
      },
      "Recommendation explanation generated"
    )
  );
});
