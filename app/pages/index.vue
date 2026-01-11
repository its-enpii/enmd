<script setup lang="ts">
import UrlInput from "~/components/UrlInput.vue";
import QualitySelector from "~/components/QualitySelector.vue";
import { useDownloader } from "~/composables/useDownloader";
import {
  Facebook,
  Instagram,
  Youtube,
  Zap,
  MoreHorizontal,
} from "lucide-vue-next";
import { ref, onMounted } from "vue";
import { useRoute } from "vue-router";

import MorePlatformsModal from "~/components/MorePlatformsModal.vue";

// Platform Config
const platforms = [
  { id: "auto", name: "Auto", icon: Zap, color: "text-yellow-500" },
  { id: "tiktok", name: "TikTok", icon: null, color: "text-black" },
  { id: "youtube", name: "YouTube", icon: Youtube, color: "text-red-500" },
  {
    id: "instagram",
    name: "Instagram",
    icon: Instagram,
    color: "text-pink-500",
  },
  { id: "facebook", name: "Facebook", icon: Facebook, color: "text-blue-600" },
  { id: "more", name: "More", icon: MoreHorizontal, color: "text-gray-500" },
];

const selectedPlatform = ref("auto");
const showMoreModal = ref(false);
const { loading, error, data, fetchVideoInfo } = useDownloader();
const route = useRoute();

const handleSearch = (url: string) => {
  fetchVideoInfo(url);
};

const selectPlatform = (id: string) => {
  if (id === "more") {
    showMoreModal.value = true;
    return;
  }
  selectedPlatform.value = id;
};

const handleModalSelect = (id: string) => {
  selectedPlatform.value = id;
  showMoreModal.value = false;
};

onMounted(() => {
  if (route.query.url) {
    handleSearch(route.query.url as string);
  }
});
</script>

<template>
  <div>
    <!-- Hero Banner Card -->
    <div
      class="rounded-3xl bg-gradient-to-r from-[#3D348B] to-[#E6AF2E] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl mb-12 animate-fade-in-down"
    >
      <div class="relative z-10 max-w-xl">
        <h2 class="text-3xl md:text-4xl font-extrabold mb-4">
          Social Media Downloader
        </h2>
        <p class="text-white/90 text-lg mb-0">
          Just paste your favorite video link and download it easily!
        </p>
      </div>

      <!-- Floating Icons (Decorative) -->
      <div
        class="absolute top-1/2 right-8 transform -translate-y-1/2 flex gap-4 opacity-90 hidden md:flex"
      >
        <div
          class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg rotate-12"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/e/e7/Instagram_logo_2016.svg"
            class="w-8 h-8"
            alt="Instagram"
          />
        </div>
        <div
          class="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-lg -rotate-6"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/b/b8/YouTube_Logo_2017.svg"
            class="w-8 h-8"
            alt="YouTube"
          />
        </div>
        <div
          class="w-12 h-12 bg-black rounded-xl flex items-center justify-center shadow-lg rotate-3"
        >
          <svg class="w-7 h-7 fill-white" viewBox="0 0 24 24">
            <path
              d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
            />
          </svg>
        </div>
      </div>
    </div>

    <!-- Platform Selectors -->
    <div class="text-center mb-8">
      <h3 class="text-lg font-bold mb-6 text-gray-700">
        Select the Platform of your Video
      </h3>
      <div class="grid grid-cols-3 md:grid-cols-6 gap-3">
        <button
          v-for="platform in platforms"
          :key="platform.id"
          @click="selectPlatform(platform.id)"
          class="p-3 rounded-xl shadow-sm border transition-all flex flex-col items-center gap-2 group relative overflow-hidden cursor-pointer"
          :class="
            selectedPlatform === platform.id
              ? 'bg-white border-[#3D348B] ring-2 ring-[#3D348B]/20 transform scale-105'
              : 'bg-white border-gray-100 hover:border-gray-300 hover:shadow-md'
          "
        >
          <div
            class="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            :class="
              selectedPlatform === platform.id ? 'bg-gray-100' : 'bg-gray-50'
            "
          >
            <component
              v-if="platform.icon"
              :is="platform.icon"
              class="w-5 h-5"
              :class="platform.color"
            />
            <svg
              v-else-if="platform.id === 'tiktok'"
              class="w-5 h-5 fill-black"
              viewBox="0 0 24 24"
            >
              <path
                d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"
              />
            </svg>
          </div>
          <span
            class="font-bold text-xs"
            :class="
              selectedPlatform === platform.id
                ? 'text-[#3D348B]'
                : 'text-gray-500'
            "
            >{{ platform.name }}</span
          >

          <!-- Active Indicator dot -->
          <div
            v-if="selectedPlatform === platform.id"
            class="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E6AF2E]"
          ></div>
        </button>
      </div>
    </div>

    <!-- Input Section -->
    <UrlInput
      @submit="handleSearch"
      :loading="loading"
      :platform="selectedPlatform"
      :initial-url="route.query.url as string"
    />

    <!-- Error State -->
    <div
      v-if="error"
      class="mt-8 p-4 bg-red-100 border border-red-200 text-red-600 rounded-xl flex items-center gap-3 animate-bounce-in font-medium"
    >
      <span class="text-lg">⚠️</span>
      {{ error }}
    </div>

    <!-- Result -->
    <QualitySelector v-if="data" :data="data" />
  </div>
  <MorePlatformsModal
    :show="showMoreModal"
    @close="showMoreModal = false"
    @select="handleModalSelect"
  />
</template>
