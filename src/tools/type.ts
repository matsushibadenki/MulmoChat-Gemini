// src/tools/type.ts

import * as GenerateImagePlugin from "./generateImage";
import * as EditImagePlugin from "./editImage";
import * as BrowsePlugin from "./browse";
import * as MulmocastPlugin from "./mulmocast";
import * as MapPlugin from "./map";
import * as ExaPlugin from "./exa";
import * as OthelloPlugin from "./othello";
import * as CanvasPlugin from "./canvas";
import * as WikipediaPlugin from "./wikipedia";
import * as GenerateImageWithTextPlugin from "./generateImageWithText";
import type { StartApiResponse } from "../../server/types";
import type { MulmoScript } from "mulmocast";
import { v4 as uuidv4 } from "uuid";

export interface ToolContext {
  currentResult: ToolResult | null;
}

export interface ToolResult {
  toolName?: string;
  uuid?: string;
  message: string;
  title?: string;
  imageData?: string;
  url?: string;
  jsonData?: any;
  instructions?: string;
  htmlData?: string;
  textOverImage?: string;
  location?: string | { lat: number; lng: number };
  updating?: boolean;
  prompt?: string;
  mulmoScript?: MulmoScript;
  images?: Record<string, string>;
}

export interface ToolResultComplete extends ToolResult {
  toolName: string;
  uuid: string;
}

export interface ToolPlugin {
  toolDefinition: {
    name: string;
    description: string;
    parameters?: {
      type: "object";
      properties: {
        [key: string]: any;
      };
      required: string[];
    };
  };
  execute: (
    context: ToolContext,
    args: Record<string, any>,
  ) => Promise<ToolResult>;
  generatingMessage: string;
  waitingMessage?: string;
  isEnabled: (startResponse?: StartApiResponse) => boolean;
  delayAfterExecution?: number;
  viewComponent?: any; // Vue component for rendering results
  previewComponent?: any; // Vue component for sidebar preview
}

const pluginList = [
  GenerateImagePlugin,
  EditImagePlugin,
  BrowsePlugin,
  MulmocastPlugin,
  MapPlugin,
  ExaPlugin,
  OthelloPlugin,
  CanvasPlugin,
  WikipediaPlugin,
  GenerateImageWithTextPlugin,
];

export const pluginTools = (startResponse?: StartApiResponse) => {
  return pluginList
    .filter((plugin) => plugin.plugin.isEnabled(startResponse))
    .map((plugin) => plugin.plugin.toolDefinition);
};

const plugins = pluginList.reduce(
  (acc, plugin) => {
    acc[plugin.plugin.toolDefinition.name] = plugin.plugin;
    return acc;
  },
  {} as Record<string, ToolPlugin>,
);

export const toolExecute = async (
  context: ToolContext,
  name: string,
  args: Record<string, any>,
): Promise<ToolResultComplete> => {
  console.log(`EXE:${name}\n`, args);
  const plugin = plugins[name];
  if (!plugin) {
    throw new Error(`Plugin ${name} not found`);
  }
  const result = await plugin.execute(context, args);
  return {
    ...result,
    toolName: name,
    uuid: uuidv4(),
  };
};

export const getToolPlugin = (name: string) => {
  return plugins[name] || null;
};