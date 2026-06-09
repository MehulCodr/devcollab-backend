import mongoose from "mongoose";

const githubTaskLinkSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
      index: true
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Task",
      required: true,
      index: true
    },
    repository: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GithubRepository",
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    githubIssueId: {
      type: Number,
      required: true,
      index: true
    },
    issueNumber: {
      type: Number,
      required: true
    },
    issueTitle: {
      type: String,
      required: true,
      trim: true
    },
    issueUrl: {
      type: String,
      required: true
    },
    issueState: {
      type: String,
      enum: ["open", "closed"],
      required: true
    },
    labels: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

githubTaskLinkSchema.index({ repository: 1, issueNumber: 1 }, { unique: true });
githubTaskLinkSchema.index({ task: 1, repository: 1 });

export const GithubTaskLink = mongoose.model("GithubTaskLink", githubTaskLinkSchema);