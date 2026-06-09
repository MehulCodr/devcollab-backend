import mongoose from "mongoose";

const githubConnectionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true
    },
    githubUserId: {
      type: Number,
      required: true,
      index: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    displayName: {
      type: String,
      default: ""
    },
    avatarUrl: {
      type: String,
      default: ""
    },
    profileUrl: {
      type: String,
      default: ""
    },
    accessTokenEncrypted: {
      type: String,
      required: true,
      select: false
    },
    scopes: {
      type: [String],
      default: []
    },
    connectedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

export const GithubConnection = mongoose.model(
  "GithubConnection",
  githubConnectionSchema
);