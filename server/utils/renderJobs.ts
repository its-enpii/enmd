// -----------------------------------------------------------------------------
// In-memory render job registry (single container).
//
// Slow platforms (Bilibili cold-fetch from non-CN IPs) take 116-158s to render,
// which is longer than the Cloudflare proxy timeout (~100s). Holding the HTTP
// POST open until yt-dlp finishes makes the client see a 504/524 even though
// the render keeps running. So POST /api/render returns 202 + jobId
// immediately and the actual work continues in the background; the client
// polls GET /api/render/status?jobId=... instead.
// -----------------------------------------------------------------------------
export type RenderJob = {
  id: string;
  status: "processing" | "success" | "error";
  startedAt: number;
  finishedAt?: number;
  filename: string;
  error?: string;
};

const RENDER_JOB_TTL = 10 * 60 * 1000; // keep finished/abandoned jobs 10 minutes

// Keep the Map on globalThis so dev-mode HMR / module reloads do not lose jobs.
const globalJobs = globalThis as typeof globalThis & {
  __enmdRenderJobs?: Map<string, RenderJob>;
};
const renderJobs: Map<string, RenderJob> =
  globalJobs.__enmdRenderJobs ?? new Map<string, RenderJob>();
globalJobs.__enmdRenderJobs = renderJobs;

export function pruneRenderJobs() {
  const now = Date.now();
  for (const [id, job] of renderJobs) {
    if (now - job.startedAt > RENDER_JOB_TTL) {
      renderJobs.delete(id);
    }
  }
}

export function createRenderJob(id: string, filename: string): RenderJob {
  pruneRenderJobs();
  const job: RenderJob = {
    id,
    status: "processing",
    startedAt: Date.now(),
    filename,
  };
  renderJobs.set(id, job);
  return job;
}

export function getRenderJob(id: string): RenderJob | undefined {
  pruneRenderJobs();
  return renderJobs.get(id);
}
