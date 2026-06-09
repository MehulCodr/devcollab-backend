import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      minlength: [2, "Project name must be at least 2 characters"],
      maxlength: [100, "Project name cannot exceed 100 characters"]
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"]
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    status: {
      type: String,
      enum: ["active", "completed", "archived"],
      default: "active",
      index: true
    },
    startDate: {
      type: Date
    },
    dueDate: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ organization: 1, slug: 1 }, { unique: true });
projectSchema.index({ organization: 1, status: 1 });

export const Project = mongoose.model("Project", projectSchema);