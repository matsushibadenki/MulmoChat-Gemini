// src/tools/mulmocast.ts

import { ToolPlugin, ToolContext, ToolResult } from "./type";
import { blankImageBase64 } from "./blank";
import MulmocastView from "./views/mulmocast.vue";
import MulmocastPreview from "./previews/mulmocast.vue";
import type { MulmoScript } from "mulmocast";
import { v4 as uuidv4 } from "uuid";

const toolName = "pushMulmoScript";

const toolDefinition = {
  name: toolName,
  description:
    "Let MulmoCast to process a given MulmoScript to generate a presentation of a given topic or story.",
  parameters: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "The title of the presentation" },
      lang: {
        type: "string",
        description: "The language of the presentation, such as en, ja, etc.",
      },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description:
                "The text to be spoken by the presenter, which is also used to generate an image. Typically 50 to 70 words.",
            },
          },
          required: ["text"],
        },
        minItems: 1,
      },
      style: {
        type: "string",
        enum: ["photorealistic", "anime", "comicstrips"],
        description: "The visual style for image generation",
      },
    },
    required: ["title", "lang", "beats", "style"],
  },
};

const mulmocast = async (
  context: ToolContext,
  args: Record<string, any>,
): Promise<ToolResult> => {
  console.log("MULMOSCRIPT:\n", JSON.stringify(args, null, 2));

  const { title, beats, style: styleParam } = args;

  const styleMap = {
    photorealistic:
      "<style>Photo realistic and cinematic. Let the art convey the story and emotions without text. Use the last image for the aspect ratio.</style>",
    anime:
      "<style>A highly polished 2D digital illustration in anime and manga style, featuring clean linework, soft shading, vivid colors, and expressive facial detailing. The composition emphasizes clarity and visual impact with a minimalistic background and a strong character focus. The lighting is even and bright, giving the image a crisp and energetic feel, reminiscent of high-quality character art used in Japanese visual novels or mobile games. Let the art convey the story and emotions without text. Use the last image for the aspect ratio.</style>",
    comicstrips:
      "<style>Ghibli style multi-panel comic strips in landscape mode. Use speech bubbles with short, natural dialogue (1–6 words). Keep text minimal. Use the last image for the aspect ratio.</style>",
  };

  const style =
    styleMap[styleParam as keyof typeof styleMap] || styleMap.photorealistic;

  // Generate beat objects with UUIDs first
  const beatsWithIds = beats.map((beat: { text: string }) => ({
    id: uuidv4(),
    speaker: "Presenter",
    text: beat.text,
  }));

  // Generate images for each beat concurrently
  const imagePromises = beatsWithIds.map(async (beat) => {
    const prompt = `generate image appropriate for the text. <text>${beat.text}</text>${style}`;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, images: [blankImageBase64] }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageData) {
          return { id: beat.id, imageData: data.imageData };
        }
      }
    } catch (error) {
      console.error(
        "EXC: exception\nFailed to generate image for beat:",
        error,
      );
    }
    return { id: beat.id, imageData: null };
  });

  const imageResults = await Promise.all(imagePromises);

  // Create images mapping from beat ID to imageData
  const imagesMap: Record<string, string> = {};
  imageResults.forEach((result) => {
    if (result.imageData) {
      imagesMap[result.id] = result.imageData;
    }
  });

  // Construct MulmoScript object
  const mulmoScript: MulmoScript = {
    $mulmocast: { version: "1.1" },
    canvasSize: {
      width: 1536,
      height: 1080,
    },
    imageParams: {
      provider: "google",
      model: "gemini-2.5-flash-image-preview",
      style,
    },
    audioParams: {
      padding: 0.2,
      introPadding: 0.5,
      closingPadding: 0.5,
      outroPadding: 0.5,
      bgmVolume: 0,
      audioVolume: 1,
      suppressSpeech: false,
    },
    soundEffectParams: {},
    speechParams: {
      speakers: {
        Presenter: {
          voiceId: "shimmer",
        },
      },
    },
    title,
    lang: args.lang,
    beats: beatsWithIds,
  };

  return {
    message: `Mulmocast has processed the MulmoScript for "${title}" with ${beats.length} beats.`,
    title,
    instructions: "Acknowledge that the mulmocast operation was completed.",
    mulmoScript,
    images: imagesMap,
  };
};

export const plugin: ToolPlugin = {
  toolDefinition,
  execute: mulmocast,
  generatingMessage: "Processing with Mulmocast...",
  waitingMessage: "Tell the user that you are processing with Mulmocast.",
  isEnabled: () => true,
  viewComponent: MulmocastView,
  previewComponent: MulmocastPreview,
};
