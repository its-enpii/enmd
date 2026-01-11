# ENMD (Enpii Media Downloader)

**ENMD** adalah aplikasi web modern untuk mendownload video dari berbagai platform media sosial (YouTube, TikTok, Instagram, Twitter/X, dll) dengan cepat dan mudah.

Dibuat dengan **Nuxt 3**, **TailwindCSS**, dan engine **yt-dlp**.

![ENMD Preview](/public/logo.svg)

## 🚀 Fitur Utama

-   **Multi-Platform Support**: Mendukung YouTube, TikTok (No Watermark), Instagram, Facebook, Twitter/X, Twitch, SoundCloud, dan 1000+ situs lainnya.
-   **Auto-Paste & Process**: Cukup tekan tombol Paste atau Ctrl+V, aplikasi langsung memproses link.
-   **History Download**: Menyimpan riwayat download Anda (disimpan di browser).
-   **No Ads & Clean UI**: Tampilan minimalis, modern, dan responsif (Mobile Friendly).
-   **Privacy Focused**: File otomatis dihapus dari server setelah 1 jam.

## 🛠️ Teknologi

-   **Frontend**: Nuxt 3, Vue 3, TailwindCSS.
-   **Backend**: Nitro Server (built-in Nuxt).
-   **Engine**: yt-dlp (Python) & FFmpeg.

## 📦 Cara Install (Local)

Pastikan di komputer sudah terinstall: `Node.js 20+`, `Python 3.10+`, dan `FFmpeg`.

1.  **Clone Repository**
    ```bash
    git clone https://github.com/its-enpii/enmd.git
    cd enmd
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Jalankan Server Development**
    ```bash
    npm run dev
    ```
    Buka `http://localhost:3000` di browser.

## 🌐 Cara Deploy (Hosting)

Aplikasi ini membutuhkan **Python** dan **FFmpeg** di server. Hosting statis biasa (Vercel/Netlify) **TIDAK BISA** digunakan secara langsung.

Silakan baca panduan lengkap cara deploy di file:
👉 **[DEPLOY.md](DEPLOY.md)**

Opsi terbaik:
1.  **Docker** (Railway, Render, Fly.io, VPS) -> **Recommended ✅**
2.  **VPS Manual** (Ubuntu/Debian).

## 📄 Lisensi

© 2026 ENMD. All rights reserved.
