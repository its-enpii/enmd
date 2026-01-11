<script setup lang="ts">
import { ref, onMounted } from "vue";

const isVisible = ref(false);

onMounted(() => {
  const consent = localStorage.getItem("cookie_consent");
  if (consent === null) {
    // Show after a small delay
    setTimeout(() => {
      isVisible.value = true;
    }, 1000);
  }
});

const acceptCookies = () => {
  localStorage.setItem("cookie_consent", "true");
  isVisible.value = false;
};

const declineCookies = () => {
  localStorage.setItem("cookie_consent", "false");
  isVisible.value = false;
};
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:max-w-sm z-[100] animate-slide-up"
  >
    <div
      class="bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 flex flex-col gap-4"
    >
      <div>
        <h4 class="font-bold text-[#3D348B] mb-2 text-lg">🍪 Cookie Consent</h4>
        <p class="text-sm text-gray-500 leading-relaxed">
          We use cookies to save your download history locally on your device
          for a better experience.
        </p>
      </div>
      <div class="flex gap-3">
        <button
          @click="declineCookies"
          class="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-colors cursor-pointer"
        >
          Decline
        </button>
        <button
          @click="acceptCookies"
          class="flex-1 py-3 bg-[#E6AF2E] hover:bg-[#d4a029] text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-200 cursor-pointer"
        >
          Allow
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.animate-slide-up {
  animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
</style>
