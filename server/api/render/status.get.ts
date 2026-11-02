import fs from "fs";
import { join } from "path";
import { getRenderJob } from "../../utils/renderJobs";

export default defineEventHandler((event) => {
  const { jobId } = getQuery(event);

  if (!jobId || typeof jobId !== "string") {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing jobId",
    });
  }

  const job = getRenderJob(jobId);

  if (!job) {
    // Unknown or expired job. 404 lets the client distinguish "job gone"
    // (retry the POST) from a transient polling failure.
    setResponseStatus(event, 404);
    return { status: "error", message: "Job not found" };
  }

  if (job.status === "processing") {
    return { status: "processing", jobId: job.id, filename: job.filename };
  }

  if (job.status === "success") {
    // Double-check the file really exists on disk before reporting success.
    const filePath = join(process.cwd(), "downloads", job.filename);
    if (!fs.existsSync(filePath)) {
      return {
        status: "error",
        jobId: job.id,
        message: "Render finished but output file is missing",
      };
    }
    return { status: "success", jobId: job.id, filename: job.filename };
  }

  return {
    status: "error",
    jobId: job.id,
    message: job.error || "Render failed",
  };
});
