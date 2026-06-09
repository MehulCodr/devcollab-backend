import { Notification } from "../models/notification.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateMongoId } from "../utils/validateMongoId.js";

export const getMyNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
  const skip = (page - 1) * limit;
  const type = req.query.type?.trim();
  const isRead = req.query.isRead;

  const filter = {
    recipient: req.user._id
  };

  if (type) {
    filter.type = type;
  }

  if (isRead === "true") {
    filter.isRead = true;
  }

  if (isRead === "false") {
    filter.isRead = false;
  }

  const [notifications, totalNotifications, unreadCount] = await Promise.all([
    Notification.find(filter)
      .populate("actor", "name email avatar")
      .populate("organization", "name slug")
      .populate("project", "name slug")
      .populate("task", "title status priority")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    })
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        notifications,
        unreadCount,
        pagination: {
          totalNotifications,
          currentPage: page,
          totalPages: Math.ceil(totalNotifications / limit),
          limit
        }
      },
      "Notifications fetched successfully"
    )
  );
});

export const getUnreadNotificationCount = asyncHandler(async (req, res) => {
  const unreadCount = await Notification.countDocuments({
    recipient: req.user._id,
    isRead: false
  });

  return res
    .status(200)
    .json(new ApiResponse(200, { unreadCount }, "Unread notification count fetched successfully"));
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  validateMongoId(notificationId, "notification id");

  const notification = await Notification.findOneAndUpdate(
    {
      _id: notificationId,
      recipient: req.user._id
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    },
    {
      new: true
    }
  )
    .populate("actor", "name email avatar")
    .populate("organization", "name slug")
    .populate("project", "name slug")
    .populate("task", "title status priority");

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { notification }, "Notification marked as read"));
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  const result = await Notification.updateMany(
    {
      recipient: req.user._id,
      isRead: false
    },
    {
      $set: {
        isRead: true,
        readAt: new Date()
      }
    }
  );

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        modifiedCount: result.modifiedCount
      },
      "All notifications marked as read"
    )
  );
});