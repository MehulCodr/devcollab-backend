import mongoose from "mongoose";
import { Membership } from "../models/membership.model.js";
import { Project } from "../models/project.model.js";
import { ProjectMember } from "../models/projectMember.model.js";
import { Task } from "../models/task.model.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";

const getPercentage = (value, total) => {
  if (!total) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
};

const formatGroupedCounts = (items, keyName = "name") => {
  return items.map((item) => ({
    [keyName]: item._id || "none",
    count: item.count
  }));
};

const getCompletedPerWeek = async (match) => {
  const since = new Date();
  since.setDate(since.getDate() - 56);

  return Task.aggregate([
    {
      $match: {
        ...match,
        status: "completed",
        updatedAt: {
          $gte: since
        }
      }
    },
    {
      $group: {
        _id: {
          year: {
            $isoWeekYear: "$updatedAt"
          },
          week: {
            $isoWeek: "$updatedAt"
          }
        },
        count: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        "_id.year": 1,
        "_id.week": 1
      }
    },
    {
      $project: {
        _id: 0,
        year: "$_id.year",
        week: "$_id.week",
        label: {
          $concat: [
            {
              $toString: "$_id.year"
            },
            "-W",
            {
              $toString: "$_id.week"
            }
          ]
        },
        count: 1
      }
    }
  ]);
};

const getAverageCompletionTime = async (match) => {
  const result = await Task.aggregate([
    {
      $match: {
        ...match,
        status: "completed"
      }
    },
    {
      $project: {
        completionTimeMs: {
          $subtract: ["$updatedAt", "$createdAt"]
        }
      }
    },
    {
      $group: {
        _id: null,
        averageMs: {
          $avg: "$completionTimeMs"
        }
      }
    }
  ]);

  const averageMs = result[0]?.averageMs || 0;

  return {
    averageMs: Math.round(averageMs),
    averageHours: Number((averageMs / (1000 * 60 * 60)).toFixed(2)),
    averageDays: Number((averageMs / (1000 * 60 * 60 * 24)).toFixed(2))
  };
};

const getWorkloadByUsers = async ({ match, userIds }) => {
  const workload = await Task.aggregate([
    {
      $match: {
        ...match,
        assignedTo: {
          $ne: null
        }
      }
    },
    {
      $group: {
        _id: "$assignedTo",
        totalTasks: {
          $sum: 1
        },
        completedTasks: {
          $sum: {
            $cond: [
              {
                $eq: ["$status", "completed"]
              },
              1,
              0
            ]
          }
        },
        activeTasks: {
          $sum: {
            $cond: [
              {
                $ne: ["$status", "completed"]
              },
              1,
              0
            ]
          }
        },
        overdueTasks: {
          $sum: {
            $cond: [
              {
                $and: [
                  {
                    $ne: ["$status", "completed"]
                  },
                  {
                    $lt: ["$dueDate", new Date()]
                  },
                  {
                    $ne: ["$dueDate", null]
                  }
                ]
              },
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  const workloadMap = new Map(
    workload.map((item) => [
      item._id.toString(),
      {
        totalTasks: item.totalTasks,
        completedTasks: item.completedTasks,
        activeTasks: item.activeTasks,
        overdueTasks: item.overdueTasks
      }
    ])
  );

  const users = await User.find({
    _id: {
      $in: userIds
    }
  }).select("name email avatar");

  return users.map((user) => {
    const stats = workloadMap.get(user._id.toString()) || {
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
      overdueTasks: 0
    };

    return {
      user,
      ...stats,
      completionRate: getPercentage(stats.completedTasks, stats.totalTasks)
    };
  });
};

export const getProjectAnalytics = asyncHandler(async (req, res) => {
  const { projectId } = req.params;

  validateMongoId(projectId, "project id");

  const projectObjectId = new mongoose.Types.ObjectId(projectId);
  const now = new Date();

  const match = {
    project: projectObjectId
  };

  const [
    totalTasks,
    completedTasks,
    overdueTasks,
    tasksByStatus,
    tasksByPriority,
    completedPerWeek,
    averageCompletionTime,
    projectMembers
  ] = await Promise.all([
    Task.countDocuments(match),
    Task.countDocuments({
      ...match,
      status: "completed"
    }),
    Task.countDocuments({
      ...match,
      status: {
        $ne: "completed"
      },
      dueDate: {
        $lt: now,
        $ne: null
      }
    }),
    Task.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1
          }
        }
      }
    ]),
    Task.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: "$priority",
          count: {
            $sum: 1
          }
        }
      }
    ]),
    getCompletedPerWeek(match),
    getAverageCompletionTime(match),
    ProjectMember.find({
      project: projectObjectId,
      status: "active"
    }).select("user role")
  ]);

  const memberUserIds = projectMembers.map((member) => member.user);

  const workloadByMember = await getWorkloadByUsers({
    match,
    userIds: memberUserIds
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: {
          totalTasks,
          completedTasks,
          activeTasks: totalTasks - completedTasks,
          overdueTasks,
          progressPercentage: getPercentage(completedTasks, totalTasks),
          averageCompletionTime
        },
        tasksByStatus: formatGroupedCounts(tasksByStatus, "status"),
        tasksByPriority: formatGroupedCounts(tasksByPriority, "priority"),
        completedPerWeek,
        workloadByMember
      },
      "Project analytics fetched successfully"
    )
  );
});

export const getOrganizationAnalytics = asyncHandler(async (req, res) => {
  const { organizationId } = req.params;

  validateMongoId(organizationId, "organization id");

  const organizationObjectId = new mongoose.Types.ObjectId(organizationId);
  const now = new Date();

  const match = {
    organization: organizationObjectId
  };

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalMembers,
    totalTasks,
    completedTasks,
    overdueTasks,
    tasksByStatus,
    tasksByPriority,
    completedPerWeek,
    averageCompletionTime,
    memberships
  ] = await Promise.all([
    Project.countDocuments({
      organization: organizationObjectId
    }),
    Project.countDocuments({
      organization: organizationObjectId,
      status: "active"
    }),
    Project.countDocuments({
      organization: organizationObjectId,
      status: "completed"
    }),
    Membership.countDocuments({
      organization: organizationObjectId,
      status: "active"
    }),
    Task.countDocuments(match),
    Task.countDocuments({
      ...match,
      status: "completed"
    }),
    Task.countDocuments({
      ...match,
      status: {
        $ne: "completed"
      },
      dueDate: {
        $lt: now,
        $ne: null
      }
    }),
    Task.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: "$status",
          count: {
            $sum: 1
          }
        }
      }
    ]),
    Task.aggregate([
      {
        $match: match
      },
      {
        $group: {
          _id: "$priority",
          count: {
            $sum: 1
          }
        }
      }
    ]),
    getCompletedPerWeek(match),
    getAverageCompletionTime(match),
    Membership.find({
      organization: organizationObjectId,
      status: "active"
    }).select("user role")
  ]);

  const memberUserIds = memberships.map((membership) => membership.user);

  const workloadByMember = await getWorkloadByUsers({
    match,
    userIds: memberUserIds
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        overview: {
          totalProjects,
          activeProjects,
          completedProjects,
          totalMembers,
          totalTasks,
          completedTasks,
          activeTasks: totalTasks - completedTasks,
          overdueTasks,
          progressPercentage: getPercentage(completedTasks, totalTasks),
          averageCompletionTime
        },
        tasksByStatus: formatGroupedCounts(tasksByStatus, "status"),
        tasksByPriority: formatGroupedCounts(tasksByPriority, "priority"),
        completedPerWeek,
        workloadByMember
      },
      "Organization analytics fetched successfully"
    )
  );
});