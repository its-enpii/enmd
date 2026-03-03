import ytDlp from "yt-dlp-exec";
import ffmpegPath from "ffmpeg-static";
import { join } from "path";
import { randomUUID } from "crypto";
import fs from "fs";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { url, quality, playlistIndex } = body;

  if (!url || !quality) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing url or quality",
    });
  }

  // Determine format string for yt-dlp
  let formatArgs: any = {};
  let ext = "mp4";

  if (quality === "audio") {
    formatArgs = {
      extractAudio: true,
      audioFormat: "mp3",
    };
    ext = "mp3";
  } else if (quality.startsWith("fallback-")) {
    // Fallback: Direct download, do not specify format
    formatArgs = {};
  } else {
    // Video: download best video <= height + best audio
    formatArgs = {
      format: `bestvideo[height<=${quality}]+bestaudio/best[height<=${quality}]`,
      mergeOutputFormat: "mp4",
    };
  }

  const filename = `${randomUUID()}.${ext}`;
  const downloadPath = join(process.cwd(), "downloads", filename);

  try {
    console.log(`Starting render for ${quality}: ${url} -> ${downloadPath}`);

    const ytOptions: any = {
      ...formatArgs,
      output: downloadPath,
      ffmpegLocation: ffmpegPath as string,
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
