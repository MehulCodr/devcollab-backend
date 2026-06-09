import mongoose from "mongoose";

const projectMemberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
    role: {
      type: String,
      enum: ["manager", "developer", "viewer"],
      default: "developer",
      required: true
    },
    status: {
      type: String,
      enum: ["active", "removed"],
      default: "active",
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

projectMemberSchema.index({ user: 1, project: 1 }, { unique: true });
projectMemberSchema.index({ project: 1, status: 1 });

export const ProjectMember = mongoose.model("ProjectMember", projectMemberSchema);