import { DeveloperProfile } from "../models/developerProfile.model.js";
import { Membership } from "../models/membership.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";

const SCORE_WEIGHTS = {
  skillMatch: 40,
  interestMatch: 20,
  availabilityScore: 15,
  workloadScore: 15,
  pastProjectScore: 10
};

const tokenize = (value = "") => {
  return value
    .toString()
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
};

const unique = (values) => [...new Set(values.filter(Boolean))];

const overlapRatio = (sourceValues = [], targetValues = []) => {
  const source = unique(sourceValues.map((value) => value.toString().toLowerCase()));
  const target = new Set(targetValues.map((value) => value.toString().toLowerCase()));

  if (source.length === 0 || target.size === 0) {
    return 0;
  }

  const matches = source.filter((value) => target.has(value)).length;
  return Math.min(matches / Math.min(source.length, Math.max(target.size, 1)), 1);
};

const countByUser = (items, field = "assignedTo") => {
  return items.reduce((accumulator, item) => {
    const userId = item[field]?.toString();

    if (!userId) {
      return accumulator;
    }

    accumulator[userId] = (accumulator[userId] || 0) + 1;
    return accumulator;
  }, {});
};

const getProjectSignals = async (project) => {
  const tasks = await Task.find({ project: project._id }).select("title description labels").lean();
  const labelSignals = tasks.flatMap((task) => task.labels || []);
  const textSignals = [
    ...tokenize(project.name),
    ...tokenize(project.description),
    ...tasks.flatMap((task) => [...tokenize(task.title), ...tokenize(task.description)])
  ];

  return unique([...labelSignals, ...textSignals]);
};

export const getProjectDeveloperRecommendations = async ({
  project,
  requesterId,
  limit = 8,
  includeExisting = false
}) => {
  const [memberships, existingProjectMembers, projectSignals] = await Promise.all([
    Membership.find({
      organization: project.organization,
      status: "active"
    })
      .populate("user", "name email avatar")
      .lean(),
    ProjectMember.find({
      project: project._id,
      status: "active"
    })
      .select("user role")
      .lean(),
    getProjectSignals(project)
  ]);

  const existingMemberByUser = new Map(
    existingProjectMembers.map((member) => [member.user.toString(), member])
  );

  const candidateMemberships = memberships.filter((membership) => {
    const userId = membership.user?._id?.toString();

    if (!userId || userId === requesterId.toString()) {
      return false;
    }

    return includeExisting || !existingMemberByUser.has(userId);
  });

  const candidateUserIds = candidateMemberships.map((membership) => membership.user._id);

  if (candidateUserIds.length === 0) {
    return [];
  }

  const [profiles, activeTasks, completedTasks] = await Promise.all([
    DeveloperProfile.find({
      user: {
        $in: candidateUserIds
      }
    })
      .populate("user", "name email avatar")
      .lean(),
    Task.find({
      organization: project.organization,
      assignedTo: {
        $in: candidateUserIds
      },
      status: {
        $ne: "completed"
      }
    })
      .select("assignedTo")
      .lean(),
    Task.find({
      organization: project.organization,
      assignedTo: {
        $in: candidateUserIds
      },
      status: "completed"
    })
      .select("assignedTo labels")
      .lean()
  ]);

  const profileByUser = new Map(profiles.map((profile) => [profile.user._id.toString(), profile]));
  const activeWorkloadByUser = countByUser(activeTasks);
  const completedTaskCountByUser = countByUser(completedTasks);
  const projectSignalSet = new Set(projectSignals);

  return candidateMemberships
    .map((membership) => {
      const userId = membership.user._id.toString();
      const profile = profileByUser.get(userId) || {
        user: membership.user,
        skills: [],
        interests: [],
        availabilityHoursPerWeek: 0,
        preferredRoles: [],
        experienceLevel: "junior",
        githubUsername: "",
        portfolioLinks: []
      };

      const activeWorkload = activeWorkloadByUser[userId] || 0;
      const completedForUser = completedTasks.filter(
        (task) => task.assignedTo?.toString() === userId
      );

      const completedLabelMatches = completedForUser.filter((task) =>
        (task.labels || []).some((label) => projectSignalSet.has(label))
      ).length;

      const skillMatch = overlapRatio(profile.skills || [], projectSignals);
      const interestMatch = overlapRatio(profile.interests || [], projectSignals);
      const availabilityScore = Math.min((profile.availabilityHoursPerWeek || 0) / 20, 1);
      const workloadScore = Math.max(0, 1 - activeWorkload / 10);
      const pastProjectScore =
        projectSignals.length > 0
          ? Math.min(completedLabelMatches / 3, 1)
          : Math.min((completedTaskCountByUser[userId] || 0) / 5, 1);

      const scoreBreakdown = {
        skillMatch: Math.round(skillMatch * SCORE_WEIGHTS.skillMatch),
        interestMatch: Math.round(interestMatch * SCORE_WEIGHTS.interestMatch),
        availabilityScore: Math.round(availabilityScore * SCORE_WEIGHTS.availabilityScore),
        workloadScore: Math.round(workloadScore * SCORE_WEIGHTS.workloadScore),
        pastProjectScore: Math.round(pastProjectScore * SCORE_WEIGHTS.pastProjectScore)
      };

      const matchScore = Object.values(scoreBreakdown).reduce((total, value) => total + value, 0);

      const matchedSkills = (profile.skills || []).filter((skill) => projectSignalSet.has(skill));
      const matchedInterests = (profile.interests || []).filter((interest) =>
        projectSignalSet.has(interest)
      );

      return {
        user: profile.user,
        profile: {
          bio: profile.bio || "",
          skills: profile.skills || [],
          interests: profile.interests || [],
          availabilityHoursPerWeek: profile.availabilityHoursPerWeek || 0,
          preferredRoles: profile.preferredRoles || [],
          experienceLevel: profile.experienceLevel || "junior",
          githubUsername: profile.githubUsername || "",
          portfolioLinks: profile.portfolioLinks || []
        },
        organizationRole: membership.role,
        alreadyProjectMember: existingMemberByUser.has(userId),
        activeWorkload,
        matchScore,
        scoreBreakdown,
        reasons: {
          matchedSkills,
          matchedInterests,
          projectSignals: projectSignals.slice(0, 12)
        }
      };
    })
    .sort((left, right) => right.matchScore - left.matchScore)
    .slice(0, limit);
};
