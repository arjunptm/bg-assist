import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const clientDirectory = resolve("dist", "client");
const workerDirectory = resolve("dist", "bg_assistant_development");

const manifest = JSON.parse(
  await readFile(resolve(clientDirectory, "manifest.webmanifest"), "utf8")
);

for (const [key, expected] of Object.entries({
  id: "/",
  name: "Game Night",
  short_name: "Game Night",
  start_url: "/",
  scope: "/",
  display: "standalone"
})) {
  if (manifest[key] !== expected) {
    throw new Error(`PWA manifest ${key} must be ${JSON.stringify(expected)}.`);
  }
}

const requiredIcons = new Map([
  ["192x192", "/pwa-192x192.png"],
  ["512x512", "/pwa-512x512.png"]
]);
for (const [sizes, source] of requiredIcons) {
  if (!manifest.icons?.some((icon) => icon.sizes === sizes && icon.src === source)) {
    throw new Error(`PWA manifest is missing the ${sizes} icon.`);
  }
  await access(resolve(clientDirectory, source.slice(1)));
}
if (!manifest.icons?.some((icon) => icon.purpose === "maskable")) {
  throw new Error("PWA manifest is missing a maskable icon.");
}

const index = await readFile(resolve(clientDirectory, "index.html"), "utf8");
if (!index.includes('rel="manifest"')) {
  throw new Error("Built HTML does not link to the PWA manifest.");
}
await access(resolve(clientDirectory, "sw.js"));

const workerConfig = JSON.parse(
  await readFile(resolve(workerDirectory, "wrangler.json"), "utf8")
);
if (workerConfig.assets?.not_found_handling !== "single-page-application") {
  throw new Error("Built Worker is missing SPA navigation fallback.");
}
if (!workerConfig.d1_databases?.some((database) => database.binding === "DB")) {
  throw new Error("Built Worker is missing the DB binding.");
}
if (workerConfig.observability?.enabled !== false) {
  throw new Error("Persisted Worker observability must remain disabled for capability privacy.");
}

console.log("Verified PWA metadata, SPA fallback, D1 binding, and logging privacy.");
