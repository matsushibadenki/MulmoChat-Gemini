<template>
  <div
    class="w-full md:w-60 md:flex-shrink-0 bg-gray-50 border rounded p-4 flex flex-col space-y-4 h-2/5 md:h-full"
  >
    <div class="space-y-2 flex-shrink-0">
      <button
        v-if="!chatActive"
        @click="$emit('startChat')"
        :disabled="connecting"
        class="w-full px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {{ connecting ? "Connecting..." : "Start Voice Chat" }}
      </button>
      <div v-else class="flex gap-2">
        <button
          @click="$emit('stopChat')"
          class="flex-1 px-4 py-2 bg-red-600 text-white rounded"
        >
          Stop
        </button>
        <button
          @click="$emit('toggleMute')"
          class="px-3 py-2 rounded border flex items-center justify-center"
          :class="
            isMuted
              ? 'bg-red-100 text-red-600 border-red-300'
              : 'bg-gray-100 text-gray-600 border-gray-300'
          "
          :title="isMuted ? 'Unmute microphone' : 'Mute microphone'"
        >
          <span class="material-icons text-lg">{{
            isMuted ? "mic_off" : "mic"
          }}</span>
        </button>
      </div>
      <audio ref="audioEl" autoplay></audio>
    </div>

    <div class="flex-1 flex flex-col min-h-0">
      <div
        ref="imageContainer"
        class="border rounded p-2 overflow-y-auto space-y-2 flex-1"
      >
        <div
          v-if="!pluginResults.length && !isGeneratingImage"
          class="text-gray-500 text-sm"
        >
          Feel free to ask me any questions...
        </div>
        <div
          v-for="(result, index) in pluginResults"
          :key="index"
          class="cursor-pointer hover:opacity-75 transition-opacity border rounded p-2"
          :class="{ 'ring-2 ring-blue-500': selectedResult === result }"
          @click="$emit('selectResult', result)"
        >
          <component
            v-if="getToolPlugin(result.toolName)?.previewComponent"
            :is="getToolPlugin(result.toolName).previewComponent"
            :result="result"
          />
        </div>
        <div
          v-if="isGeneratingImage"
          class="flex items-center justify-center py-4"
        >
          <div
            class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
          ></div>
          <span class="ml-2 text-sm text-gray-600">{{
            generatingMessage
          }}</span>
        </div>
      </div>
    </div>

    <div class="space-y-2 flex-shrink-0">
      <div class="flex gap-2">
        <button
          @click="triggerImageUpload"
          class="px-3 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded hover:bg-gray-200 flex items-center justify-center"
          title="Upload image"
        >
          <span class="text-lg">+</span>
        </button>
        <input
          :value="userInput"
          @input="
            $emit('update:userInput', ($event.target as HTMLInputElement).value)
          "
          @keyup.enter.prevent="$emit('sendTextMessage')"
          :disabled="!chatActive"
          type="text"
          placeholder="Type a message"
          class="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
        />
      </div>
      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg"
        multiple
        class="hidden"
        @change="handleImageUpload"
      />
      <button
        @click="$emit('sendTextMessage')"
        :disabled="!chatActive || !userInput.trim()"
        class="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
      >
        Send Message
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, defineProps, defineEmits } from "vue";
import type { ToolResult } from "../tools/type";
import { getToolPlugin } from "../tools/type";

defineProps<{
  chatActive: boolean;
  connecting: boolean;
  pluginResults: ToolResult[];
  isGeneratingImage: boolean;
  generatingMessage: string;
  selectedResult: ToolResult | null;
  userInput: string;
  isMuted: boolean;
}>();

const emit = defineEmits<{
  startChat: [];
  stopChat: [];
  toggleMute: [];
  selectResult: [result: ToolResult];
  sendTextMessage: [];
  "update:userInput": [value: string];
  uploadImages: [imageData: string[], fileNames: string[]];
}>();

const audioEl = ref<HTMLAudioElement | null>(null);
const imageContainer = ref<HTMLDivElement | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);

function scrollToBottom(): void {
  nextTick(() => {
    if (imageContainer.value) {
      imageContainer.value.scrollTop = imageContainer.value.scrollHeight;
    }
  });
}

function triggerImageUpload(): void {
  fileInput.value?.click();
}

function handleImageUpload(event: Event): void {
  const target = event.target as HTMLInputElement;
  const files = target.files;
  if (files && files.length > 0) {
    const imageDataArray: string[] = [];
    const fileNamesArray: string[] = [];
    let loadedCount = 0;
    const validFiles = Array.from(files).filter(
      (file) => file.type === "image/png" || file.type === "image/jpeg",
    );

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        imageDataArray.push(imageData);
        fileNamesArray.push(file.name);
        loadedCount++;

        if (loadedCount === validFiles.length) {
          emit("uploadImages", imageDataArray, fileNamesArray);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset the input so the same files can be uploaded again
    target.value = "";
  }
}

defineExpose({
  audioEl,
  scrollToBottom,
});
</script>