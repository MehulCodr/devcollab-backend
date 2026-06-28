import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";
import { SYSTEM_PROMPT } from "./prompts.js";

const GEMINI_MODEL = "gemini-2.5-flash";
const HISTORY_LIMIT = 10; // Keep the last 10 messages

// Initialize the Google GenAI client
let ai = null;
if (env.geminiApiKey) {
  ai = new GoogleGenAI({ apiKey: env.geminiApiKey });
}

const buildChatContext = (context) => {
  if (!context) return "";
  let contextStr = "\n\nAdditional Context:\n";
  if (context.organizationId) contextStr += `- Organization ID: ${context.organizationId}\n`;
  if (context.projectId) contextStr += `- Project ID: ${context.projectId}\n`;
  return contextStr;
};

export const generateChatResponse = async ({ message, history = [], context = {} }) => {
  if (!ai) {
    throw new Error("Gemini API key is not configured.");
  }

  try {
    // Process history: limit to last N messages, map 'assistant' to 'model'
    const recentHistory = history.slice(-HISTORY_LIMIT).map(msg => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content || "" }]
    }));

    const contextualizedMessage = message + buildChatContext(context);

    // Call the Gemini API via the official SDK
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        ...recentHistory,
        {
          role: "user",
          parts: [{ text: contextualizedMessage }]
        }
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.7,
      }
    });

    return {
      reply: response.text,
      usage: {
        tokens: response.usageMetadata?.totalTokenCount || 0,
      }
    };
  } catch (error) {
    console.error("[Gemini Chat Service] Error generating response:", error);
    throw new Error("Failed to generate AI response. Please try again.");
  }
};
