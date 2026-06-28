export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { logMetaEnvAtStartup } = await import("./lib/meta-env");
    logMetaEnvAtStartup();
  }
}
