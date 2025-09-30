import dotenv from "dotenv";

dotenv.config();

const geminiKey = process.env.GEMINI_API_KEY;

if (!geminiKey) {
  console.error("GEMINI_API_KEY is not set in your .env file.");
  process.exit(1);
}

async function listModels() {
  console.log("Fetching available models from Google AI REST API...\n");
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`API request failed with status ${response.status}: ${errorBody}`);
    }
    const data = await response.json();
    
    console.log("✅ Found the following models that support 'generateContent':");
    
    const models = data.models || [];
    models.forEach((model: any) => {
      if (model.supportedGenerationMethods.includes("generateContent")) {
        // 'models/' の部分を削除して表示
        const modelId = model.name.replace('models/', '');
        console.log(` - ${modelId}`);
      }
    });

  } catch (error) {
    console.error("Failed to fetch models:", error);
  }
}

listModels();