<script setup lang="ts">
import {
  X,
  Twitter,
  Twitch,
  Music2,
  Video,
  MessagesSquare,
  Globe,
  Radio,
} from "lucide-vue-next";

defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "select", id: string): void;
}>();

const extraPlatforms = [
  { id: "twitter", name: "Twitter / X", icon: Twitter, color: "text-black" },
  { id: "twitch", name: "Twitch", icon: Twitch, color: "text-purple-600" },
  {
    id: "soundcloud",
    name: "SoundCloud",
    icon: Music2,
    color: "text-orange-500",
  },
  { id: "vimeo", name: "Vimeo", icon: Video, color: "text-blue-400" },
  {
    id: "dailymotion",
    name: "DailyMotion",
    icon: Video,
    color: "text-gray-700",
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: MessagesSquare,
    color: "text-orange-600",
  },
  { id: "threads", name: "Threads", icon: Globe, color: "text-black" },
  { id: "mixcloud", name: "Mixcloud", icon: Radio, color: "text-indigo-500" },
  // Add more as needed
];
</script>

<template>
  <Transition name="modal">
    <div
      v-if="show"
      class="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        @click="emit('close')"
      ></div>

      <!-- Content -->
      <div
        class="bg-white rounded-3xl w-full max-w-lg relative z-10 shadow-2xl p-6 md:p-8 animate-modal-in"
      >
        <button
          @click="emit('close')"
          class="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X class="w-6 h-6 text-gray-500" />
        </button>

        <h3 class="text-2xl font-bold text-[#3D348B] mb-2 text-center">
          More Supported Platforms
        </h3>
        <p class="text-center text-gray-500 mb-8">
          ENMD supports 1000+ websites. Select one to auto-configure:
        </p>

        <div class="grid grid-cols-3 sm:grid-cols-4 gap-4">
          <div
            v-for="platform in extraPlatforms"
            :key="platform.id"
            @click="emit('select', platform.id)"
            class="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-all group cursor-pointer active:scale-95 border border-transparent hover:border-gray-200"
          >
            <div
              class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm"
            >
              <component
                :is="platform.icon"
                class="w-6 h-6"
                :class="platform.color"
              />
            </div>
            <span class="text-xs font-semibold text-gray-700 text-center">{{
              platform.name
            }}</span>
          </div>
        </div>

        <div class="mt-8 text-center">
          <p class="text-sm text-gray-400">
            Just paste the link from any of these sites, and we'll handle the
            rest!
          </p>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes modal-in {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
.animate-modal-in {
  animation: modal-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>
