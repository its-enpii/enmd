<script setup lang="ts">
import { useHistory } from "~/composables/useHistory";
import { Clock, Trash2, ExternalLink, Play, Cookie } from "lucide-vue-next";
import { useState } from "#app";

// Use global state for cookie consent
const cookieConsent = useState<string | null>("cookieConsent");
const { history, removeHistoryItem, clearHistory } = useHistory();

const allowCookies = () => {
  localStorage.setItem("cookie_consent", "true");
  cookieConsent.value = "true";
  window.location.reload();
};

const handleDownloadAgain = (url: string) => {
  navigateTo({ path: "/", query: { url } });
};
</script>

<template>
  <div class="animate-fade-in-down">
    <div class="mb-8 flex justify-between items-end">
      <div>
        <h2 class="text-3xl font-extrabold text-[#3D348B] mb-2">
          My Downloads
        </h2>
        <p class="text-gray-500">Manage your downloaded history here.</p>
      </div>
      <button
        v-if="history.length"
        @click="clearHistory"
        class="text-red-500 text-sm font-semibold hover:text-red-600 flex items-center gap-1 cursor-pointer"
      >
        <Trash2 class="w-4 h-4" /> Clear All
      </button>
    </div>

    <!-- Cookie Declined State -->
    <div
      v-if="cookieConsent === 'false'"
      class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm text-center"
    >
      <div
        class="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4 text-[#E6AF2E]"
      >
        <Cookie class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-bold text-gray-700 mb-1">History Disabled</h3>
      <p class="text-gray-400 max-w-xs mx-auto mb-6">
        You declined cookies, so we can't save your download history. Allow
        cookies to use this feature.
      </p>
      <button
        @click="allowCookies"
        class="px-6 py-2 bg-[#E6AF2E] text-white rounded-xl font-bold hover:bg-[#d4a029] transition-all transform hover:scale-105 shadow-md shadow-orange-200 cursor-pointer"
      >
        Allow Cookies
      </button>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="history.length === 0"
      class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm text-center"
    >
      <div
        class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400"
      >
        <Clock class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-bold text-gray-700 mb-1">No downloads yet</h3>
      <p class="text-gray-400 max-w-xs mx-auto mb-6">
        Your download history will appear here once you start saving videos.
      </p>
      <button
        @click="navigateTo('/')"
        class="px-6 py-2 bg-[#F3F3F3] text-[#3D348B] rounded-xl font-bold hover:bg-[#E6AF2E] hover:text-white transition-all transform hover:scale-105 cursor-pointer"
      >
        Start Downloading
      </button>
    </div>

    <!-- History List -->
    <div v-else class="grid gap-4">
      <div
        v-for="item in history"
        :key="item.id"
        @click="handleDownloadAgain(item.url)"
        class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group relative"
      >
        <!-- Thumbnail -->
        <div
          class="relative w-32 aspect-video bg-gray-100 rounded-lg overflow-hidden flex-shrink-0"
        >
          <img :src="item.thumbnail" class="w-full h-full object-cover" />
          <div
            class="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"
          ></div>
          <div
            v-if="item.duration"
            class="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded font-medium"
          >
            {{ item.duration }}
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <h4
            class="font-bold text-[#040303] truncate-2-lines mb-1 text-sm md:text-base leading-tight"
          >
            {{ item.title }}
          </h4>
          <p class="text-xs text-gray-500 mb-1" v-if="item.author">
            {{ item.author }}
          </p>
          <a
            :href="item.url"
            target="_blank"
            @click.stop
            class="text-xs text-[#3D348B] hover:underline flex items-center gap-1 w-fit"
          >
            <ExternalLink class="w-3 h-3" /> Source
          </a>
        </div>

        <button
          @click.stop="removeHistoryItem(item.id)"
          class="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 transition-colors bg-white/80 hover:bg-white rounded-full z-10 cursor-pointer"
          title="Remove"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
</template>
