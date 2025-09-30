<template>
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
</template>

<script setup lang="ts">
import { ref, nextTick } from "vue";
import type { ToolResult } from "../tools/type";
import { getToolPlugin } from "../tools/type";

defineProps<{
  pluginResults: ToolResult[];
  isGeneratingImage: boolean;
  generatingMessage: string;
  selectedResult: ToolResult | null;
}>();

defineEmits<{
  selectResult: [result: ToolResult];
}>();

const imageContainer = ref<HTMLDivElement | null>(null);

function scrollToBottom(): void {
  nextTick(() => {
    if (imageContainer.value) {
      imageContainer.value.scrollTop = imageContainer.value.scrollHeight;
    }
  });
}

defineExpose({
  scrollToBottom,
});
</script>