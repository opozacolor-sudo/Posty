import { execFile } from "child_process";
import { randomUUID } from "crypto";
import ffmpegPath from "ffmpeg-static";
import { readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function imageExtension(contentType: string): string {
  const normalized = contentType.split(";")[0]?.trim().toLowerCase() ?? "image/jpeg";

  if (normalized.includes("webp")) {
    return "webp";
  }

  if (normalized.includes("png")) {
    return "png";
  }

  return "jpg";
}

export async function convertImageToVideoBytes(
  imageBytes: Buffer,
  contentType: string,
): Promise<Buffer> {
  if (!ffmpegPath) {
    throw new Error("ffmpeg binary unavailable");
  }

  const id = randomUUID();
  const inputPath = join(tmpdir(), `posty-tiktok-${id}.${imageExtension(contentType)}`);
  const outputPath = join(tmpdir(), `posty-tiktok-${id}.mp4`);

  try {
    await writeFile(inputPath, imageBytes);

    await execFileAsync(ffmpegPath, [
      "-y",
      "-loop",
      "1",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-t",
      "3",
      "-pix_fmt",
      "yuv420p",
      "-vf",
      "scale=720:-2",
      "-an",
      outputPath,
    ]);

    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {});
    await unlink(outputPath).catch(() => {});
  }
}
