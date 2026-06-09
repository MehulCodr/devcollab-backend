import mongoose from "mongoose";

const githubRepositorySchema = new mongoose.Schema(
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
    connection: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GithubConnection",
      required: true
    },
    connectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    githubRepoId: {
      type: Number,
      required: true,
      index: true
    },
    fullName: {
      type: String,
      required: true,
      trim: true
    },
    owner: {
      type: String,
      required: true,
      trim: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    private: {
      type: Boolean,
      default: false
    },
    htmlUrl: {
      type: String,
      required: true
    },
    defaultBranch: {
      type: String,
      default: "main"
    },
    lastSyncedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

githubRepositorySchema.index({ project: 1, githubRepoId: 1 }, { unique: true });
githubRepositorySchema.index({ project: 1, fullName: 1 }, { unique: true });

export const GithubRepository = mongoose.model(
  "GithubRepository",
  githubRepositorySchema
);