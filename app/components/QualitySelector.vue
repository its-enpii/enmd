<script setup lang="ts">
import { Download, Film, Music, Loader2 } from "lucide-vue-next";
import { ref } from "vue";
import { useDownloader } from "~/composables/useDownloader";
import { useHistory } from "~/composables/useHistory";

const props = defineProps<{
  data: any;
}>();

const downloadingId = ref<string | null>(null);
const renderStatus = ref<string>("");
const { renderVideo } = useDownloader();
const { addToHistory } = useHistory();

const handleDownload = async (qualityId: string, url: string) => {
  if (downloadingId.value) return;

  downloadingId.value = qualityId;
  renderStatus.value = "Rendering... (This may take a moment)";

  try {
    // 1. Request Server to Render/Merge
    const filename = await renderVideo(
      url,
      qualityId,
      props.data.playlistIndex
    );

    // Add to history
    addToHistory({
      title: props.data.title || "Unknown Video",
      thumbnail: props.data.thumbnail || "",
      url: props.data.originalUrl || url || "", // Ensure valid URL
      platform: "auto",
      author: props.data.author,
      duration: props.data.duration,
    });

    // 2. Auto Download when ready
    renderStatus.value = "Starting Download...";

    // Construct filename: enmd-title-quality.mp4
    const safeTitle = (props.data.title || "video")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-") // Replace non-alphanumeric with hyphen
      .replace(/-+/g, "-") // Replace multiple hyphens with single
      .replace(/^-|-$/g, ""); // Trim hyphens

    const isAudio =
      qualityId === "audio" ||
      props.data.formats?.find((f: any) => f.id === qualityId)?.ext === "mp3";
    const ext = isAudio ? "mp3" : "mp4";
    const finalName = `enmd-${safeTitle}-${qualityId}.${ext}`;

    window.location.href = `/api/file?filename=${filename}&name=${encodeURIComponent(
      finalName
    )}`;

    // Reset after short delay
    setTimeout(() => {
      downloadingId.value = null;
      renderStatus.value = "";
    }, 3000);
  } catch (err) {
    console.error(err);
    renderStatus.value = "Failed to render!";
    setTimeout(() => {
      downloadingId.value = null;
      renderStatus.value = "";
    }, 3000);
  }
};
</script>

<template>
  <div v-if="data" class="w-full max-w-2xl mx-auto mt-8 animate-fade-in">
    <div
      class="bg-white rounded-2xl p-4 sm:p-6 shadow-xl border border-gray-100 overflow-hidden"
    >
      <!-- Header / Thumbnail -->
      <div class="flex flex-col sm:flex-row gap-4 mb-5">
        <div
          v-if="data.thumbnail"
          class="w-full sm:w-36 aspect-video rounded-xl overflow-hidden relative group shadow-sm flex-none"
        >
          <img
            :src="data.thumbnail"
            alt="Thumbnail"
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        <div class="flex-1 min-w-0">
          <h3
            class="text-base sm:text-xl font-bold text-[#040303] leading-snug line-clamp-2 mb-1.5"
          >
            {{ data.title || "Media Ready" }}
          </h3>
          <p
            class="text-xs text-gray-500 flex items-center gap-2"
            v-if="data.author || data.duration"
          >
            <span v-if="data.author">By {{ data.author }}</span>
            <span v-if="data.duration">• {{ data.duration }}</span>
          </p>
        </div>
      </div>

      <!-- Download Buttons list -->
      <div class="space-y-3">
        <div
          v-for="quality in data.formats"
          :key="quality.id"
          class="flex items-center justify-between gap-3 min-h-[64px] sm:min-h-[72px] p-3 sm:p-4 rounded-xl bg-[#F3F3F3] hover:bg-gray-200 border border-transparent hover:border-gray-300 transition-all group"
        >
          <!-- Left: icon + format info + dynamic status -->
          <div class="flex items-center gap-3 min-w-0">
            <div
              class="w-10 h-10 flex-none rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
              :class="
                quality.ext === 'mp3'
                  ? 'bg-[#E6AF2E]/20 text-[#b5891d]'
                  : 'bg-[#3D348B]/10 text-[#3D348B]'
              "
            >
              <Music v-if="quality.ext === 'mp3'" class="w-5 h-5" />
              <Film v-else class="w-5 h-5" />
            </div>
            <div class="min-w-0">
              <span
                class="text-[#040303] font-bold text-sm sm:text-base block leading-tight"
              >
                {{ quality.label }}
              </span>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-xs text-gray-500 uppercase font-medium">{{
                  quality.ext
                }}</span>
                <span
                  v-if="downloadingId === quality.id"
                  class="text-xs font-semibold animate-pulse"
                  :class="
                    renderStatus.includes('Failed')
                      ? 'text-red-500'
                      : 'text-[#3D348B]'
                  "
                >
                  • {{ renderStatus }}
                </span>
              </div>
            </div>
          </div>

          <!-- Right: download button only -->
          <button
            @click="
              handleDownload(quality.id, quality.url || data.originalUrl || '')
            "
            :disabled="!!downloadingId"
            class="flex-none px-3.5 py-2 sm:px-4 sm:py-2 rounded-lg bg-white text-[#040303] text-xs sm:text-sm font-bold border border-gray-200 hover:bg-[#3D348B] hover:text-white hover:border-[#3D348B] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <Loader2
              v-if="downloadingId === quality.id"
              class="w-4 h-4 animate-spin"
            />
            <Download v-else class="w-4 h-4" />
            {{ downloadingId === quality.id ? "Processing" : "Download" }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
