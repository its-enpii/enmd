<script setup lang="ts">
import { Link, Download, X } from "lucide-vue-next";

defineProps<{
  isOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();
</script>

<template>
  <!-- Mobile Backdrop -->
  <div
    v-if="isOpen"
    class="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
    @click="emit('close')"
  ></div>

  <aside
    class="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6 z-50 transition-transform duration-300 flex flex-col md:translate-x-0"
    :class="isOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <!-- Close Button (Mobile) -->
    <button
      @click="emit('close')"
      class="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 md:hidden"
    >
      <X class="w-6 h-6" />
    </button>
    <!-- Logo -->
    <div class="flex items-center gap-3 mb-10">
      <div class="w-10 h-10 flex items-center justify-center font-bold text-xl">
        <img
          src="/logo.svg"
          alt="ENMD Logo"
          class="w-full h-full object-contain"
        />
      </div>
      <div>
        <h1 class="font-bold text-[#040303] text-2xl leading-tight">ENMD</h1>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 space-y-2">
      <NuxtLink
        to="/"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors"
        active-class="bg-[#F3F3F3] text-[#3D348B]"
        class-active="bg-[#F3F3F3] text-[#3D348B]"
        :class="
          $route.path === '/'
            ? 'bg-[#F3F3F3] text-[#3D348B]'
            : 'text-gray-500 hover:bg-gray-50 hover:text-[#3D348B]'
        "
      >
        <Link class="w-5 h-5" />
        <span>Save via Link</span>
      </NuxtLink>
      <NuxtLink
        to="/downloads"
        class="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-colors"
        active-class="bg-[#F3F3F3] text-[#3D348B]"
        :class="
          $route.path.startsWith('/downloads')
            ? 'bg-[#F3F3F3] text-[#3D348B]'
            : 'text-gray-500 hover:bg-gray-50 hover:text-[#3D348B]'
        "
      >
        <Download class="w-5 h-5" />
        <span>Downloads</span>
      </NuxtLink>
    </nav>
  </aside>
</template>
