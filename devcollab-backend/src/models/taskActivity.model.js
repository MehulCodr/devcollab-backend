import mongoose from "mongoose";

const taskActivitySchema = new mongoose.Schema(
    {
        task: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Task",
            required: true,
            index: true
        },
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true
        },
        organization: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Organization",
            required: true,
            index: true
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        action: {
            type: String,
            required: true,
            enum: [
                "task_created",
                "task_updated",
                "task_deleted",
                "task_assigned",
                "task_unassigned",
                "status_changed",
                "priority_changed",
                "labels_updated",
                "due_date_updated",
                "subtask_added",
                "subtask_updated",
                "subtask_deleted",
                "comment_added",
                "comment_updated",
                "comment_deleted",
                "attachment_uploaded",
                "attachment_deleted",
                "github_issue_linked",
                "github_pr_merged"
            ]
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

taskActivitySchema.index({ task: 1, createdAt: -1 });

export const TaskActivity = mongoose.model("TaskActivity", taskActivitySchema);