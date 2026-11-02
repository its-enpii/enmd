import { ref } from "vue";

export const useDownloader = () => {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const data = ref<any>(null);

  const fetchVideoInfo = async (url: string) => {
    if (!url) return;

    loading.value = true;
    error.value = null;
    data.value = null;

    try {
      const response = await fetch("/api/info", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          url: url,
        }),
      });

      const result = await response.json();

      if (result.status === "error") {
        throw new Error(result.text || "Failed to fetch video info");
      }

      // result is now an array of video info objects
      data.value = result.map((item: any) => ({
        ...item,
        originalUrl: item.originalUrl || url,
      }));
    } catch (err: any) {
      error.value = err.message || "An error occurred";
      console.error(err);
    } finally {
      loading.value = false;
    }
  };

  const getJobUrl = (jobId: string) =>
    `/api/render/status?jobId=${encodeURIComponent(jobId)}`;

  const pollJob = async (jobId: string): Promise<string> => {
    const POLL_INTERVAL = 3000;
    const MAX_WAIT = 10 * 60 * 1000; // 10 minutes
    const deadline = Date.now() + MAX_WAIT;
    let networkFailures = 0;

    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      let res: Response;
      try {
        res = await fetch(getJobUrl(jobId), {
          headers: { Accept: "application/json" },
        });
      } catch {
        // Transient network hiccup while polling: keep trying.
        if (++networkFailures >= 5) {
          throw new Error("Lost connection while checking render status");
        }
        continue;
      }
      networkFailures = 0;

      if (res.status === 404) {
        throw new Error("Render job expired or not found");
      }
      if (!res.ok) {
        // 5xx from proxy etc. — keep polling, the job may still be running.
        continue;
      }

      let result: any;
      try {
        result = await res.json();
      } catch {
        continue;
      }

      if (result?.status === "success" && result.filename) {
        return result.filename;
      }
      if (result?.status === "error") {
        throw new Error(result.message || "Render failed");
      }
      // "processing" -> keep polling.
    }

    throw new Error("Render timed out after 10 minutes");
  };

  const startJob = async (
    url: string,
    quality: string,
    playlistIndex?: number
  ): Promise<string | null> => {
    const body = JSON.stringify({ url, quality, playlistIndex });
    let res: Response | null = null;

    try {
      res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
    } catch (err) {
      // Transport error (504/524/reset) — the job id may be unknowable, so
      // retry the POST once below.
      console.warn("Render POST transport error:", err);
    }

    if (res) {
      let result: any = null;
      try {
        result = await res.json();
      } catch {
        result = null;
      }

      if (result?.status === "processing" && result.jobId) {
        return result.jobId;
      }
      if (result?.status === "success" && result.filename) {
        return `done:${result.filename}`;
      }
      if (res.ok === false && res.status < 500) {
        throw new Error(result?.message || result?.statusMessage || "Render failed");
      }
    }

    // No jobId received: retry the POST exactly once (POST_ONLY).
    return "POST_ONLY";
  };

  // POST once more (after a transport failure or an unknown job) and return
  // the jobId, or throw when the server rejects the request.
  const postAndGetJobId = async (
    url: string,
    quality: string,
    playlistIndex?: number
  ): Promise<string | null> => {
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, quality, playlistIndex }),
    });
    const result: any = await res.json().catch(() => null);
    if (result?.status === "processing" && result.jobId) {
      return result.jobId;
    }
    if (result?.status === "success" && result.filename) {
      return `done:${result.filename}`;
    }
    if (!res.ok && res.status < 500) {
      throw new Error(result?.message || result?.statusMessage || "Render failed");
    }
    return null;
  };

  const renderVideo = async (
    url: string,
    quality: string,
    playlistIndex?: number
  ) => {
    try {
      let started =
        (await startJob(url, quality, playlistIndex)) ?? "POST_ONLY";
      if (started === "POST_ONLY") {
        const retried = await postAndGetJobId(url, quality, playlistIndex);
        if (!retried) throw new Error("Render failed");
        started = retried;
      }
      if (started.startsWith("done:")) {
        return started.slice("done:".length);
      }
      try {
        return await pollJob(started);
      } catch (err: any) {
        // Job vanished (e.g. server restarted / TTL expired). Retry the POST
        // once, then poll the new job.
        if (!/not found/i.test(err?.message || "")) throw err;
        console.warn("Render job not found, retrying POST once");
        const retried = await postAndGetJobId(url, quality, playlistIndex);
        if (!retried) throw err;
        if (retried.startsWith("done:")) return retried.slice("done:".length);
        return await pollJob(retried);
      }
    } catch (err: any) {
      console.error("Render error:", err);
      throw new Error(err.message || "Failed to render video");
    }
  };

  return {
    loading,
    error,
    data,
    fetchVideoInfo,
    renderVideo,
  };
};
