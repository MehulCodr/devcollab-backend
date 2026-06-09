import OpenAI from "openai";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";

const openai = new OpenAI({
  apiKey: env.openaiApiKey
});

const taskSuggestionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "suggestions"],
  properties: {
    summary: {
      type: "string"
    },
    suggestions: {
      type: "array",
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "description",
          "priority",
          "status",
          "labels",
          "dueDate",
          "suggestedAssigneeId",
          "suggestedAssigneeName",
          "confidence",
          "rationale"
        ],
        properties: {
          title: {
            type: "string"
          },
          description: {
            type: "string"
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"]
          },
          status: {
            type: "string",
            enum: ["backlog", "todo", "in-progress", "review", "completed"]
          },
          labels: {
            type: "array",
            items: {
              type: "string"
            }
          },
          dueDate: {
            type: ["string", "null"]
          },
          suggestedAssigneeId: {
            type: ["string", "null"]
          },
          suggestedAssigneeName: {
            type: ["string", "null"]
          },
          confidence: {
            type: "number",
            minimum: 0,
            maximum: 1
          },
          rationale: {
            type: "string"
          }
        }
      }
    }
  }
};

export const generateTaskSuggestionsWithAI = async ({
  transcript,
  project,
  members,
  workload
}) => {
  const memberContext = members.map((member) => ({
    userId: member.user._id.toString(),
    name: member.user.name,
    email: member.user.email,
    projectRole: member.role,
    workload: workload[member.user._id.toString()] || {
      totalTasks: 0,
      activeTasks: 0,
      completedTasks: 0,
      overdueTasks: 0
    }
  }));

  const response = await openai.responses.create({
    model: env.openaiModel,
    input: [
      {
        role: "system",
        content:
          "You are an AI project manager for a developer collaboration platform. Extract actionable software tasks from meeting transcripts. Suggest assignees only from the provided member list. Prefer people with relevant role and lower active workload. Do not invent user IDs. Return only structured JSON."
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
          members: memberContext,
          transcript
        })
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "devcollab_task_suggestions",
        strict: true,
        schema: taskSuggestionSchema
      }
    }
  });

  const raw = response.output_text;

  if (!raw) {
    throw new ApiError(500, "AI did not return a valid response");
  }

  return JSON.parse(raw);
};