import ytDlp from "yt-dlp-exec";
import ffmpegStatic from "ffmpeg-static";
import { join } from "path";
import { randomUUID } from "crypto";
import fs from "fs";

/**
 * Resolve a usable ffmpeg binary path.
 *
 * IMPORTANT: never return a bare relative name like "ffmpeg". yt-dlp treats a
 * relative path as a local file (`./ffmpeg`), NOT as a PATH lookup, so it fails
 * to find the binary and merges are never performed. Returning `undefined`
 * lets yt-dlp fall back to its own `$PATH` resolution.
 *
 * Order of preference:
 *   1. Explicit FFMPEG_PATH env override (must exist on disk).
 *   2. Common system locations (Alpine: /usr/bin/ffmpeg).
 *   3. ffmpeg-static binary if it exists on disk.
 *   4. undefined -> let yt-dlp search $PATH.
 */
function resolveFfmpegPath(): string | undefined {
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) {
    return process.env.FFMPEG_PATH;
  }

  for (const p of ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"]) {
    if (fs.existsSync(p)) return p;
  }

  try {
    if (
      ffmpegStatic &&
      typeof ffmpegStatic === "string" &&
      fs.existsSync(ffmpegStatic)
    ) {
      return ffmpegStatic;
    }
  } catch {
    // Ignore and fall through.
  }

  // Do NOT return "ffmpeg" here: yt-dlp would look for ./ffmpeg and fail.
  // Undefined lets yt-dlp resolve the binary from $PATH on its own.
  return undefined;
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

  const cleanUrl = typeof url === "string" ? url.trim() : url;
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
    console.log(`Starting render for ${qualityStr}: ${cleanUrl} -> ${downloadPath}`);

    const ytOptions: any = {
      ...formatArgs,
      output: downloadPath,
      noPlaylist: true,
      // Allow yt-dlp to use the Node.js runtime that ships inside the
      // container (/usr/local/bin/node on Alpine) to solve YouTube's n-sig
      // challenge. Without this yt-dlp only looks for `deno` and fails with
      // "HTTP Error 403: Forbidden" on protected audio/video streams.
      jsRuntimes: "nodejs",
    };

    // Only set ffmpegLocation when we have a real, existing binary path.
    // Passing a bare relative "ffmpeg" makes yt-dlp look for ./ffmpeg and
    // break the stream merge (resulting in "Failed to render").
    const ffmpegLoc = resolveFfmpegPath();
    if (ffmpegLoc) {
      ytOptions.ffmpegLocation = ffmpegLoc;
    }

    if (playlistIndex) {
      ytOptions.noPlaylist = false;
      ytOptions.playlistItems = `${playlistIndex}`;
    }

    await ytDlp(cleanUrl, ytOptions);

    // Verify the merged/output file actually exists on disk. Without this the
    // API could report success while the download endpoint later returns 404.
    if (!fs.existsSync(downloadPath)) {
      console.error(`Rendered file not found: ${downloadPath}`);
      throw createError({
        statusCode: 500,
        statusMessage: "Render failed: output media file was not generated",
      });
    }

    // Return the filename so the frontend can request it via /api/file
    return {
      status: "success",
      filename: filename,
    };
  } catch (error: any) {
    console.error("Render processing error:", error);
    // Preserve an already-formed HTTP error (e.g. the file-verification error).
    if (error?.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      statusMessage: "Failed to render media",
    });
  }
});
