import { execFile } from "child_process";
import { randomUUID } from "crypto";
import ffmpegStatic from "ffmpeg-static";
import { existsSync } from "fs";
import { readFile, unlink, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function resolveFfmpegPath(): string {
  const envPath = process.env.FFMPEG_PATH?.trim();
  if (envPath && existsSync(envPath)) {
    return envPath;
  }

  const candidates = [
    typeof ffmpegStatic === "string" ? ffmpegStatic : null,
    join(process.cwd(), "node_modules/ffmpeg-static/ffmpeg"),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("ffmpeg binary unavailable on server");
}

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
  const ffmpegPath = resolveFfmpegPath();

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
