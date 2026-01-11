<script setup lang="ts">
import Sidebar from "~/components/Sidebar.vue";
import Footer from "~/components/Footer.vue";
import CookieConsent from "~/components/CookieConsent.vue";
import { onMounted, ref } from "vue";
import { useState } from "#app";
import {
  Menu,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Twitch,
  Music2,
} from "lucide-vue-next";

// Initialize global state for cookie consent
const cookieConsent = useState<string | null>("cookieConsent", () => null);
const isSidebarOpen = ref(false);

const bgIcons = [
  // Left Side
  {
    icon: Twitter,
    class:
      "top-[20%] left-[10%] text-blue-400/10 w-16 h-16 -rotate-12 animate-delay-300",
  },
  {
    icon: Instagram,
    class:
      "top-[50%] left-[5%] text-pink-500/10 w-24 h-24 rotate-12 animate-delay-200",
  },
  {
    icon: Facebook,
    class:
      "bottom-[15%] left-[15%] text-blue-600/10 w-20 h-20 -rotate-6 animate-delay-500",
  },
  {
    icon: Twitch,
    class:
      "bottom-[40%] left-[25%] text-purple-500/10 w-14 h-14 rotate-6 animate-delay-800",
  },

  // Right Side
  {
    icon: Youtube,
    class:
      "top-[15%] right-[10%] text-red-500/10 w-24 h-24 rotate-12 animate-delay-100",
  },
  {
    icon: Music2,
    class:
      "top-[45%] right-[5%] text-orange-500/10 w-20 h-20 -rotate-12 animate-delay-400",
  },
  {
    icon: Youtube,
    class:
      "bottom-[20%] right-[20%] text-red-600/10 w-16 h-16 rotate-45 animate-delay-600",
  },
  {
    icon: Music2,
    class:
      "top-[10%] right-[35%] text-yellow-500/10 w-12 h-12 -rotate-6 animate-delay-700",
  },
];

onMounted(() => {
  if (import.meta.client) {
    cookieConsent.value = localStorage.getItem("cookie_consent");
  }
});

const updateConsent = (status: string) => {
  cookieConsent.value = status;
};
</script>

<template>
  <div
    class="min-h-screen bg-[#F3F3F3] text-[#040303] font-sans flex relative overflow-hidden"
  >
    <!-- Background Decor -->
    <div class="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div
        class="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-200/40 rounded-full blur-3xl animate-pulse"
      ></div>
      <div
        class="absolute top-[20%] -left-[10%] w-[40%] h-[40%] bg-orange-100/60 rounded-full blur-3xl animate-pulse delay-1000"
      ></div>
      <div
        class="absolute -bottom-[10%] right-[20%] w-[30%] h-[30%] bg-blue-100/40 rounded-full blur-3xl animate-pulse delay-700"
      ></div>

      <!-- Floating Icons -->
      <div
        v-for="(item, i) in bgIcons"
        :key="i"
        :class="['absolute animate-float', item.class]"
      >
        <component :is="item.icon" class="w-full h-full" />
      </div>
    </div>
    <!-- Sidebar -->
    <Sidebar
      :is-open="isSidebarOpen"
      @close="isSidebarOpen = false"
      class="z-50"
    />

    <!-- Main Content -->
    <main
      class="flex-1 md:ml-64 p-4 md:p-8 transition-all duration-300 relative z-10"
    >
      <!-- Header / Top Bar (Mobile) -->
      <header class="md:hidden flex items-center justify-between mb-8">
        <div class="flex items-center gap-2">
          <button
            @click="isSidebarOpen = true"
            class="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu class="w-6 h-6" />
          </button>
          <div class="w-10 h-10 flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="ENMD Logo"
              class="w-full h-full object-contain"
            />
          </div>
          <h1 class="font-bold text-xl">ENMD</h1>
        </div>
      </header>

      <!-- Center Container -->
      <div class="max-w-4xl mx-auto mt-4 md:mt-12">
        <!-- Page Content -->
        <NuxtPage />

        <!-- Footer -->
        <Footer />
        <CookieConsent @update="updateConsent" />
      </div>
    </main>
  </div>
</template>

<style>
@import url("https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");

body {
  font-family: "Plus Jakarta Sans", sans-serif;
  background-color: #f3f3f3;
}

@keyframes fade-in-down {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}
.animate-fade-in-down {
  animation: fade-in-down 0.8s ease-out forwards;
}

@keyframes bounce-in {
  0% {
    transform: scale(0.95);
    opacity: 0;
  }
  50% {
    transform: scale(1.02);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
.animate-bounce-in {
  animation: bounce-in 0.3s ease-out forwards;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-20px);
  }
}
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-delay-100 {
  animation-delay: 0.1s;
}
.animate-delay-200 {
  animation-delay: 0.2s;
}
.animate-delay-300 {
  animation-delay: 0.3s;
}
.animate-delay-400 {
  animation-delay: 0.4s;
}
.animate-delay-500 {
  animation-delay: 0.5s;
}
.animate-delay-600 {
  animation-delay: 0.6s;
}
.animate-delay-700 {
  animation-delay: 0.7s;
}
.animate-delay-800 {
  animation-delay: 0.8s;
}
.animate-delay-1000 {
  animation-delay: 1s;
}
</style>
