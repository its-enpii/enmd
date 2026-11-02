import ytDlp from "yt-dlp-exec";
import ffmpegStatic from "ffmpeg-static";
import { join } from "path";
import { randomUUID } from "crypto";
import fs from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { createRenderJob, type RenderJob } from "../utils/renderJobs";

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

/**
 * Runs the actual render (format probe + yt-dlp / direct CDN download) and
 * resolves with the filename of the produced file.
 */
async function runRender(params: {
  cleanUrl: string;
  qualityStr: string;
  playlistIndex?: number;
  filename: string;
  downloadPath: string;
}): Promise<string> {
  const { cleanUrl, qualityStr, playlistIndex, filename, downloadPath } = params;

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
    //
    // The bundled yt-dlp (2026.08.19) does NOT understand `short_side`, and
    // `or` / `|` filters are unsupported too. So we detect orientation with a
    // light metadata probe and filter on the dimension that represents the
    // requested quality: `height` for landscape, `width` for portrait
    // (e.g. 720x1280 -> width<=720).
    let meta: any = null;
    try {
      meta = await ytDlp(cleanUrl, {
        dumpSingleJson: true,
        simulate: true,
        noWarnings: true,
        jsRuntimes: "node",
        ...(playlistIndex ? { playlistItems: String(playlistIndex) } : {}),
      });
      if (meta && meta.entries && meta.entries.length) meta = meta.entries[0];
    } catch {
      meta = null;
    }

    const vf = (meta?.formats || []).find(
      (f: any) =>
        f &&
        typeof f.width === "number" &&
        typeof f.height === "number" &&
        f.vcodec &&
        f.vcodec !== "none",
    );
    const isPortrait = vf ? vf.width < vf.height : false;
    // If the probe failed, fall back to the proven `height<=X` behaviour.
    const dim = isPortrait ? "width" : "height";

    formatArgs = {
      format:
        `bestvideo[${dim}<=${qualityStr}]+bestaudio/` +
        `best[${dim}<=${qualityStr}]/best`,
      mergeOutputFormat: "mp4",
    };
  }

  // ---------------------------------------------------------------------------
  // Direct CDN download path.
  //
  // Threads carousels / fallback resolvers hand us a direct, already-merged
  // media URL (Instagram/Facebook CDN, Google Video, or a plain .mp4). Running
  // yt-dlp against these opaque CDN URLs makes it crash, so we stream the file
  // ourselves with native fetch() + a Node stream pipeline.
  // ---------------------------------------------------------------------------
  const isDirectCdn =
    typeof cleanUrl === "string" &&
    (cleanUrl.includes(".cdninstagram.com") ||
      cleanUrl.includes(".fbcdn.net") ||
      cleanUrl.includes("googlevideo.com") ||
      /\.mp4(\?|$)/i.test(cleanUrl));

  if (
    qualityStr.startsWith("threads-") ||
    qualityStr.startsWith("fallback-") ||
    isDirectCdn
  ) {
    console.log(`Direct CDN download: ${cleanUrl} -> ${downloadPath}`);

    const resp = await fetch(cleanUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!resp.ok) {
      throw createError({
        statusCode: resp.status,
        statusMessage: "Direct video fetch failed",
      });
    }

    const fileStream = fs.createWriteStream(downloadPath);
    await pipeline(Readable.fromWeb(resp.body as any), fileStream);

    // Verify the file was actually written before reporting success.
    if (!fs.existsSync(downloadPath) || fs.statSync(downloadPath).size === 0) {
      throw createError({
        statusCode: 500,
        statusMessage: "Render failed: direct download produced no data",
      });
    }

    return filename;
  }

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
      jsRuntimes: "node",
    };

    // Only set ffmpegLocation when we have a real, existing binary path.
    // Passing a bare relative "ffmpeg" makes yt-dlp look for ./ffmpeg and
    // break the stream merge (resulting in "Failed to render").
    const ffmpegLoc = resolveFfmpegPath();
    if (ffmpegLoc) {
      ytOptions.ffmpegLocation = ffmpegLoc;
    }

    if (playlistIndex) {
      // Delete noPlaylist entirely — setting it to false makes dargs
      // generate "--no-no-playlist" (invalid). The --playlist-items flag
      // already implies playlist mode, so noPlaylist is not needed here.
      delete ytOptions.noPlaylist;
      ytOptions.playlistItems = `${playlistIndex}`;
    }

    // -------------------------------------------------------------------------
    // Spotify resolution.
    //
    // yt-dlp cannot download Spotify URLs directly (DRM protected) and fails
    // with an HTTP 500. Resolve the track title via Spotify's public oembed
    // endpoint and turn it into a YouTube search query (`ytsearch1:`), which
    // yt-dlp can download as audio.
    // -------------------------------------------------------------------------
    let targetUrl = cleanUrl;
    if (typeof targetUrl === "string" && targetUrl.includes("spotify.com")) {
      try {
        const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(oembedUrl);
        if (res.ok) {
          const data: any = await res.json();
          if (data.title) {
            targetUrl = `ytsearch1:${data.title} audio`;
            console.log(`Resolved Spotify to search query: ${targetUrl}`);
          }
        }
      } catch (e) {
        console.warn("Failed to resolve Spotify oembed in render:", e);
      }
    }

    await ytDlp(targetUrl, ytOptions);

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
    return filename;
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
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { url, quality, playlistIndex, wait } = body;

  if (!url || !quality) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing url or quality",
    });
  }

  let cleanUrl = typeof url === "string" ? url.trim() : url;
  const qualityStr = String(quality);

  // Bilibili share-links always carry noise query params (site, lang,
  // spm_id_from, vd_source, ...) that break the BiliBili extractor
  // (it falls back to generic and returns 0 formats). The BV id in the
  // path is sufficient, so strip the entire query string.
  // Keep this in sync with the same rule in info.post.ts.
  if (typeof cleanUrl === "string" && /bilibili\.com/i.test(cleanUrl)) {
    try { const u = new URL(cleanUrl); u.search = ""; cleanUrl = u.toString(); } catch {}
  }

  const ext = qualityStr === "audio" ? "mp3" : "mp4";

  // Ensure the temporary downloads directory exists before rendering.
  const downloadDir = join(process.cwd(), "downloads");
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  const filename = `${randomUUID()}.${ext}`;
  const downloadPath = join(downloadDir, filename);
  const renderParams = {
    cleanUrl,
    qualityStr,
    playlistIndex,
    filename,
    downloadPath,
  };

  // ---------------------------------------------------------------------------
  // Backward-compatible blocking flow (`wait: true`): used by curl/tests.
  // ---------------------------------------------------------------------------
  if (wait === true) {
    const result = await runRender(renderParams);
    return { status: "success", filename: result };
  }

  // ---------------------------------------------------------------------------
  // Async job flow: return 202 immediately, render in the background.
  //
  // The render promise is NOT awaited, so the response goes out before the
  // proxy timeout. A client retry gets a brand-new job (the frontend polls
  // instead of re-POSTing, so no double-download happens in normal use).
  // ---------------------------------------------------------------------------
  const job: RenderJob = createRenderJob(randomUUID(), filename);
  const jobId = job.id;

  void runRender(renderParams)
    .then((renderedFilename) => {
      job.filename = renderedFilename;
      job.status = "success";
      job.finishedAt = Date.now();
      console.log(
        `[render] job ${jobId} success in ${Math.round(
          (job.finishedAt - job.startedAt) / 1000,
        )}s -> ${renderedFilename}`,
      );
    })
    .catch((error: any) => {
      job.status = "error";
      job.finishedAt = Date.now();
      job.error =
        error?.statusMessage || error?.message || "Failed to render media";
      console.error(`[render] job ${jobId} failed:`, job.error);
    });

  console.log(`[render] job ${jobId} accepted for ${qualityStr}: ${cleanUrl}`);
  setResponseStatus(event, 202);
  return { status: "processing", jobId, filename };
});
