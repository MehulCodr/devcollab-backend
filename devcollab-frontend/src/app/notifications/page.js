"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import AppShell from "@/components/AppShell";
import Panel from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

export default function NotificationsPage() {
  const router = useRouter();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filters, setFilters] = useState({
    isRead: "",
    type: ""
  });

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.isRead) {
      params.set("isRead", filters.isRead);
    }

    if (filters.type) {
      params.set("type", filters.type);
    }

    const value = params.toString();

    return value ? `?${value}` : "";
  }, [filters]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest(`/notifications${queryString}`);

      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      setError(error.message);

      if (error.message.toLowerCase().includes("unauthorized")) {
        router.push("/");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadNotifications);
  }, [queryString]);

  const handleFilterChange = (event) => {
    setFilters((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const handleMarkAsRead = async (notificationId) => {
    setUpdating(true);
    setError("");

    try {
      await apiRequest(`/notifications/${notificationId}/read`, {
        method: "PATCH"
      });

      await loadNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    setUpdating(true);
    setError("");

    try {
      await apiRequest("/notifications/read-all", {
        method: "PATCH"
      });

      await loadNotifications();
    } catch (error) {
      setError(error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleOpenNotification = async (notification) => {
    try {
      if (!notification.isRead) {
        await apiRequest(`/notifications/${notification._id}/read`, {
          method: "PATCH"
        });
      }
    } catch (error) {
    } finally {
      if (notification.link) {
        router.push(notification.link);
      }
    }
  };

  const formatDateTime = (value) => {
    if (!value) {
      return "";
    }

    return new Date(value).toLocaleString();
  };

  const getTypeLabel = (type) => {
    const labels = {
      task_assigned: "Task assigned",
      comment_mention: "Mention",
      task_status_changed: "Status changed"
    };

    return labels[type] || type;
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading notifications...</p>
      </main>
    );
  }

  return (
    <AppShell
      title="Notifications"
      description="Track task assignments, mentions, and task status changes."
      actions={
        <div className="rounded-2xl bg-slate-900 border border-slate-800 px-5 py-3">
          <p className="text-sm text-slate-400">Unread</p>
          <p className="text-2xl font-bold text-blue-300">{unreadCount}</p>
        </div>
      }
    >
      {error && (
        <p className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <Panel>
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Inbox</h2>
            <p className="text-slate-400 mt-2">Filter and manage your notifications.</p>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <select
              name="isRead"
              value={filters.isRead}
              onChange={handleFilterChange}
              className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">All</option>
              <option value="false">Unread</option>
              <option value="true">Read</option>
            </select>

            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
            >
              <option value="">All types</option>
              <option value="task_assigned">Task assigned</option>
              <option value="comment_mention">Mention</option>
              <option value="task_status_changed">Status changed</option>
            </select>

            <button
              onClick={handleMarkAllAsRead}
              disabled={updating || unreadCount === 0}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              Mark all read
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <EmptyState message="No notifications found." />
        ) : (
          <div className="mt-6 space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification._id}
                className={
                  notification.isRead
                    ? "rounded-xl border border-slate-800 bg-slate-950 p-5"
                    : "rounded-xl border border-blue-500/40 bg-blue-500/5 p-5"
                }
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="blue">{getTypeLabel(notification.type)}</Badge>
                      {!notification.isRead && <Badge variant="green">New</Badge>}
                    </div>

                    <h3 className="font-bold text-lg mt-3">{notification.title}</h3>
                    <p className="text-slate-300 mt-2">{notification.message}</p>

                    <div className="mt-4 space-y-1 text-sm text-slate-500">
                      <p>From: {notification.actor?.name || "Unknown user"}</p>
                      {notification.project?.name && <p>Project: {notification.project.name}</p>}
                      {notification.task?.title && <p>Task: {notification.task.title}</p>}
                      <p>{formatDateTime(notification.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    {notification.link && (
                      <button
                        onClick={() => handleOpenNotification(notification)}
                        className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                      >
                        Open
                      </button>
                    )}

                    {!notification.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notification._id)}
                        disabled={updating}
                        className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-900 disabled:opacity-60"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AppShell>
  );
}
