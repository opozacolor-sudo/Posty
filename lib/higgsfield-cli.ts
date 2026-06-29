import { execFile } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { isHiggsfieldCliEnabled } from "./higgsfield-env";

const execFileAsync = promisify(execFile);

const DEFAULT_CLI_JOB_TYPE = "nano_banana_2";

export type CliGenerateImageOptions = {
  prompt: string;
  aspectRatio?: "1:1" | "9:16" | "16:9" | "4:5";
};

export type CliGenerateImageResult = {
  url: string;
  thumbnailUrl?: string;
  requestId?: string;
};

type CliJobResult = {
  id?: string;
  status?: string;
  result_url?: string;
  min_result_url?: string;
};

function getCliEnv(): NodeJS.ProcessEnv {
  const home = process.env.HOME ?? "";
  return {
    ...process.env,
    PATH: `${path.join(home, ".local/bin")}:${process.env.PATH ?? ""}`,
  };
}

async function canExecute(bin: string): Promise<boolean> {
  try {
    await execFileAsync(bin, ["version"], {
      env: getCliEnv(),
      timeout: 10_000,
    });
    return true;
  } catch {
    return false;
  }
}

export async function resolveHiggsfieldCliPath(): Promise<string | null> {
  const candidates = [
    process.env.HIGGSFIELD_CLI_PATH?.trim(),
    path.join(process.env.HOME ?? "", ".local/bin/higgsfield"),
    "higgsfield",
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (candidate !== "higgsfield") {
      try {
        await access(candidate);
      } catch {
        continue;
      }
    }

    if (await canExecute(candidate)) {
      return candidate;
    }
  }

  return null;
}

export async function isHiggsfieldCliAvailable(): Promise<boolean> {
  if (!isHiggsfieldCliEnabled()) {
    return false;
  }

  return (await resolveHiggsfieldCliPath()) !== null;
}

function getCliJobType(): string {
  return (
    process.env.HIGGSFIELD_CLI_JOB_TYPE?.trim() ||
    process.env.HIGGSFIELD_IMAGE_JOB_TYPE?.trim() ||
    DEFAULT_CLI_JOB_TYPE
  );
}

function mapAspectRatio(value: CliGenerateImageOptions["aspectRatio"]): string {
  return value ?? "1:1";
}

export async function generateHiggsfieldImageViaCli(
  options: CliGenerateImageOptions,
): Promise<CliGenerateImageResult> {
  const bin = await resolveHiggsfieldCliPath();
  if (!bin) {
    throw new Error("HIGGSFIELD_CLI_NOT_AVAILABLE");
  }

  const jobType = getCliJobType();
  const waitTimeout = process.env.HIGGSFIELD_CLI_WAIT_TIMEOUT?.trim() || "110s";

  const { stdout } = await execFileAsync(
    bin,
    [
      "generate",
      "create",
      jobType,
      "--prompt",
      options.prompt,
      "--aspect_ratio",
      mapAspectRatio(options.aspectRatio),
      "--wait",
      "--wait-timeout",
      waitTimeout,
      "--json",
    ],
    {
      env: getCliEnv(),
      timeout: 115_000,
      maxBuffer: 4 * 1024 * 1024,
    },
  );

  let parsed: CliJobResult | CliJobResult[];
  try {
    parsed = JSON.parse(stdout) as CliJobResult | CliJobResult[];
  } catch {
    throw new Error("HIGGSFIELD_CLI_BAD_RESPONSE");
  }

  const job = Array.isArray(parsed) ? parsed[0] : parsed;
  if (!job?.result_url) {
    throw new Error(job?.status === "failed" ? "HIGGSFIELD_FAILED" : "HIGGSFIELD_NO_URL");
  }

  return {
    url: job.result_url,
    thumbnailUrl: job.min_result_url,
    requestId: job.id,
  };
}
