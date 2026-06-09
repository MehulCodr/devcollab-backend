import mongoose from "mongoose";

const taskAttachmentSchema = new mongoose.Schema(
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
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },
    originalName: {
      type: String,
      required: true,
      trim: true
    },
    storedName: {
      type: String,
      required: true,
      trim: true
    },
    mimeType: {
      type: String,
      required: true
    },
    size: {
      type: Number,
      required: true
    },
    path: {
      type: String,
      default: ""
    },
    url: {
      type: String,
      required: true
    },
    provider: {
      type: String,
      enum: ["cloudinary", "local"],
      default: "cloudinary"
    },
    publicId: {
      type: String,
      default: ""
    },
    resourceType: {
      type: String,
      enum: ["image", "video", "raw"],
      default: "raw"
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

taskAttachmentSchema.index({ task: 1, createdAt: -1 });

export const TaskAttachment = mongoose.model("TaskAttachment", taskAttachmentSchema);