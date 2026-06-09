import { Notification } from "../models/notification.model.js";
import { getIO } from "../socket/index.js";

const getId = (value) => {
  return value?._id?.toString() || value?.toString();
};

const getUniqueRecipients = (recipients = [], actor) => {
  const actorId = getId(actor);

  return [
    ...new Set(
      recipients
        .map((recipient) => getId(recipient))
        .filter(Boolean)
    )
  ].filter((recipientId) => recipientId !== actorId);
};

export const createNotification = async ({
  recipient,
  actor,
  organization = null,
  project = null,
  task = null,
  comment = null,
  type,
  title,
  message,
  link = "",
  metadata = {}
}) => {
  const recipientId = getId(recipient);
  const actorId = getId(actor);

  if (!recipientId || !actorId || recipientId === actorId) {
    return null;
  }

  const notif = await Notification.create({
    recipient: recipientId,
    actor: actorId,
    organization,
    project,
    task,
    comment,
    type,
    title,
    message,
    link,
    metadata
  });

  try {
    getIO().to(recipientId).emit("new_notification", { notification: notif });
  } catch (err) {
    console.error("Socket emit failed", err);
  }

  return notif;
};

export const createNotifications = async ({
  recipients = [],
  actor,
  organization = null,
  project = null,
  task = null,
  comment = null,
  type,
  title,
  message,
  link = "",
  metadata = {}
}) => {
  const recipientIds = getUniqueRecipients(recipients, actor);
  const actorId = getId(actor);

  if (!recipientIds.length || !actorId) {
    return [];
  }

  const notifs = await Notification.insertMany(
    recipientIds.map((recipientId) => ({
      recipient: recipientId,
      actor: actorId,
      organization,
      project,
      task,
      comment,
      type,
      title,
      message,
      link,
      metadata
    }))
  );

  try {
    const io = getIO();
    notifs.forEach((notif) => {
      io.to(notif.recipient.toString()).emit("new_notification", { notification: notif });
    });
  } catch (err) {
    console.error("Socket emit failed", err);
  }

  return notifs;
};

export const notifyTaskAssigned = async ({ task, actor, assignedTo }) => {
  return createNotification({
    recipient: assignedTo,
    actor,
    organization: task.organization,
    project: task.project,
    task: task._id,
    type: "task_assigned",
    title: "Task assigned",
    message: `You were assigned to task: ${task.title}`,
    link: `/tasks/${task._id}`,
    metadata: {
      taskTitle: task.title
    }
  });
};

export const notifyCommentMentions = async ({ comment, actor, mentions = [] }) => {
  return createNotifications({
    recipients: mentions,
    actor,
    organization: comment.organization,
    project: comment.project,
    task: comment.task,
    comment: comment._id,
    type: "comment_mention",
    title: "You were mentioned",
    message: "You were mentioned in a task comment",
    link: `/tasks/${comment.task}`,
    metadata: {
      commentId: comment._id
    }
  });
};

export const notifyTaskStatusChanged = async ({ task, actor, oldStatus, newStatus }) => {
  return createNotifications({
    recipients: [task.assignedTo, task.createdBy],
    actor,
    organization: task.organization,
    project: task.project,
    task: task._id,
    type: "task_status_changed",
    title: "Task status changed",
    message: `Task "${task.title}" moved from ${oldStatus} to ${newStatus}`,
    link: `/tasks/${task._id}`,
    metadata: {
      taskTitle: task.title,
      oldStatus,
      newStatus
    }
  });
};