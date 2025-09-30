<template>
  <div class="flex items-center space-x-3 p-2 bg-gray-100 rounded">
    <div class="flex-shrink-0">
      <span class="text-2xl">📖</span>
    </div>
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-gray-800 truncate">Wikipedia Search</div>
      <div class="text-xs text-gray-500 truncate">
        {{ result.title || result.jsonData?.query }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ToolResult } from "../type";

defineProps<{
  result: ToolResult;
}>();
</script>