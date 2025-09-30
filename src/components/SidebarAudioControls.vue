<template>
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
</template>

<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  chatActive: boolean;
  connecting: boolean;
  isMuted: boolean;
}>();

defineEmits<{
  startChat: [];
  stopChat: [];
  toggleMute: [];
}>();

const audioEl = ref<HTMLAudioElement | null>(null);

defineExpose({
  audioEl,
});
</script>