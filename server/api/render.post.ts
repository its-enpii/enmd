import ytDlp from "yt-dlp-exec";
import ffmpegStatic from "ffmpeg-static";
import { join } from "path";
import { randomUUID } from "crypto";
import fs from "fs";

/**
 * Resolve a usable ffmpeg binary path.
 * Order of preference:
 *   1. Explicit FFMPEG_PATH env override.
 *   2. Alpine (musl) -> use the system ffmpeg (ffmpeg-static ships a glibc
 *      binary that cannot run on musl libc).
 *   3. ffmpeg-static binary if it exists on disk.
 *   4. Fall back to `ffmpeg` from PATH.
 */
function resolveFfmpegPath(): string {
  if (process.env.FFMPEG_PATH) {
    return process.env.FFMPEG_PATH;
  }

  // Alpine Linux ships its own ffmpeg via apk; ffmpeg-static's glibc binary
  // crashes there, so always prefer the system binary.
  if (fs.existsSync("/etc/alpine-release")) {
    return "ffmpeg";
  }

  try {
    if (ffmpegStatic && typeof ffmpegStatic === "string" && fs.existsSync(ffmpegStatic)) {
      return ffmpegStatic;
    }
  } catch {
    // Ignore and fall through to system ffmpeg.
  }

  return "ffmpeg";
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { url, quality, playlistIndex } = body;

  if (!url || !quality) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing url or quality",
    });
  }

  const qualityStr = String(quality);

  // Determine format string for yt-dlp
  let formatArgs: any = {};
  let ext = "mp4";

  if (qualityStr === "audio") {
    formatArgs = {
      extractAudio: true,
      audioFormat: "mp3",
    };
    ext = "mp3";
  } else if (
    qualityStr.startsWith("fallback-") ||
    qualityStr.startsWith("threads-") ||
    qualityStr === "direct"
  ) {
    // Direct/fallback media (Threads carousels, single-resolution videos).
    // Do NOT apply a height filter: these sources expose a single stream and
    // a selector like `bestvideo[height<=threads-v0]` would crash yt-dlp.
    formatArgs = {};
  } else {
    // Numeric quality (1080 / 720 / 480 / 360). Use `/best` as a final
    // fallback so single-resolution videos aren't rejected with
    // "Requested format is not available".
    formatArgs = {
      format:
        `bestvideo[height<=${qualityStr}]+bestaudio/` +
        `best[height<=${qualityStr}]/best`,
      mergeOutputFormat: "mp4",
    };
  }

  // Ensure the temporary downloads directory exists before rendering.
  const downloadDir = join(process.cwd(), "downloads");
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const filename = `${randomUUID()}.${ext}`;
  const downloadPath = join(downloadDir, filename);

  try {
    console.log(`Starting render for ${qualityStr}: ${url} -> ${downloadPath}`);

    const ytOptions: any = {
      ...formatArgs,
      output: downloadPath,
      ffmpegLocation: resolveFfmpegPath(),
      noPlaylist: true,
    };

    if (playlistIndex) {
      ytOptions.noPlaylist = false;
      ytOptions.playlistItems = `${playlistIndex}`;
    }

    await ytDlp(url, ytOptions);

    // Return the filename so the frontend can request it via /api/file
    return {
      status: "success",
      filename: filename,
    };
  } catch (error: any) {
    console.error("Render processing error:", error);
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to render media",
    });
  }
});
