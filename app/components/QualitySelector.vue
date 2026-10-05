<script setup lang="ts">
import { Download, Film, Music, Loader2, RotateCcw, AlertCircle } from "lucide-vue-next";
import { ref } from "vue";
import { useDownloader } from "~/composables/useDownloader";
import { useHistory } from "~/composables/useHistory";

const props = defineProps<{
  data: any;
}>();

const downloadingId = ref<string | null>(null);
const errorId = ref<string | null>(null);
const completedDownloads = ref<Record<string, { url: string; name: string }>>({});
const { renderVideo } = useDownloader();
const { addToHistory } = useHistory();

const handleDownload = async (qualityId: string, url: string) => {
  if (downloadingId.value) return;

  // Already rendered before? Serve the cached file instantly, no server call.
  if (completedDownloads.value[qualityId]) {
    const cached = completedDownloads.value[qualityId];
    const a = document.createElement("a");
    a.href = cached.url;
    a.download = cached.name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
    }, 200);
    return;
  }

  downloadingId.value = qualityId;
  errorId.value = null;

  try {
    // 1. Request Server to Render/Merge
    const filename = await renderVideo(
      url,
      qualityId,
      props.data.playlistIndex
    );

    // Add to history (never allowed to break the download flow)
    addToHistory({
      title: props.data.title || "Unknown Video",
      thumbnail: props.data.thumbnail || "",
      url: props.data.originalUrl || url || "", // Ensure valid URL
      platform: "auto",
      author: props.data.author,
      duration: props.data.duration,
    });

    // 2. Trigger download when ready
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

    const downloadUrl = `/api/file?filename=${filename}&name=${encodeURIComponent(
      finalName
    )}`;

    // Remember the direct link so mobile browsers (iOS Safari etc.) that block
    // auto-download can offer a manual tap-to-download link.
    completedDownloads.value[qualityId] = { url: downloadUrl, name: finalName };

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) document.body.removeChild(a);
    }, 200);

    // Reset after short delay
    setTimeout(() => {
      downloadingId.value = null;
    }, 3000);
  } catch (err) {
    console.error(err);
    // Immediately reset so the button never stays stuck on "Processing".
    downloadingId.value = null;
    // Mark the failing option so its button becomes "Coba Lagi".
    errorId.value = qualityId;
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
          class="bg-[#F8F9FA] hover:bg-gray-100 rounded-2xl p-4 border border-gray-100 transition-all flex flex-col gap-2.5"
        >
          <!-- Main row: info on the left, action button on the right -->
          <div class="flex items-center justify-between gap-3">
            <!-- Left: icon + format info, vertically centered -->
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="w-11 h-11 rounded-xl flex items-center justify-center flex-none"
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
                  class="text-sm sm:text-base font-bold text-gray-900 leading-tight block truncate"
                >
                  {{ quality.label }}
                </span>
                <span class="text-xs font-semibold uppercase text-gray-400">{{
                  quality.ext
                }}</span>
              </div>
            </div>

            <!-- Right: action button -->
            <div class="flex-none">
              <!-- Rendering -->
              <button
                v-if="downloadingId === quality.id"
                disabled
                class="px-4 py-2.5 rounded-xl bg-purple-50 text-[#3D348B] border border-purple-200 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-wait"
              >
                <Loader2 class="w-4 h-4 animate-spin" />
                <span>Memproses...</span>
              </button>

              <!-- Ready: cached render, instant download -->
              <button
                v-else-if="completedDownloads[quality.id]"
                @click="
                  handleDownload(quality.id, quality.url || data.originalUrl || '')
                "
                class="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer transition-all"
              >
                <Download class="w-4 h-4 text-emerald-600" />
                <span>Unduh File</span>
              </button>

              <!-- Error: offer retry -->
              <button
                v-else-if="errorId === quality.id"
                @click="
                  handleDownload(quality.id, quality.url || data.originalUrl || '')
                "
                class="px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw class="w-4 h-4" />
                <span>Coba Lagi</span>
              </button>

              <!-- Normal -->
              <button
                v-else
                @click="
                  handleDownload(quality.id, quality.url || data.originalUrl || '')
                "
                class="px-4 py-2.5 rounded-xl bg-white text-[#040303] border border-gray-200 hover:bg-[#3D348B] hover:text-white hover:border-[#3D348B] text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <Download class="w-4 h-4" />
                <span>Download</span>
              </button>
            </div>
          </div>

          <!-- Compact error message (only when this option failed) -->
          <div
            v-if="errorId === quality.id"
            class="flex items-center gap-1.5 text-xs text-red-600 font-semibold"
          >
            <AlertCircle class="w-3.5 h-3.5 flex-none" />
            <span>Gagal memproses media.</span>
          </div>
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
