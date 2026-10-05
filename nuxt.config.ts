import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
  app: {
    head: {
      title: 'ENMD - Free Social Media Video & Music Downloader',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        {
          hid: 'description',
          name: 'description',
          content:
            'Download videos and music from YouTube, TikTok, Instagram, Facebook, Threads, Twitter, SoundCloud, and 1000+ sites. Fast, free, high quality, no watermark.',
        },
        {
          name: 'keywords',
          content:
            'social media downloader, video downloader, youtube downloader, tiktok downloader, instagram video download, threads video downloader, soundcloud downloader, free video download, no watermark, music downloader',
        },
        { name: 'author', content: 'Enpii Studio' },
        { name: 'robots', content: 'index, follow' },
        { name: 'theme-color', content: '#3D348B' },

        // Open Graph
        { property: 'og:type', content: 'website' },
        { property: 'og:url', content: 'https://enmd.enpiistudio.com' },
        {
          property: 'og:title',
          content: 'ENMD - Free Social Media Video & Music Downloader',
        },
        {
          property: 'og:description',
          content:
            'Download videos and music from YouTube, TikTok, Instagram, Threads, SoundCloud, and 1000+ sites. No watermark, high quality, 100% free.',
        },
        { property: 'og:image', content: 'https://enmd.enpiistudio.com/logo.svg' },
        { property: 'og:site_name', content: 'ENMD' },

        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        {
          name: 'twitter:title',
          content: 'ENMD - Free Social Media Video & Music Downloader',
        },
        {
          name: 'twitter:description',
          content:
            'Download videos and music from YouTube, TikTok, Instagram, Threads, SoundCloud, and more.',
        },
        { name: 'twitter:image', content: 'https://enmd.enpiistudio.com/logo.svg' },
      ],
      link: [
        { rel: 'canonical', href: 'https://enmd.enpiistudio.com' },
        { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' },
      ],
    },
  },
})
