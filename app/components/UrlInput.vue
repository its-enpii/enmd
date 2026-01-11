<script setup lang="ts">
import { ref } from "vue";
import { Link, ArrowRight, Loader2 } from "lucide-vue-next";

const props = defineProps<{
  loading?: boolean;
  platform?: string;
  initialUrl?: string;
}>();

const emit = defineEmits<{
  (e: "submit", url: string): void;
}>();

const url = ref(props.initialUrl || "");
const error = ref("");

const placeholders: Record<string, string> = {
  auto: "Paste video URL here...",
  tiktok: "Paste TikTok video link...",
  youtube: "Paste YouTube video link...",
  instagram: "Paste Instagram reel/video link...",
  facebook: "Paste Facebook video link...",
  more: "Paste any supported video link...",
  twitter: "Paste Twitter/X video link...",
  twitch: "Paste Twitch clip/video link...",
  soundcloud: "Paste SoundCloud track link...",
  vimeo: "Paste Vimeo video link...",
  dailymotion: "Paste DailyMotion video link...",
  reddit: "Paste Reddit video link...",
  threads: "Paste Threads video link...",
  mixcloud: "Paste Mixcloud link...",
};

const validateUrl = (input: string, platform: string): boolean => {
  if (!platform || platform === "auto" || platform === "more") return true;

  const patterns: Record<string, RegExp[]> = {
    tiktok: [/tiktok\.com/, /vm\.tiktok\.com/],
    youtube: [/youtube\.com/, /youtu\.be/],
    instagram: [/instagram\.com/],
    facebook: [/facebook\.com/, /fb\.watch/],
    twitter: [/twitter\.com/, /x\.com/],
    twitch: [/twitch\.tv/],
    soundcloud: [/soundcloud\.com/],
    vimeo: [/vimeo\.com/],
    dailymotion: [/dailymotion\.com/, /dai\.ly/],
    reddit: [/reddit\.com/],
    threads: [/threads\.net/],
    mixcloud: [/mixcloud\.com/],
  };

  if (!patterns[platform]) return true;
  return patterns[platform].some((regex) => regex.test(input));
};

const handleSubmit = () => {
  error.value = "";
  if (!url.value) return;

  if (props.platform && !validateUrl(url.value, props.platform)) {
    error.value = `Invalid link! Please paste a valid ${props.platform} URL.`;
    // Auto-clear error after 3s
    setTimeout(() => (error.value = ""), 3000);
    return;
  }

  if (url.value && !props.loading) {
    emit("submit", url.value);
  }
};

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText();
    url.value = text;
    // Auto submit after paste
    if (text) {
      setTimeout(() => handleSubmit(), 100);
    }
  } catch (err) {
    console.error("Failed to read clipboard", err);
  }
};

const onInputPaste = () => {
  // Wait for input value to update
  setTimeout(() => {
    if (url.value) handleSubmit();
  }, 100);
};
</script>

<template>
  <div class="w-full max-w-2xl mx-auto relative group">
    <div
      class="absolute -inset-1 bg-gradient-to-r from-[#3D348B] via-[#E6AF2E] to-[#3D348B] rounded-2xl opacity-20 group-hover:opacity-40 blur transition duration-500"
    ></div>

    <div
      class="relative bg-white rounded-2xl p-2 shadow-xl flex items-center pr-2"
    >
      <div class="flex-none pl-4 text-gray-400">
        <Link class="w-5 h-5" />
      </div>

      <input
        v-model="url"
        @keyup.enter="handleSubmit"
        @paste="onInputPaste"
        type="text"
        :placeholder="
          placeholders[props.platform || 'auto'] || placeholders['more']
        "
        class="w-full bg-transparent border-none outline-none focus:outline-none text-[#040303] placeholder-gray-400 focus:ring-0 text-lg py-4 px-4 font-medium"
        :class="{ 'text-red-500': error }"
      />

      <div class="flex items-center gap-2">
        <button
          v-if="!url"
          @click="handlePaste"
          class="hidden md:flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-semibold transition-colors text-sm"
        >
          Paste
        </button>

        <button
          @click="handleSubmit"
          :disabled="!url || loading"
          class="flex items-center gap-2 px-6 py-3 bg-[#3D348B] hover:bg-[#2a2468] text-white rounded-xl font-bold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg shadow-purple-500/30"
        >
          <Loader2 v-if="loading" class="w-5 h-5 animate-spin" />
          <span v-else>Start</span>
          <ArrowRight v-if="!loading" class="w-5 h-5" />
        </button>
      </div>
    </div>

    <!-- Inline Validation Error -->
    <div
      v-if="error"
      class="absolute -bottom-8 left-0 w-full text-center text-red-500 text-sm font-bold animate-pulse"
    >
      {{ error }}
    </div>
  </div>
</template>
