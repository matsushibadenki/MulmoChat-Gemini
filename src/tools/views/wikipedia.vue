<template>
  <div class="w-full h-full overflow-auto p-6 bg-white">
    <div class="max-w-4xl mx-auto" v-if="selectedResult?.jsonData">
      <h2 class="text-3xl font-bold text-gray-800 mb-4">
        <a :href="selectedResult.url" target="_blank" class="hover:underline">{{ selectedResult.jsonData.title }}</a>
      </h2>

      <img v-if="selectedResult.imageData" :src="selectedResult.imageData" :alt="selectedResult.jsonData.title" class="w-full max-w-md mx-auto rounded-lg shadow-md mb-6">

      <div class="text-gray-700 leading-relaxed space-y-4">
        <p>{{ selectedResult.jsonData.summary }}</p>
      </div>

      <div class="mt-6 text-sm text-gray-500">
        Source: <a :href="selectedResult.url" target="_blank" class="text-blue-600 hover:underline">Wikipedia</a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolResult } from "../type";

defineProps<{
  selectedResult: ToolResult | null;
}>();
</script>