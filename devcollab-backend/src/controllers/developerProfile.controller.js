import { DeveloperProfile } from "../models/developerProfile.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const allowedExperienceLevels = ["beginner", "junior", "mid", "senior", "lead"];

const normalizeStringList = (value, fieldName) => {
  if (value === undefined) {
    return undefined;
  }

  const list = Array.isArray(value) ? value : value.toString().split(",");

  return [
    ...new Set(
      list
        .map((item) => item?.toString().trim().toLowerCase())
        .filter(Boolean)
    )
  ].slice(0, 30);
};

const normalizePortfolioLinks = (links) => {
  if (links === undefined) {
    return undefined;
  }

  if (!Array.isArray(links)) {
    throw new ApiError(400, "Portfolio links must be an array");
  }

  return links
    .map((link) => ({
      label: link?.label?.toString().trim() || "",
      url: link?.url?.toString().trim() || ""
    }))
    .filter((link) => link.url)
    .slice(0, 10);
};

const buildProfileUpdate = (body) => {
  const updateData = {};

  if (body.bio !== undefined) {
    updateData.bio = body.bio;
  }

  const skills = normalizeStringList(body.skills, "skills");
  if (skills !== undefined) {
    updateData.skills = skills;
  }

  const interests = normalizeStringList(body.interests, "interests");
  if (interests !== undefined) {
    updateData.interests = interests;
  }

  const preferredRoles = normalizeStringList(body.preferredRoles, "preferred roles");
  if (preferredRoles !== undefined) {
    updateData.preferredRoles = preferredRoles;
  }

  if (body.availabilityHoursPerWeek !== undefined) {
    const availabilityHoursPerWeek = Number(body.availabilityHoursPerWeek);

    if (!Number.isFinite(availabilityHoursPerWeek)) {
      throw new ApiError(400, "Availability hours must be a number");
    }

    updateData.availabilityHoursPerWeek = availabilityHoursPerWeek;
  }

  if (body.experienceLevel !== undefined) {
    if (!allowedExperienceLevels.includes(body.experienceLevel)) {
      throw new ApiError(400, "Invalid experience level");
    }

    updateData.experienceLevel = body.experienceLevel;
  }

  if (body.githubUsername !== undefined) {
    updateData.githubUsername = body.githubUsername;
  }

  const portfolioLinks = normalizePortfolioLinks(body.portfolioLinks);
  if (portfolioLinks !== undefined) {
    updateData.portfolioLinks = portfolioLinks;
  }

  if (body.timezone !== undefined) {
    updateData.timezone = body.timezone;
  }

  return updateData;
};

export const getMyDeveloperProfile = asyncHandler(async (req, res) => {
  const profile = await DeveloperProfile.findOneAndUpdate(
    { user: req.user._id },
    { $setOnInsert: { user: req.user._id } },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  ).populate("user", "name email avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, { profile }, "Developer profile fetched successfully"));
});

export const updateMyDeveloperProfile = asyncHandler(async (req, res) => {
  const updateData = buildProfileUpdate(req.body);

  const profile = await DeveloperProfile.findOneAndUpdate(
    { user: req.user._id },
    {
      $set: updateData,
      $setOnInsert: {
        user: req.user._id
      }
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  ).populate("user", "name email avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, { profile }, "Developer profile updated successfully"));
});
