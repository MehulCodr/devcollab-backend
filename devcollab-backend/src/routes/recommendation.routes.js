import { Router } from "express";
import {
  getProjectRecommendations,
  explainProjectRecommendation
} from "../controllers/recommendation.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

/**
 * GET /api/v1/recommendations/projects
 *
 * Returns personalised project recommendations for the logged-in user.
 *
 * Query params:
 *   limit         {number}  default 10, max 50
 *   includeJoined {boolean} include already-joined projects
 *   orgId         {string}  filter to a specific organization
 *
 * Example:
 *   GET /api/v1/recommendations/projects?limit=6
 *   GET /api/v1/recommendations/projects?orgId=<id>&limit=5
 */
router.get("/projects", getProjectRecommendations);

/**
 * GET /api/v1/recommendations/projects/explain/:projectId
 *
 * Returns a detailed explanation of why a specific project was recommended.
 * Useful for "Why this project?" transparency UI.
 */
router.get("/projects/explain/:projectId", explainProjectRecommendation);

export default router;
