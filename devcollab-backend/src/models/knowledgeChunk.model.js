import mongoose from "mongoose";

const knowledgeChunkSchema = new mongoose.Schema(
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
    sourceType: {
      type: String,
      enum: [
        "task",
        "comment",
        "github_issue",
        "github_pr",
        "meeting_transcript",
        "manual_note"
      ],
      required: true,
      index: true
    },
    sourceId: {
      type: String,
      required: true,
      index: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    content: {
      type: String,
      required: true
    },
    embedding: {
      type: [Number],
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    indexedAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

knowledgeChunkSchema.index(
  {
    project: 1,
    sourceType: 1,
    sourceId: 1
  },
  {
    unique: true
  }
);

export const KnowledgeChunk = mongoose.model("KnowledgeChunk", knowledgeChunkSchema);