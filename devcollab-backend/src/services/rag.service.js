import OpenAI from "openai";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { KnowledgeChunk } from "../models/knowledgeChunk.model.js";
import { ApiError } from "../utils/ApiError.js";

const openai = new OpenAI({
  apiKey: env.openaiApiKey
});

const ragAnswerSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "sources", "suggestedActions"],
  properties: {
    answer: {
      type: "string"
    },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "sourceType", "reason"],
        properties: {
          title: {
            type: "string"
          },
          sourceType: {
            type: "string"
          },
          reason: {
            type: "string"
          }
        }
      }
    },
    suggestedActions: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

const riskAnalysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "healthScore",
    "summary",
    "risks",
    "overloadedMembers",
    "blockedOrStaleTasks",
    "recommendations",
    "nextBestActions"
  ],
  properties: {
    healthScore: {
      type: "number",
      minimum: 0,
      maximum: 100
    },
    summary: {
      type: "string"
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "severity", "evidence", "recommendation"],
        properties: {
          title: {
            type: "string"
          },
          severity: {
            type: "string",
            enum: ["low", "medium", "high", "critical"]
          },
          evidence: {
            type: "string"
          },
          recommendation: {
            type: "string"
          }
        }
      }
    },
    overloadedMembers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "reason", "recommendation"],
        properties: {
          name: {
            type: "string"
          },
          reason: {
            type: "string"
          },
          recommendation: {
            type: "string"
          }
        }
      }
    },
    blockedOrStaleTasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "reason", "recommendation"],
        properties: {
          title: {
            type: "string"
          },
          reason: {
            type: "string"
          },
          recommendation: {
            type: "string"
          }
        }
      }
    },
    recommendations: {
      type: "array",
      items: {
        type: "string"
      }
    },
    nextBestActions: {
      type: "array",
      items: {
        type: "string"
      }
    }
  }
};

const normalizeText = (value = "") => {
  return value.toString().replace(/\s+/g, " ").trim().slice(0, 7000);
};

export const createEmbedding = async (text) => {
  const normalized = normalizeText(text);

  if (!normalized) {
    throw new ApiError(400, "Cannot create embedding for empty text");
  }

  const response = await openai.embeddings.create({
    model: env.openaiEmbeddingModel,
    input: normalized
  });

  return response.data[0].embedding;
};

export const upsertKnowledgeChunk = async ({
  organization,
  project,
  sourceType,
  sourceId,
  title,
  content,
  metadata = {}
}) => {
  const normalizedContent = normalizeText(content);

  if (!normalizedContent) {
    return null;
  }

  const embedding = await createEmbedding(`${title}\n\n${normalizedContent}`);

  return KnowledgeChunk.findOneAndUpdate(
    {
      project,
      sourceType,
      sourceId: sourceId.toString()
    },
    {
      $set: {
        organization,
        project,
        sourceType,
        sourceId: sourceId.toString(),
        title,
        content: normalizedContent,
        embedding,
        metadata,
        indexedAt: new Date()
      }
    },
    {
      upsert: true,
      new: true,
      runValidators: true
    }
  );
};

export const searchProjectKnowledge = async ({ projectId, query, limit = 8 }) => {
  const queryEmbedding = await createEmbedding(query);

  return KnowledgeChunk.aggregate([
    {
      $vectorSearch: {
        index: "knowledge_vector_index",
        path: "embedding",
        queryVector: queryEmbedding,
        numCandidates: 100,
        limit,
        filter: {
          project: new mongoose.Types.ObjectId(projectId)
        }
      }
    },
    {
      $project: {
        title: 1,
        content: 1,
        sourceType: 1,
        sourceId: 1,
        metadata: 1,
        score: {
          $meta: "vectorSearchScore"
        }
      }
    }
  ]);
};

export const generateRagAnswer = async ({ project, query, chunks }) => {
  const context = chunks.map((chunk, index) => ({
    index: index + 1,
    title: chunk.title,
    sourceType: chunk.sourceType,
    content: chunk.content,
    metadata: chunk.metadata,
    score: chunk.score
  }));

  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content:
          "You are DevCollab AI. Answer only using the provided project context. If the context is insufficient, say what is missing. Be practical and specific."
      },
      {
        role: "user",
        content: JSON.stringify({
          project: {
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            status: project.status
          },
          question: query,
          retrievedContext: context
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "devcollab_rag_answer",
        strict: true,
        schema: ragAnswerSchema
      }
    }
  });

  if (!response.output_text) {
    throw new ApiError(500, "AI did not return a valid RAG answer");
  }

  return JSON.parse(response.output_text);
};

export const generateProjectRiskAnalysis = async ({
  project,
  taskStats,
  workloadByMember,
  contextChunks
}) => {
  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content:
          "You are an expert engineering project manager. Analyze project risks using task metrics, workload, comments, GitHub issue context, and retrieved knowledge. Return practical recommendations."
      },
      {
        role: "user",
        content: JSON.stringify({
          project: {
            id: project._id.toString(),
            name: project.name,
            description: project.description,
            status: project.status,
            dueDate: project.dueDate
          },
          taskStats,
          workloadByMember,
          retrievedContext: contextChunks.map((chunk) => ({
            title: chunk.title,
            sourceType: chunk.sourceType,
            content: chunk.content,
            metadata: chunk.metadata
          }))
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "devcollab_project_risk_analysis",
        strict: true,
        schema: riskAnalysisSchema
      }
    }
  });

  if (!response.output_text) {
    throw new ApiError(500, "AI did not return a valid risk analysis");
  }

  return JSON.parse(response.output_text);
};