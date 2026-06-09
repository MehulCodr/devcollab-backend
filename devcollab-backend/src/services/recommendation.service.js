/**
 * recommendation.service.js
 *
 * Project Recommendation Engine — Phase 4
 *
 * Recommends projects to a user based on 6 scored factors:
 *
 *  1. Skill match       (30%) — user skills vs project tech signals
 *  2. Interest match    (20%) — user interests vs project domain signals
 *  3. Activity score    (15%) — recent task activity = living project
 *  4. Availability      (15%) — hours/week vs estimated open task load
 *  5. Role fit          (10%) — preferred roles vs open slots
 *  6. Openness          (10%) — how open/welcoming the project is (member count vs org)
 *
 * Total possible = 100 pts. Returned sorted descending.
 *
 * Design:
 * - Cross-org: recommends across ALL organizations the user belongs to
 * - Excludes projects the user already belongs to (configurable)
 * - ML-ready: no training data stored here yet, but the score breakdowns
 *   are fully structured for future collection
 */

import { DeveloperProfile } from "../models/developerProfile.model.js";
import { Membership } from "../models/membership.model.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";

// ─── Score Weights ────────────────────────────────────────────────────────────
export const SCORE_WEIGHTS = {
  skillMatch:    30,
  interestMatch: 20,
  activityScore: 15,
  availability:  15,
  roleFit:       10,
  openness:      10
};

// ─── Token Helpers ────────────────────────────────────────────────────────────

const tokenize = (text = "") =>
  text
    .toLowerCase()
    .split(/[\s,;|\/\-_\.]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

const unique = (arr) => [...new Set(arr.filter(Boolean))];

/**
 * Overlap ratio: what fraction of `source` items appear in `target`.
 * Returns 0–1.
 */
const overlapRatio = (source = [], target = []) => {
  const src = unique(source.map((v) => v.toLowerCase()));
  const tgt = new Set(target.map((v) => v.toLowerCase()));
  if (src.length === 0 || tgt.size === 0) return 0;
  const matches = src.filter((v) => tgt.has(v)).length;
  return Math.min(matches / Math.min(src.length, tgt.size), 1);
};

// ─── Project Signal Extraction ────────────────────────────────────────────────

/**
 * Extracts tech/domain signals from a project's name, description, and its tasks.
 * Returns { textSignals, labelSignals, allSignals }
 */
const extractProjectSignals = (project, tasks = []) => {
  const textSignals = unique([
    ...tokenize(project.name),
    ...tokenize(project.description),
    ...tasks.flatMap((t) => [...tokenize(t.title), ...tokenize(t.description || "")])
  ]);

  const labelSignals = unique(tasks.flatMap((t) => t.labels || []));

  return {
    textSignals,
    labelSignals,
    allSignals: unique([...textSignals, ...labelSignals])
  };
};

// ─── Individual Scorers ───────────────────────────────────────────────────────

/** 1. Skill match — user skills vs project allSignals */
const scoreSkillMatch = (profile, signals) => {
  const ratio = overlapRatio(profile.skills || [], signals.allSignals);
  return Math.round(ratio * SCORE_WEIGHTS.skillMatch);
};

/** 2. Interest match — user interests vs project allSignals */
const scoreInterestMatch = (profile, signals) => {
  const ratio = overlapRatio(profile.interests || [], signals.allSignals);
  return Math.round(ratio * SCORE_WEIGHTS.interestMatch);
};

/**
 * 3. Activity score — how recently active the project is.
 * More open tasks = more activity = more need for contributors.
 * Scaled: 0 tasks = 0, ≥20 tasks = full.
 */
const scoreActivity = (openTaskCount, recentTaskCount) => {
  // Blend: recent activity (last 30d) weighted 60%, total open 40%
  const recentRatio = Math.min(recentTaskCount / 10, 1);
  const openRatio   = Math.min(openTaskCount   / 20, 1);
  const ratio = 0.6 * recentRatio + 0.4 * openRatio;
  return Math.round(ratio * SCORE_WEIGHTS.activityScore);
};

/**
 * 4. Availability match.
 * Heuristic: each open task ≈ 4h of work.
 * Match = how well user's availability covers open task demand.
 */
const scoreAvailability = (profile, openTaskCount) => {
  const userHours    = profile.availabilityHoursPerWeek || 0;
  const demandHoursW = (openTaskCount * 4) / 4; // assume ~4 week horizon
  if (userHours === 0) return 0;
  const ratio = Math.min(userHours / Math.max(demandHoursW, 1), 1);
  return Math.round(ratio * SCORE_WEIGHTS.availability);
};

/** 5. Role fit — preferred roles vs open project roles needed */
const scoreRoleFit = (profile, memberRoleCounts) => {
  const preferred = (profile.preferredRoles || []).map((r) => r.toLowerCase());
  if (preferred.length === 0) return Math.round(SCORE_WEIGHTS.roleFit * 0.5); // neutral

  // Project needs more developers? Match developer-preferred users
  const totalMembers   = Object.values(memberRoleCounts).reduce((a, b) => a + b, 0);
  const developerShare = (memberRoleCounts.developer || 0) / Math.max(totalMembers, 1);

  // If project is developer-heavy and user prefers developer → good fit
  const developerMatch = preferred.includes("developer") && developerShare > 0.5 ? 1 : 0;
  const managerMatch   = preferred.includes("manager")   && (memberRoleCounts.manager || 0) < 2 ? 0.8 : 0;
  const viewerMatch    = preferred.includes("viewer") ? 0.3 : 0;

  const ratio = Math.min(Math.max(developerMatch, managerMatch, viewerMatch, 0.2), 1);
  return Math.round(ratio * SCORE_WEIGHTS.roleFit);
};

/**
 * 6. Openness — is the project welcoming new members?
 * Small member count = more open slots. Penalizes already crowded projects.
 */
const scoreOpenness = (activeMemberCount, orgMemberCount) => {
  // Openness = inverse of how full the project is
  const fillRatio = Math.min(activeMemberCount / Math.max(orgMemberCount, 1), 1);
  const ratio = 1 - fillRatio * 0.7; // never 0 — always some openness
  return Math.round(ratio * SCORE_WEIGHTS.openness);
};

// ─── Main Recommendation Engine ───────────────────────────────────────────────

/**
 * Returns recommended projects for a user, scored and sorted.
 *
 * @param {string} userId
 * @param {object} options
 *   - limit          {number}  default 10
 *   - includeJoined  {boolean} include projects user already belongs to (default false)
 *   - orgIds         {string[]} restrict to specific org IDs (default: all user orgs)
 */
export const getProjectRecommendationsForUser = async (userId, options = {}) => {
  const { limit = 10, includeJoined = false, orgIds } = options;

  // ── 1. Find all orgs the user belongs to ───────────────────────────────────
  const membershipFilter = { user: userId, status: "active" };
  if (orgIds?.length) membershipFilter.organization = { $in: orgIds };

  const memberships = await Membership.find(membershipFilter).lean();
  if (memberships.length === 0) return [];

  const userOrgIds = memberships.map((m) => m.organization);

  // ── 2. Load user's developer profile ──────────────────────────────────────
  const profile = (await DeveloperProfile.findOne({ user: userId }).lean()) || {
    skills: [],
    interests: [],
    availabilityHoursPerWeek: 10,
    preferredRoles: [],
    experienceLevel: "junior"
  };

  // ── 3. Find all active projects across user's orgs ────────────────────────
  const [allProjects, userProjectMemberships, orgMemberCounts] = await Promise.all([
    Project.find({
      organization: { $in: userOrgIds },
      status: "active"
    })
      .populate("organization", "name slug logo")
      .populate("createdBy", "name avatar")
      .lean(),

    ProjectMember.find({
      user: userId,
      organization: { $in: userOrgIds },
      status: "active"
    })
      .select("project")
      .lean(),

    // Count org members per org for openness scoring
    Membership.aggregate([
      { $match: { organization: { $in: userOrgIds }, status: "active" } },
      { $group: { _id: "$organization", count: { $sum: 1 } } }
    ])
  ]);

  const joinedProjectIds = new Set(
    userProjectMemberships.map((pm) => pm.project.toString())
  );

  const orgMemberCountMap = Object.fromEntries(
    orgMemberCounts.map((o) => [o._id.toString(), o.count])
  );

  // Filter out already-joined projects unless includeJoined
  const candidateProjects = allProjects.filter((p) =>
    includeJoined || !joinedProjectIds.has(p._id.toString())
  );

  if (candidateProjects.length === 0) return [];

  const projectIds = candidateProjects.map((p) => p._id);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // ── 4. Load all tasks + member counts in parallel ─────────────────────────
  const [allTasks, projectMemberAggregates] = await Promise.all([
    Task.find({
      project: { $in: projectIds }
    })
      .select("project title description labels status createdAt")
      .lean(),

    ProjectMember.aggregate([
      {
        $match: {
          project: { $in: projectIds },
          status: "active"
        }
      },
      {
        $group: {
          _id: "$project",
          total: { $sum: 1 },
          byRole: { $push: "$role" }
        }
      }
    ])
  ]);

  // Index tasks by project
  const tasksByProject = {};
  for (const task of allTasks) {
    const pid = task.project.toString();
    if (!tasksByProject[pid]) tasksByProject[pid] = [];
    tasksByProject[pid].push(task);
  }

  // Index member counts
  const membersByProject = {};
  for (const agg of projectMemberAggregates) {
    const pid = agg._id.toString();
    const roleCounts = {};
    for (const role of agg.byRole) {
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    }
    membersByProject[pid] = { total: agg.total, roleCounts };
  }

  // ── 5. Score each project ─────────────────────────────────────────────────
  const scored = candidateProjects.map((project) => {
    const pid      = project._id.toString();
    const tasks    = tasksByProject[pid] || [];
    const members  = membersByProject[pid] || { total: 0, roleCounts: {} };
    const orgId    = project.organization?._id?.toString() || project.organization?.toString();
    const orgCount = orgMemberCountMap[orgId] || 1;

    const openTasks   = tasks.filter((t) => t.status !== "completed");
    const recentTasks = tasks.filter(
      (t) => new Date(t.createdAt) >= thirtyDaysAgo
    );

    const signals = extractProjectSignals(project, tasks);

    const skillScore    = scoreSkillMatch(profile, signals);
    const interestScore = scoreInterestMatch(profile, signals);
    const activityScore = scoreActivity(openTasks.length, recentTasks.length);
    const availScore    = scoreAvailability(profile, openTasks.length);
    const roleScore     = scoreRoleFit(profile, members.roleCounts);
    const openScore     = scoreOpenness(members.total, orgCount);

    const totalScore =
      skillScore + interestScore + activityScore + availScore + roleScore + openScore;

    // Matched signals for explanation UI
    const matchedSkills = (profile.skills || []).filter((s) =>
      signals.allSignals.includes(s.toLowerCase())
    );
    const matchedInterests = (profile.interests || []).filter((i) =>
      signals.allSignals.includes(i.toLowerCase())
    );

    // Determine match tier
    let matchTier;
    if      (totalScore >= 75) matchTier = "excellent";
    else if (totalScore >= 50) matchTier = "good";
    else if (totalScore >= 25) matchTier = "fair";
    else                       matchTier = "low";

    return {
      project: {
        _id:          project._id,
        name:         project.name,
        slug:         project.slug,
        description:  project.description,
        status:       project.status,
        startDate:    project.startDate,
        dueDate:      project.dueDate,
        createdAt:    project.createdAt,
        organization: project.organization,
        createdBy:    project.createdBy
      },
      score: totalScore,
      matchTier,
      scoreBreakdown: {
        skillMatch:    skillScore,
        interestMatch: interestScore,
        activityScore,
        availability:  availScore,
        roleFit:       roleScore,
        openness:      openScore
      },
      context: {
        openTaskCount:    openTasks.length,
        totalTaskCount:   tasks.length,
        recentTaskCount:  recentTasks.length,
        activeMemberCount: members.total,
        matchedSkills,
        matchedInterests,
        projectSignalSample: signals.labelSignals.slice(0, 10)
      },
      alreadyMember: joinedProjectIds.has(pid)
    };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};
