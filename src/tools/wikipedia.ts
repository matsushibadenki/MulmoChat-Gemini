// src/tools/wikipedia.ts

import { ToolPlugin, ToolContext, ToolResult } from "./type";
import WikipediaView from "./views/wikipedia.vue";
import WikipediaPreview from "./previews/wikipedia.vue";

const toolName = "searchWikipedia";

const toolDefinition = {
  name: toolName,
  description:
    "Search Wikipedia for factual information about a topic. Use this for academic subjects, real-world things like animals, plants, historical events, or specific people when the user wants accurate information and real images instead of generated ones.",
  parameters: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description:
          "The search term for Wikipedia (e.g., 'Siberian Husky', 'Photosynthesis').",
      },
    },
    required: ["query"],
  },
};

const wikipediaSearch = async (
  context: ToolContext,
  args: Record<string, any>,
): Promise<ToolResult> => {
  const { query } = args;

  try {
    const response = await fetch("/api/wikipedia-search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success) {
      return {
        message: `Found Wikipedia article for "${data.title}"`,
        title: data.title,
        url: data.url,
        imageData: data.imageUrl,
        jsonData: data,
        instructions: `Acknowledge that you have found the Wikipedia article for "${data.title}" and briefly present the summary. The user can see the image.`,
      };
    } else {
      return {
        message: `Could not find a Wikipedia article for "${query}".`,
        instructions: "Acknowledge that no Wikipedia article was found for the query.",
      };
    }
  } catch (error) {
    console.error("Wikipedia tool error:", error);
    return {
      message: "An error occurred while searching Wikipedia.",
      instructions: "Acknowledge the error and suggest trying again.",
    };
  }
};

export const plugin: ToolPlugin = {
  toolDefinition,
  execute: wikipediaSearch,
  generatingMessage: "Searching Wikipedia...",
  isEnabled: () => true,
  viewComponent: WikipediaView,
  previewComponent: WikipediaPreview,
};
