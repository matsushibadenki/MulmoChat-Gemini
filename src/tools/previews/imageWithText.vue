// src/tools/previews/imageWithText.vue
// テキスト付き画像のプレビュー用Vueコンポーネント

<template>
  <div class="relative">
    <img
      v-if="result.imageData"
      :src="result.imageData"
      class="max-w-full h-auto rounded"
      alt="Generated image with text"
    />
    <div
      class="absolute bottom-1 right-1 bg-black bg-opacity-60 text-white rounded-sm p-0.5"
    >
      <span class="material-icons text-sm">title</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolResult } from "../type";

defineProps<{
  result: ToolResult;
}>();
</script>