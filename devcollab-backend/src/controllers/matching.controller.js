import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { getProjectDeveloperRecommendations } from "../services/matching.service.js";

export const getProjectDeveloperMatches = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit || "8", 10), 1), 25);
  const includeExisting = req.query.includeExisting === "true";

  const recommendations = await getProjectDeveloperRecommendations({
    project: req.project,
    requesterId: req.user._id,
    limit,
    includeExisting
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        recommendations,
        scoringWeights: {
          skillMatch: "40%",
          interestMatch: "20%",
          availabilityScore: "15%",
          workloadScore: "15%",
          pastProjectScore: "10%"
        }
      },
      "Developer matches fetched successfully"
    )
  );
});
