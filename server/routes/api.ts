import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { puppeteerCrawlerAgent } from "mulmocast";
import { StartApiResponse } from "../types";
import { exaSearch, hasExaApiKey } from "../exaSearch";

dotenv.config();

const router: Router = express.Router();

// Gemini APIクライアントの初期化
const geminiKey = process.env.GEMINI_API_KEY;
const genAI = geminiKey ? new GoogleGenerativeAI(geminiKey) : null;

// Text-to-Speechクライアントの条件付き初期化
let ttsClient: TextToSpeechClient | null = null;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    ttsClient = new TextToSpeechClient();
    console.log("✅ Text-to-Speech client initialized successfully.");
  } catch (error) {
    console.warn("⚠️ Could not initialize TextToSpeechClient even with credentials set. Speech synthesis will be disabled. Error:", error.message);
  }
} else {
  console.warn("⚠️ GOOGLE_APPLICATION_CREDENTIALS not set. Speech synthesis will be disabled.");
}

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

router.post("/chat", async (req: Request, res: Response): Promise<void> => {
  if (!genAI) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    return;
  }
  const { history, message, tools } = req.body;
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-pro-latest",
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
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

router.post("/synthesize-speech", async (req: Request, res: Response): Promise<void> => {
    if (!ttsClient) {
        const errorMessage = "Text-to-Speech client is not initialized because GOOGLE_APPLICATION_CREDENTIALS is not set.";
        console.error(errorMessage);
        res.status(500).json({ error: errorMessage });
        return;
    }
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

router.post("/generate-image", async (req: Request, res: Response): Promise<void> => {
    const { prompt, images } = req.body;
    if (!prompt || !genAI) {
        const message = !genAI ? "GEMINI_API_KEY not set" : "Prompt is required";
        res.status(500).json({ error: message });
        return;
    }
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-image-preview" });
        const contents: any[] = [{ text: prompt }];
        if (images) {
            for (const image of images) {
                contents.push({ inlineData: { mimeType: "image/png", data: image } });
            }
        }
        const response = await model.generateContent({ contents });
        const parts = response.response.candidates?.[0]?.content?.parts ?? [];
        const returnValue: { success: boolean; message?: string; imageData?: string } = { success: false };

        for (const part of parts) {
            if (part.text) returnValue.message = part.text;
            if (part.inlineData) {
                returnValue.success = true;
                returnValue.imageData = part.inlineData.data;
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
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({
            error: "Failed to generate image",
            details: errorMessage,
        });
    }
});

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

router.post("/exa-search", async (req: Request, res: Response): Promise<void> => {
    const { query, numResults = 3, includeText = true, ...options } = req.body;
    if (!query) {
      res.status(400).json({ error: "Query is required" });
      return;
    }
    try {
      const results = await exaSearch(query, {
        numResults: Math.min(numResults, 10),
        fetchText: includeText,
        ...options
      });
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
});

router.get("/twitter-embed", async (req: Request, res: Response): Promise<void> => {
    const { url } = req.query;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "URL query parameter is required" });
      return;
    }
    try {
      const urlObj = new URL(url);
      const isValidTwitterUrl = ["twitter.com", "www.twitter.com", "x.com", "www.x.com"].includes(urlObj.hostname);
      if (!isValidTwitterUrl) {
        res.status(400).json({ error: "URL must be a Twitter/X URL" });
        return;
      }
      const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}&theme=light&maxwidth=500&hide_thread=false&omit_script=false`;
      const response = await fetch(oembedUrl);
      if (!response.ok) {
        throw new Error(`Twitter oEmbed API error: ${response.status} ${response.statusText}`);
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
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to fetch Twitter embed",
        details: errorMessage,
      });
    }
});

router.post("/wikipedia-search", async (req: Request, res: Response): Promise<void> => {
    const { query } = req.body;
    if (!query) {
        res.status(400).json({ error: "Query is required" });
        return;
    }
    try {
        const searchUrl = `https://ja.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json`;
        const searchResponse = await fetch(searchUrl);
        const searchData = await searchResponse.json();
        if (!searchData.query.search.length) {
            res.json({ success: false, message: "No article found." });
            return;
        }
        const articleTitle = searchData.query.search[0].title;
        const summaryUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=extracts&exintro&explaintext&format=json`;
        const summaryResponse = await fetch(summaryUrl);
        const summaryData = await summaryResponse.json();
        const page = Object.values(summaryData.query.pages)[0] as any;
        const pageUrl = `https://ja.wikipedia.org/wiki/${encodeURIComponent(articleTitle)}`;
        const imageUrl = `https://ja.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(articleTitle)}&prop=pageimages&pithumbsize=500&format=json`;
        const imageResponse = await fetch(imageUrl);
        const imageData = await imageResponse.json();
        const imagePage = Object.values(imageData.query.pages)[0] as any;
        res.json({
            success: true,
            title: articleTitle,
            summary: page.extract,
            url: pageUrl,
            imageUrl: imagePage.thumbnail?.source,
        });
    } catch (error) {
        console.error("Wikipedia search error:", error);
        res.status(500).json({ error: "Failed to search Wikipedia" });
    }
});

export default router;
