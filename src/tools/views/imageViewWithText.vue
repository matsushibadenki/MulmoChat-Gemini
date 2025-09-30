// src/tools/views/imageViewWithText.vue
// 画像とテキストオーバーレイを表示するVueコンポーネント

<template>
  <div class="w-full h-full flex items-center justify-center p-4">
    <div class="relative max-w-full max-h-full">
      <img
        v-if="selectedResult.imageData"
        :src="selectedResult.imageData"
        class="max-w-full max-h-full object-contain rounded"
        alt="Generated image"
      />
      <div
        v-if="selectedResult.textOverImage"
        class="absolute inset-0 flex items-center justify-center p-4"
      >
        <div
          class="text-white text-2xl font-bold bg-black bg-opacity-50 px-4 py-2 rounded"
          style="text-shadow: 2px 2px 4px rgba(0,0,0,0.8);"
        >
          {{ selectedResult.textOverImage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolResult } from "../type";

defineProps<{
  selectedResult: ToolResult;
}>();
</script>