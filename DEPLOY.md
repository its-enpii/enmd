# Deployment Guide for ENMD (Enpii Media Downloader)

Deployment aplikasi ini agak unik karena membutuhkan **System Dependencies** (`Python` & `FFmpeg`) agar fiturnya berjalan lancar. Hosting biasa (Shared Hosting/cPanel) mungkin tidak mendukung.

## Pilihan Hosting Terbaik

1.  **VPS (Virtual Private Server)**: DigitalOcean, Linode, AWS EC2, Google Compute Engine. (Paling Direkomendasikan)
2.  **Container Platform (PaaS)**: Railway, Fly.io, Render, DigitalOcean App Platform. (Paling Mudah)

---

## Opsi 1: Deploy Menggunakan Docker (Paling Mudah & Aman)

Saya sudah buatkan **`Dockerfile`**. Ini adalah "resep" agar aplikasi pasti jalan di mana saja tanpa error kekurangan software.

### Langkah-langkah (Contoh di VPS/Local):
1.  Pastikan server sudah terinstall Docker.
2.  Build image:
    ```bash
    docker build -t enmd-app .
    ```
3.  Jalankan container:
    ```bash
    docker run -d -p 3000:3000 --name enmd-container enmd-app
    ```
4.  Aplikasi jalan di `http://IP-SERVER:3000`.

### Langkah-langkah (Platform seperti Railway/Fly.io/Render):
1.  Upload kode ini ke GitHub.
2.  Connect akun GitHub ke Railway/Render.
3.  Platform akan otomatis membaca `Dockerfile` dan menginstall semuanya untuk Anda.
4.  Selesai!

---

## Opsi 2: Deploy Manual di VPS (Ubuntu/Debian)

Jika Anda ingin install manual tanpa Docker di server Ubuntu:

1.  **Install Node.js 20+**
2.  **Install Python & FFmpeg (Wajib ada):**
    ```bash
    sudo apt update
    sudo apt install python3 ffmpeg -y
    ```
3.  **Upload kode aplikasi** ke server.
4.  **Install dependencies & Build:**
    ```bash
    npm install
    npm run build
    ```
5.  **Jalankan Aplikasi:**
    ```bash
    node .output/server/index.mjs
    ```
6.  Gunakan **PM2** agar aplikasi tetap nyala walaupun terminal ditutup:
    ```bash
    npm install -g pm2
    pm2 start .output/server/index.mjs --name "enmd"
    ```

## ⚠️ Mengapa tidak bisa di Vercel / Netlify biasa?

Hosting "Serverless" murni seperti Vercel starter:
1.  **Storage**: Aplikasi ini butuh folder `downloads/` sementara untuk memproses video. Vercel tidak mengizinkan tulis file sembarangan.
2.  **Dependencies**: Vercel base image mungkin tidak punya `FFmpeg` atau library spesifik yang dibutuhkan `yt-dlp`.

**Solusi:** Gunakan **Docker** (Opsi 1) adalah cara paling anti-pusing untuk aplikasi tipe downloader ini.

---

## Opsi 3: Hosting Gratisan (Free Tier)

Karena aplikasi ini butuh server yang kuat (untuk convert video), hosting statis biasa (GitHub Pages/Vercel) **TIDAK BISA** dipakai.

Namun, Anda bisa mencoba layanan "Free Tier" yang mendukung Docker:

### 1. Render.com (Recommended)
*   **Jenis**: Web Service (Docker).
*   **Gratis**: Ya (instance akan "tidur" setelah 15 menit tidak aktif).
*   **Cara**:
    1.  Daftar di [render.com](https://render.com).
    2.  Buat "New Web Service".
    3.  Connect repository GitHub Anda.
    4.  Pilih Runtime: **Docker**.
    5.  Render akan otomatis membaca file `Dockerfile` kita dan menjalankannya.

### 2. Hugging Face Spaces
*   **Jenis**: Docker Space.
*   **Gratis**: Ya (CPU basic).
*   **Cara**:
    1.  Buat Space baru di Hugging Face.
    2.  Pilih SDK: **Docker**.
    3.  Upload file project ini.

**Catatan Hosting Gratis:**
Proses download/convert mungkin agak pelan karena resource CPU/RAM yang terbatas pada paket gratis.

