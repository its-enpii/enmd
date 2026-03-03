import ytDlp from "yt-dlp-exec";
import { randomUUID } from "crypto";

export default defineEventHandler(async (event) => {
  const { url } = await readBody(event);

  if (!url) {
    throw createError({ statusCode: 400, statusMessage: "URL is required" });
  }

  // Fix common URL issues
  // Threads often gets confused with threads.com
  let finalUrl = url;
  if (url.includes("threads.com")) {
    finalUrl = url.replace("threads.com", "threads.net");
  }

  // Remove query parameters
  try {
    const urlObj = new URL(finalUrl);
    urlObj.search = "";
    finalUrl = urlObj.toString();
    // Remove trailing slash if present (optional but cleaner)
    if (finalUrl.endsWith("/")) {
      finalUrl = finalUrl.slice(0, -1);
    }
  } catch (e) {
    // If URL parsing fails, ignore and use original
    console.warn("URL parsing failed during sanitization:", e);
  }

  try {
    console.log("Fetching info for:", finalUrl);

    // --dump-single-json gives us everything we need without downloading
    const output: any = await ytDlp(finalUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      // noCallHome is deprecated in recent yt-dlp versions
      // You might want to pass cookies or user agent here if strict
    });

    const processEntry = (entry: any, index: number | null = null) => {
      const formats = [];
      const availableFormats = entry.formats || [];

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
        formats.push({ label: "480p", id: "480", ext: "mp4", hasAudio: true });
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

      return {
        title: entry.title,
        thumbnail: entry.thumbnail,
        author: entry.uploader,
        duration: entry.duration_string,
        formats: formats,
        playlistIndex: index,
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
                label: "Download",
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

    // Carousel
    if (post.carousel_media && Array.isArray(post.carousel_media)) {
      post.carousel_media.forEach((media: any) => {
        if (media.video_versions && media.video_versions.length > 0) {
          items.push({
            type: "video",
            versions: media.video_versions,
            image_versions: media.image_versions2,
            pk: media.pk || post.pk,
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
    } catch (e) {}
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
      title: v.caption ? v.caption.substring(0, 100) : `Threads Video ${i + 1}`,
      thumbnail: v.image_versions?.candidates?.[0]?.url || "",
      author: v.user?.username || "threads_user",
      duration: "",
      formats: [
        {
          label: "Best Quality",
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
