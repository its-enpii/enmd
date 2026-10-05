import ytDlp from "yt-dlp-exec";

export default defineEventHandler(async (event) => {
  const { url } = await readBody(event);

  if (!url) {
    throw createError({ statusCode: 400, statusMessage: "URL is required" });
  }

  // Fix common URL issues
  // Threads often gets confused with threads.com -> threads.net
  let finalUrl = typeof url === "string" ? url.trim() : url;
  if (finalUrl.includes("threads.com")) {
    finalUrl = finalUrl.replace("threads.com", "threads.net");
  }

  // Only strip tracking & referral parameters.
  // IMPORTANT: parameters such as `v` (YouTube/Facebook), `list`, playlist
  // ids, etc. MUST be preserved, otherwise yt-dlp treats the link as an
  // empty feed (`entries: []`) and the UI shows nothing.
  const TRACKING_PARAMS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "si",
    "fbclid",
    "igsh",
    "igshid",
    "feature",
    "ref",
    "s",
  ];

  try {
    const urlObj = new URL(finalUrl);
    for (const param of TRACKING_PARAMS) {
      urlObj.searchParams.delete(param);
    }
    finalUrl = urlObj.toString();
    // Remove trailing slash if present (optional but cleaner)
    if (finalUrl.endsWith("/")) {
      finalUrl = finalUrl.slice(0, -1);
    }
  } catch (e) {
    // If URL parsing fails, ignore and use original
    console.warn("URL parsing failed during sanitization:", e);
  }

  // ---------------------------------------------------------------------------
  // Spotify resolver: Spotify does not expose streamable media to yt-dlp. We
  // fetch official metadata through the public oEmbed endpoint and then locate
  // the real audio stream on YouTube (ytsearch) so we can hand the user a
  // genuine, downloadable audio file.
  // ---------------------------------------------------------------------------
  if (finalUrl.includes("spotify.com")) {
    try {
      console.log("Resolving Spotify track via oEmbed:", finalUrl);
      const spotify = await resolveSpotify(finalUrl);
      if (spotify && spotify.length > 0) {
        return spotify;
      }
    } catch (spotifyError) {
      console.error("Spotify resolver failed:", spotifyError);
    }
  }

  try {
    console.log("Fetching info for:", finalUrl);

    // --dump-single-json gives us everything we need without downloading
    const output: any = await ytDlp(finalUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      // Enable the Node.js JS runtime so yt-dlp can solve YouTube's n-sig
      // challenge and expose the real stream URLs (prevents 403 Forbidden).
      // NOTE: the value MUST be "node" — "nodejs" makes yt-dlp emit a warning
      // and fail to pick up the runtime.
      jsRuntimes: "node",
      // noCallHome is deprecated in recent yt-dlp versions
      // You might want to pass cookies or user agent here if strict
    });

    const processEntry = (entry: any, index: number | null = null) => {
      const formats = [];
      const availableFormats = entry.formats || [];

      // Detect audio-only sources. SoundCloud / Mixcloud / Bandcamp /
      // Audiomack and video entries with `vcodec === "none"` (or no video
      // resolution at all) must NOT advertise fake video qualities such as
      // 360p / 1080p — that produces files that do not exist.
      const hasVideoStream = availableFormats.some(
        (f: any) =>
          f &&
          f.vcodec &&
          f.vcodec !== "none" &&
          (typeof f.height === "number" || typeof f.width === "number")
      );
      const isAudioOnly =
        !hasVideoStream ||
        entry.vcodec === "none" ||
        (Array.isArray(availableFormats) &&
          availableFormats.length > 0 &&
          availableFormats.every((f: any) => !f || f.vcodec === "none"));

      if (isAudioOnly) {
        // Pure audio: expose a single, honest "Audio High Quality" option.
        formats.push({
          label: "Audio High Quality",
          id: "audio",
          ext: "mp3",
          hasAudio: true,
        });
      } else {
        // 1080p
        if (availableFormats.some((f: any) => f.height >= 1080)) {
          formats.push({
            label: "1080p (HD)",
            id: "1080",
            ext: "mp4",
            hasAudio: true,
          });
        }
        // 720p
        if (availableFormats.some((f: any) => f.height >= 720)) {
          formats.push({
            label: "720p (HD)",
            id: "720",
            ext: "mp4",
            hasAudio: true,
          });
        }
        // 480p
        if (availableFormats.some((f: any) => f.height >= 480)) {
          formats.push({
            label: "480p",
            id: "480",
            ext: "mp4",
            hasAudio: true,
          });
        }
        // 360p
        formats.push({ label: "360p", id: "360", ext: "mp4", hasAudio: true });

        // Audio Only
        formats.push({
          label: "Audio Only",
          id: "audio",
          ext: "mp3",
          hasAudio: true,
        });
      }

      // Duration fallback: format raw seconds into mm:ss / hh:mm:ss
      let duration = entry.duration_string;
      if (!duration && typeof entry.duration === "number") {
        duration = formatDuration(entry.duration);
      }

      return {
        title: entry.title,
        thumbnail: entry.thumbnail,
        author: entry.uploader,
        duration: duration || "",
        formats: formats,
        playlistIndex: index,
        originalUrl: finalUrl,
      };
    };

    let results = [];

    if (output.entries) {
      // It's a playlist or multi-video post
      results = output.entries.map((entry: any, idx: number) =>
        processEntry(entry, idx + 1)
      );
    } else {
      // Single video
      results = [processEntry(output)];
    }

    return results;
  } catch (error: any) {
    console.error("yt-dlp info error:", error);

    // Explicit fallback for Threads using btch-downloader or custom parser
    if (finalUrl.includes("threads.net")) {
      try {
        console.log("Attempting custom HTML parsing for Threads...");
        const results = await extractThreadsData(finalUrl);
        if (results && results.length > 0) {
          return results;
        }
      } catch (customError) {
        console.error("Custom Threads parser failed:", customError);
      }

      try {
        console.log("Attempting fallback with btch-downloader for Threads...");
        const btch = await import("btch-downloader");
        const data: any = await btch.default.threads(finalUrl);

        // btch-downloader structure might vary.
        // Threads carousels might be in 'image_urls' (which can contain video thumbnails or actual media)
        // or 'video' array.
        const getMedia = (d: any) => {
          let media: string[] = [];

          // Direct arrays
          if (Array.isArray(d.video) && d.video.length > 0)
            media.push(...d.video);
          else if (d.video) media.push(d.video);

          if (Array.isArray(d.image_urls) && d.image_urls.length > 0)
            media.push(...d.image_urls);

          // Nested in result
          if (d.result) {
            if (Array.isArray(d.result.video)) media.push(...d.result.video);
            else if (d.result.video) media.push(d.result.video);

            if (Array.isArray(d.result.image_urls))
              media.push(...d.result.image_urls);

            if (Array.isArray(d.result)) {
              const fromArr = d.result
                .map((r: any) => r.video || r.url || r.content)
                .filter(Boolean);
              media.push(...fromArr);
            }
          }

          // Unique only
          return [...new Set(media)];
        };

        const mediaLinks = getMedia(data);

        // Filter out plausible usage (e.g. if we have videos, ignore images if they look like thumbnails?
        // For now, let's just accept what we find, or maybe prefer mp4)
        const validLinks = mediaLinks.filter(
          (l) => l && (l.includes(".mp4") || l.includes("video"))
        );
        // Fallback to all if no explicit videos found (sometimes simple URLs don't have extension)
        const finalLinks = validLinks.length > 0 ? validLinks : mediaLinks;

        if (finalLinks.length > 0) {
          const results: any[] = [];
          const safeData = data.result || data;

          const processUrl = (mediaUrl: string, index: number) => ({
            title:
              safeData.title ||
              safeData.description ||
              `Threads Post ${index + 1}`,
            thumbnail: safeData.thumbnail || safeData.thumb || "",
            author: safeData.author || safeData.username || "Threads User",
            duration: "",
            formats: [
              {
                label: "Download MP4",
                id: "fallback-" + index,
                ext: "mp4",
                hasAudio: true,
                url: mediaUrl,
              },
            ],
            playlistIndex: index + 1,
            originalUrl: finalUrl,
          });

          finalLinks.forEach((v: string, i: number) =>
            results.push(processUrl(v, i))
          );

          return results;
        }
      } catch (fallbackError) {
        console.error("Fallback downloader also failed:", fallbackError);
      }
    }

    throw createError({
      statusCode: 500,
      statusMessage: "Failed to fetch video info",
    });
  }
});

function formatDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "";
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor((totalSeconds / 60) % 60);
  const hours = Math.floor(totalSeconds / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

/**
 * Resolve a Spotify track/album/episode link into a downloadable audio entry.
 *
 * Steps:
 *  1. Fetch official metadata (title + artwork) through Spotify's public
 *     oEmbed endpoint — no API credentials required.
 *  2. Search YouTube for the matching audio and extract its best audio stream
 *     via yt-dlp (`ytsearch1:<title> audio`).
 *  3. Return an audio-only MP3 format enriched with Spotify thumbnail/artist.
 */
async function resolveSpotify(url: string) {
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(
    url
  )}`;

  const resp = await fetch(oembedUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!resp.ok) {
    throw new Error(`Spotify oEmbed failed with ${resp.status}`);
  }

  const meta: any = await resp.json();
  const title: string = meta.title || "Spotify Track";
  const thumbnail: string = meta.thumbnail_url || "";
  // Spotify oEmbed exposes the creator as `author_name`.
  const artist: string = meta.author_name || "Spotify";

  console.log(`Spotify metadata resolved: "${title}" by ${artist}`);

  let source: any = null;
  try {
    // ytsearch1: returns the first YouTube result for our query.
    source = await ytDlp(`ytsearch1:${title} audio`, {
      dumpSingleJson: true,
      noWarnings: true,
      jsRuntimes: "node",
    });
  } catch (searchError) {
    console.error("Spotify YouTube audio search failed:", searchError);
  }

  // ytsearch may return a playlist wrapper; unwrap the first entry.
  if (source && source.entries && source.entries.length > 0) {
    source = source.entries[0];
  }

  let duration = "";
  if (source) {
    duration = source.duration_string || "";
    if (!duration && typeof source.duration === "number") {
      duration = formatDuration(source.duration);
    }
  }

  return [
    {
      title,
      thumbnail: thumbnail || source?.thumbnail || "",
      author: artist,
      duration,
      formats: [
        {
          label: "Audio High Quality",
          id: "audio",
          ext: "mp3",
          hasAudio: true,
        },
      ],
      playlistIndex: null,
      originalUrl: url,
    },
  ];
}

/**
 * Extract every video from a Threads post, including multi-video carousels.
 * Returns one entry per video so the frontend renders a separate card for
 * each one, each carrying its own direct CDN URL for native downloading.
 */
async function extractThreadsData(url: string) {
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-User": "?1",
      "Sec-Fetch-Dest": "document",
    },
  });

  if (!response.ok) throw new Error("Failed to fetch Threads HTML");
  const html = await response.text();

  const regex = /<script[^>]*data-sjs[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  const allVideos: any[] = [];

  // Helper to find media in a node
  const processPost = (post: any) => {
    let items: any[] = [];
    // Single video
    if (post.video_versions && post.video_versions.length > 0) {
      items.push({
        type: "video",
        versions: post.video_versions,
        image_versions: post.image_versions2,
        pk: post.pk + "_" + (post.id || ""),
        caption: post.caption?.text || "",
        user: post.user,
      });
    }

    // Carousel: walk every media item, keeping each video separately so a
    // single post with multiple videos yields multiple downloadable entries.
    if (post.carousel_media && Array.isArray(post.carousel_media)) {
      post.carousel_media.forEach((media: any, mediaIdx: number) => {
        if (media.video_versions && media.video_versions.length > 0) {
          items.push({
            type: "video",
            versions: media.video_versions,
            image_versions: media.image_versions2,
            pk: (media.pk || post.pk || "") + "_" + mediaIdx,
            caption: media.caption?.text || post.caption?.text || "",
            user: post.user,
          });
        }
      });
    }
    return items;
  };

  while ((match = regex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Search for edges

      const findEdges = (obj: any): any[] => {
        let found: any[] = [];
        if (!obj || typeof obj !== "object") return found;

        if (Array.isArray(obj)) {
          obj.forEach((i) => (found = found.concat(findEdges(i))));
          return found;
        }

        if (obj.edges && Array.isArray(obj.edges)) {
          found.push(...obj.edges);
        }

        Object.values(obj).forEach((val) => {
          found = found.concat(findEdges(val));
        });
        return found;
      };

      const edges = findEdges(data);
      edges.forEach((edge: any) => {
        if (edge.node && edge.node.thread_items) {
          edge.node.thread_items.forEach((item: any) => {
            if (item.post) {
              const mediaItems = processPost(item.post);
              allVideos.push(...mediaItems);
            }
          });
        }
      });
    } catch (e) {
      // Ignore malformed script blocks.
    }
  }

  if (allVideos.length === 0) throw new Error("No videos found in HTML");

  // Remove duplicates based on PK
  const uniqueVideos = allVideos.filter(
    (v, i, self) => i === self.findIndex((t) => t.pk === v.pk)
  );

  // If uniqueVideos is empty (or dedupe failed), use allVideos
  const finalVideos = uniqueVideos.length > 0 ? uniqueVideos : allVideos;

  return finalVideos.map((v, i) => {
    const bestVideo = v.versions[0];

    return {
      title:
        v.caption && v.caption.trim()
          ? v.caption.substring(0, 100)
          : `Video ${i + 1}`,
      thumbnail: v.image_versions?.candidates?.[0]?.url || "",
      author: v.user?.username || "threads_user",
      duration: "",
      formats: [
        {
          label: "Download MP4",
          id: "threads-v" + i,
          ext: "mp4",
          hasAudio: true,
          url: bestVideo.url,
        },
      ],
      playlistIndex: i + 1,
      originalUrl: url,
    };
  });
}
