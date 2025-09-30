// src/tools/generateImageWithText.ts
// 画像生成とテキストオーバーレイを組み合わせた新しいツール

import { ToolPlugin, ToolContext, ToolResult } from "./type";
import { generateImageCommon } from "./generateImage";
import ImageViewWithText from "./views/imageViewWithText.vue";
import ImageWithTextPreview from "./previews/imageWithText.vue";

const toolName = "generateImageWithText";

const toolDefinition = {
  type: "function" as const,
  name: toolName,
  description:
    "Generate an image from a text prompt and overlay it with a specified text. Use this when you want to display accurate text on top of an image.",
  parameters: {
    type: "object" as const,
    properties: {
      prompt: {
        type: "string",
        description: "Description of the desired image in English.",
      },
      text: {
        type: "string",
        description: "The text to display over the image.",
      },
    },
    required: ["prompt", "text"],
  },
};

const generateImageWithText = async (
  context: ToolContext,
  args: Record<string, any>,
): Promise<ToolResult> => {
  const { prompt, text } = args;
  const imageResult = await generateImageCommon(context, prompt, false);

  if (imageResult.imageData) {
    return {
      ...imageResult,
      message: "Image generated with text overlay.",
      instructions:
        "Acknowledge that the image with text has been generated and presented.",
      textOverImage: text, // テキストを結果に含める
    };
  } else {
    return {
      ...imageResult,
      message: "Image generation failed, so text could not be overlaid.",
      instructions: "Acknowledge that the image generation failed.",
    };
  }
};

export const plugin: ToolPlugin = {
  toolDefinition,
  execute: generateImageWithText,
  generatingMessage: "Generating image with text...",
  isEnabled: () => true,
  viewComponent: ImageViewWithText,
  previewComponent: ImageWithTextPreview,
};