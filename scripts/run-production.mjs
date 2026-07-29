import { spawnSync } from "node:child_process";

const script = process.argv[2];
if (!new Set(["build", "deploy"]).has(script)) {
  throw new Error("Expected the production wrapper target to be build or deploy.");
}

const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const result = spawnSync(pnpm, ["run", script], {
  stdio: "inherit",
  env: { ...process.env, CLOUDFLARE_ENV: "production" },
  shell: process.platform === "win32"
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
