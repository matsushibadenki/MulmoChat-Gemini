<template>
  <div class="flex-shrink-0">
    <div class="flex items-center gap-2">
      <button
        @click="triggerImageUpload"
        class="p-2 bg-gray-100 text-gray-600 border border-gray-300 rounded hover:bg-gray-200 flex-shrink-0"
        title="Upload image"
      >
        <span class="material-icons text-lg leading-none">add</span>
      </button>

      <input
        ref="fileInput"
        type="file"
        accept="image/png,image/jpeg"
        multiple
        class="hidden"
        @change="handleImageUpload"
      />

      <input
        :value="userInput"
        @input="$emit('update:userInput', ($event.target as HTMLInputElement).value)"
        @keyup.enter.prevent="$emit('sendTextMessage')"
        :disabled="!chatActive"
        type="text"
        placeholder="Type a message"
        class="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />

      <button
        @click="$emit('sendTextMessage')"
        :disabled="!chatActive || !userInput.trim()"
        class="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 flex-shrink-0"
      >
        Send
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  userInput: string;
  chatActive: boolean;
}>();

const emit = defineEmits<{
  sendTextMessage: [];
  "update:userInput": [value: string];
  uploadImages: [imageData: string[], fileNames: string[]];
}>();

const fileInput = ref<HTMLInputElement | null>(null);

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

    target.value = "";
  }
}
</script>