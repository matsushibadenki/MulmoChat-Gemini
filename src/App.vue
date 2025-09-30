<template>
  <div class="p-4 space-y-4">
    <div role="toolbar" class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">
        MulmoChat
        <span class="text-sm text-gray-500 font-normal"
          >NLUI of AI-native Operating System with Gemini</span
        >
      </h1>
      <button
        @click="showConfigPopup = true"
        class="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        title="Configuration"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <div class="flex space-x-4" style="height: calc(100vh - 80px)">
      <div class="flex-1 flex flex-col">
        <div class="flex-1 border rounded bg-gray-50 overflow-hidden">
          <component
            v-if="
              selectedResult &&
              getToolPlugin(selectedResult.toolName)?.viewComponent
            "
            :is="getToolPlugin(selectedResult.toolName).viewComponent"
            :selected-result="selectedResult"
            :send-text-message="sendTextMessage"
            :google-map-key="startResponse?.googleMapKey || null"
            @update-result="handleUpdateResult"
          />
          <div
            v-if="!selectedResult"
            class="w-full h-full flex items-center justify-center"
          >
            <div class="text-gray-400 text-lg">Canvas</div>
          </div>
        </div>
      </div>

      <Sidebar
        ref="sidebarRef"
        :chat-active="chatActive"
        :connecting="connecting"
        :plugin-results="toolResults"
        :is-generating-image="isGeneratingImage"
        :generating-message="generatingMessage"
        :selected-result="selectedResult"
        :user-input="userInput"
        :is-muted="isMuted"
        @start-chat="startChat"
        @stop-chat="stopChat"
        @toggle-mute="toggleMute"
        @select-result="handleSelectResult"
        @send-text-message="sendTextMessage"
        @update:user-input="userInput = $event"
        @upload-images="handleUploadImages"
      />
    </div>

    <div
      v-if="showConfigPopup"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showConfigPopup = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Configuration</h2>
          <button
            @click="showConfigPopup = false"
            class="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              v-model="systemPrompt"
              placeholder="You are a helpful assistant."
              class="w-full border rounded px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div class="flex justify-end">
            <button
              @click="showConfigPopup = false"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted } from "vue";
import {
  pluginTools,
  toolExecute,
  ToolResult,
  ToolContext,
  getToolPlugin,
} from "./tools/type";
import { createUploadedImageResult } from "./tools/generateImage";
import type { StartApiResponse } from "../server/types";
import Sidebar from "./components/Sidebar.vue";

const SYSTEM_PROMPT_KEY = "system_prompt_v2_gemini";
const DEFAULT_SYSTEM_PROMPT =
  "You are a teacher who explains various things in a way that even middle school students can easily understand. When words alone are not enough, you MUST use the generateImage API to draw pictures and use them to help explain. When you are talking about places, objects, people, movies, books and other things, you MUST use the generateImage API to draw pictures to make the conversation more engaging.";
const sidebarRef = ref<InstanceType<typeof Sidebar> | null>(null);
const connecting = ref(false);
const systemPrompt = ref(
  localStorage.getItem(SYSTEM_PROMPT_KEY) || DEFAULT_SYSTEM_PROMPT,
);

const conversationHistory = ref<any[]>([]);
const toolResults = ref<ToolResult[]>([]);
const isGeneratingImage = ref(false);
const generatingMessage = ref("");
const showConfigPopup = ref(false);
const selectedResult = ref<ToolResult | null>(null);
const userInput = ref("");
const startResponse = ref<StartApiResponse | null>(null);

watch(systemPrompt, (val) => {
  localStorage.setItem(SYSTEM_PROMPT_KEY, val);
});

const chatActive = ref(false);
const isMuted = ref(false);
const isListening = ref(false);
let recognition: SpeechRecognition | null = null;

onMounted(async () => {
    try {
        const response = await fetch("/api/start");
        startResponse.value = await response.json();
    } catch (error) {
        console.error("Failed to fetch initial config:", error);
    }
});


const scrollToBottomOfSideBar = () => {
  sidebarRef.value?.scrollToBottom();
}

const scrollCurrentResultToTop = () => {
  // This function can be simplified or removed if not needed for the new architecture
  nextTick(() => {
    // ... logic to scroll main content ...
  });
}

const processToolCall = async (toolCall: any): Promise<void> => {
    const { name, args } = toolCall.functionCall;
    isGeneratingImage.value = true;
    generatingMessage.value = getToolPlugin(name)?.generatingMessage || "Processing...";
    scrollToBottomOfSideBar();

    try {
        const context: ToolContext = { currentResult: selectedResult.value };
        const result = await toolExecute(context, name, args);

        if (result.updating && context.currentResult && result.toolName === context.currentResult.toolName) {
            const index = toolResults.value.findIndex(r => r.uuid === context.currentResult?.uuid);
            if (index !== -1) toolResults.value[index] = result;
        } else {
            toolResults.value.push(result);
            selectedResult.value = result;
            scrollToBottomOfSideBar();
            scrollCurrentResultToTop();
        }
        
        const functionResponse = {
            toolResponse: {
                name,
                content: {
                    status: result.message,
                    data: result.jsonData
                }
            }
        };

        // Send tool response back to Gemini
        await processMessage(null, [functionResponse]);

    } catch (e) {
        console.error("Tool execution failed", e);
        // Inform Gemini about the failure
         const functionResponse = {
            toolResponse: {
                name,
                content: {
                    error: `Tool execution failed: ${e}`
                }
            }
        };
        await processMessage(null, [functionResponse]);
    } finally {
        isGeneratingImage.value = false;
        generatingMessage.value = "";
    }
}

const processMessage = async (message: string | null, toolResponses?: any[]) => {
    if (!chatActive.value) return;

    let parts: any[] = [];
    if(message) parts.push({text: message});
    if(toolResponses) {
        toolResponses.forEach(toolResponse => {
            parts.push({functionResponse: toolResponse.toolResponse});
        })
    }

    conversationHistory.value.push({ role: "user", parts });

    const tools = pluginTools(startResponse.value);

    try {
        const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                history: [
                    { role: "user", parts: [{ text: systemPrompt.value }] },
                    { role: "model", parts: [{ text: "Ok, I am ready." }] },
                    ...conversationHistory.value
                ],
                message: parts,
                tools,
            }),
        });

        const data = await res.json();
        const responseParts = data.response.candidates[0].content.parts;
        conversationHistory.value.push({ role: "model", parts: responseParts });

        let textResponse = "";
        const toolCalls = [];

        for(const part of responseParts) {
            if(part.text) {
                textResponse += part.text;
            } else if (part.functionCall) {
                toolCalls.push(part);
            }
        }

        if (textResponse) {
            await synthesizeAndPlay(textResponse);
        }

        if (toolCalls.length > 0) {
            for(const toolCall of toolCalls) {
               await processToolCall(toolCall);
            }
        }
    } catch (error) {
        console.error("Chat API error:", error);
    }
}


const synthesizeAndPlay = async (text: string) => {
    try {
        const response = await fetch("/api/synthesize-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text }),
        });
        const data = await response.json();
        if (data.audioContent && sidebarRef.value?.audioEl) {
            const audioSrc = `data:audio/mp3;base64,${data.audioContent}`;
            sidebarRef.value.audioEl.src = audioSrc;
            sidebarRef.value.audioEl.play();
        }
    } catch (error) {
        console.error("Failed to synthesize or play audio:", error);
    }
};

const startChat = () => {
    if (chatActive.value) return;
    chatActive.value = true;
    connecting.value = false;
    startListening();
};

const stopChat = () => {
    if (!chatActive.value) return;
    chatActive.value = false;
    stopListening();
};

const startListening = () => {
    if (isListening.value || !chatActive.value) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech Recognition not supported in this browser.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
        isListening.value = true;
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        userInput.value = transcript;
        sendTextMessage();
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
        isListening.value = false;
        // Automatically restart listening if chat is still active
        if (chatActive.value) {
            recognition?.start();
        }
    };

    recognition.start();
};

const stopListening = () => {
    if (recognition) {
        recognition.stop();
        recognition = null;
    }
    isListening.value = false;
};

const sendTextMessage = async () => {
  const text = userInput.value.trim();
  if (!text) return;

  await processMessage(text);
  userInput.value = "";
}

const handleSelectResult = (result: ToolResult) => {
  selectedResult.value = result;
  scrollCurrentResultToTop();
}

const handleUpdateResult = (updatedResult: ToolResult) => {
    const index = toolResults.value.findIndex(r => r.uuid === updatedResult.uuid);
    if (index !== -1) {
        toolResults.value[index] = updatedResult;
    }
    if (selectedResult.value?.uuid === updatedResult.uuid) {
        selectedResult.value = updatedResult;
    }
}

const handleUploadImages = (imageDataArray: string[], fileNamesArray: string[]) => {
    imageDataArray.forEach((imageData, index) => {
        const fileName = fileNamesArray[index];
        const result = createUploadedImageResult(
            imageData,
            fileName,
            `Uploaded by the user: ${fileName}`,
        );
        const completeResult = { ...result, uuid: crypto.randomUUID() };
        toolResults.value.push(completeResult);
        selectedResult.value = completeResult;
    });
    scrollToBottomOfSideBar();
    scrollCurrentResultToTop();
}

const toggleMute = () => {
    isMuted.value = !isMuted.value;
    if (isMuted.value) {
        stopListening();
    } else if (chatActive.value) {
        startListening();
    }
};

</script>

<style scoped></style>
