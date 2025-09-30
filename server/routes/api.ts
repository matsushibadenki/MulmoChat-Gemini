// server/routes/api.ts
// Geminiクライアントのインポート元を正しいパッケージ名に修正

import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { puppeteerCrawlerAgent } from "mulmocast";
import { StartApiResponse } from "../types";
import { exaSearch, hasExaApiKey } from "../exaSearch";

dotenv.config();

const router: Router = express.Router();

// Gemini and TTS clients
const geminiKey = process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;
// const speechClient = new SpeechClient(); // Future implementation

// Future implementation: WebSocket server for streaming Speech-to-Text
/*
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws) => {
  console.log('Client connected for speech recognition');

  const recognizeStream = speechClient.streamingRecognize({
      config: {
          encoding: 'WEBM_OPUS', // or another format from client
          sampleRateHertz: 48000,
          languageCode: 'en-US',
      },
      interimResults: true,
  });

  recognizeStream.on('data', data => {
      // Send transcription back to client
      ws.send(JSON.stringify(data));
  });

  ws.on('message', (message) => {
      // Forward audio data from client to Google Cloud Speech API
      recognizeStream.write(message);
  });

  ws.on('close', () => {
      console.log('Client disconnected');
      recognizeStream.destroy();
  });

  ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      recognizeStream.destroy();
  });
});

export const upgradeWebSocket = (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
};
*/

// Session start endpoint (modified to remove OpenAI)
router.get("/start", async (req: Request, res: Response): Promise<void> => {
  const googleMapKey = process.env.GOOGLE_MAP_API_KEY;

  const responseData: StartApiResponse = {
    success: true,
    message: "Session configured for Gemini",
    googleMapKey,
    hasExaApiKey,
  };
  res.json(responseData);
});

// New chat endpoint for Gemini
router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  if (!genAI) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    return;
  }
  const { history, message, tools } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
      tools: tools ? { functionDeclarations: tools } : undefined,
    });
    
    const chat = model.startChat({ history });
    const result = await chat.sendMessage(message);
    const response = result.response;
    res.json({ response });

  } catch (error) {
    console.error("Gemini chat error:", error);
    res.status(500).json({ error: "Failed to get response from Gemini" });
  }
});

// New Text-to-Speech endpoint
router.post("/synthesize-speech", async (req: Request, res: Response): Promise<void> => {
    const { text } = req.body;
    if (!text) {
        res.status(400).json({ error: "Text is required" });
        return;
    }

    try {
        const request = {
            input: { text },
            voice: { languageCode: 'en-US', ssmlGender: 'NEUTRAL' as const },
            audioConfig: { audioEncoding: 'MP3' as const },
        };
        const [response] = await ttsClient.synthesizeSpeech(request);
        res.json({ audioContent: response.audioContent?.toString('base64') });
    } catch (error) {
        console.error("Speech synthesis error:", error);
        res.status(500).json({ error: "Failed to synthesize speech" });
    }
});


// Generate image endpoint (no changes needed here, as it already uses Gemini)
router.post(
  "/generate-image",
  async (req: Request, res: Response): Promise<void> => {
    const { prompt, images } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    if (!genAI) {
      res
        .status(500)
        .json({ error: "GEMINI_API_KEY environment variable not set" });
      return;
    }

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-image-preview" });

      const contents: {
        text?: string;
        inlineData?: { mimeType: string; data: string };
      }[] = [{ text: prompt }];
      for (const image of images ?? []) {
        contents.push({ inlineData: { mimeType: "image/png", data: image } });
      }
      const response = await model.generateContent({ contents });
      const parts = response.response.candidates?.[0]?.content?.parts ?? [];
      const returnValue: {
        success: boolean;
        message: string | undefined;
        imageData: string | undefined;
      } = {
        success: false,
        message: undefined,
        imageData: undefined,
      };

      console.log(
        "*** Gemini image generation response parts:",
        parts.length,
        prompt,
      );

      for (const part of parts) {
        if (part.text) {
          console.log("*** Gemini image generation response:", part.text);
          returnValue.message = part.text;
        }
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          if (imageData) {
            console.log("*** Image generation succeeded");
            returnValue.success = true;
            returnValue.imageData = imageData;
          } else {
            console.log("*** the part has inlineData, but no image data", part);
          }
        }
      }
      if (!returnValue.message) {
        returnValue.message = returnValue.imageData
          ? "image generation succeeded"
          : "no image data found in response";
      }

      res.json(returnValue);
    } catch (error: unknown) {
      console.error("*** Image generation failed", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to generate image",
        details: errorMessage,
      });
    }
  },
);

// Browse endpoint using mulmocast puppeteerCrawlerAgent
router.post("/browse", async (req: Request, res: Response): Promise<void> => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  try {
    const result = await puppeteerCrawlerAgent.agent({ namedInputs: { url } });
    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Browse failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to browse URL",
      details: errorMessage,
    });
  }
});

// Exa search endpoint
router.post(
  "/exa-search",
  async (req: Request, res: Response): Promise<void> => {
    const {
      query,
      numResults = 3,
      includeText = true,
      includeDomains,
      excludeDomains,
      startPublishedDate,
      endPublishedDate,
      fetchHighlights = false,
    } = req.body;

    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }

    try {
      const results = await exaSearch(query, {
        numResults: Math.min(numResults, 10),
        fetchText: includeText,
        fetchHighlights,
        includeDomains,
        excludeDomains,
        startPublishedDate,
        endPublishedDate,
      });

      console.log("*** Exa search results:", results.length, results[0]);

      res.json({
        success: true,
        results,
      });
    } catch (error: unknown) {
      console.error("Exa search failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to search with Exa",
        details: errorMessage,
      });
    }
  },
);

// Twitter oEmbed proxy endpoint
router.get(
  "/twitter-embed",
  async (req: Request, res: Response): Promise<void> => {
    const { url } = req.query;

    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL query parameter is required" });
      return;
    }

    try {
      // Validate that it's a Twitter/X URL
      const urlObj = new URL(url);
      const isValidTwitterUrl = [
        "twitter.com",
        "www.twitter.com",
        "x.com",
        "www.x.com",
      ].includes(urlObj.hostname);

      if (!isValidTwitterUrl) {
        res.status(400).json({ error: "URL must be a Twitter/X URL" });
        return;
      }

      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=light&maxwidth=500&hide_thread=false&omit_script=false`;

      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error(
          `Twitter oEmbed API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      res.json({
        success: true,
        html: data.html,
        author_name: data.author_name,
        author_url: data.author_url,
        url: data.url,
      });
    } catch (error: unknown) {
      console.error("Twitter embed failed:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch Twitter embed",
        details: errorMessage,
      });
    }
  },
);

// Wikipedia Search Endpoint
router.post("/wikipedia-search", async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body;
    if (!query) {
        res.status(400).json({ error: "Query is required" });
        return;
    }

    try {
        // 1. Search for Wikipedia article
        const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        if (!searchData.query.search.length) {
            res.json({ success: false, message: "No article found." });
            return;
        }
        const articleTitle = searchData.query.search[0].title;

        // 2. Get article summary
        const summaryUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=extracts&exintro&explaintext&format=json`;
        const summaryResponse = await fetch(summaryUrl);
        const summaryData = await summaryResponse.json();
        const page = Object.values(summaryData.query.pages)[0] as any;
        const summary = page.extract;
        const pageUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`;

        // 3. Get main image from the article
        const imageUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=pageimages&pithumbsize=500&format=json`;
        const imageResponse = await fetch(imageUrl);
        const imageData = await imageResponse.json();
        const imagePage = Object.values(imageData.query.pages)[0] as any;
        const mainImage = imagePage.thumbnail?.source;

        res.json({
            success: true,
            title: articleTitle,
            summary,
            url: pageUrl,
            imageUrl: mainImage,
        });

    } catch (error) {
        console.error("Wikipedia search error:", error);
        res.status(500).json({ error: "Failed to search Wikipedia" });
    }
});

export default router;
