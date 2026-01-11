<script setup lang="ts">
import { Heart } from "lucide-vue-next";
</script>

<template>
  <footer class="mt-12 pt-8 pb-8 border-t border-gray-200/60">
    <div
      class="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6"
    >
      <!-- Brand & Copy -->
      <div
        class="flex flex-col items-center md:items-start text-center md:text-left"
      >
        <div class="flex items-center gap-2 mb-2">
          <img
            src="/logo.svg"
            alt="ENMD"
            class="w-6 h-6 object-contain opacity-80"
          />
          <span class="font-bold text-[#3D348B] text-lg tracking-tight"
            >ENMD</span
          >
        </div>
        <p class="text-xs text-gray-500 font-medium tracking-wide">
          © 2026 ENMD. All rights reserved.
        </p>
      </div>

      <!-- Tagline / Made With -->
      <div class="flex flex-col items-center md:items-end gap-1">
        <p class="text-xs text-gray-400 font-medium">
          Secure, Fast & High Quality.
        </p>
        <p
          class="text-[10px] text-gray-300 flex items-center gap-1 uppercase tracking-wider font-bold"
        >
          Made with <Heart class="w-3 h-3 text-red-400 fill-red-400" /> for
          creators
        </p>
      </div>
    </div>
  </footer>
</template>
