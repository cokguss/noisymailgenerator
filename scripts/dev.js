const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const ROOT = path.join(__dirname, "..");
const SERVER_DIR = path.join(ROOT, "server");
const SERVER_ENTRY = path.join(SERVER_DIR, "server.js");
const API_PORT = 8000;
const WEB_PORT = 5173;

function log(tag, msg) {
  const lines = String(msg).split(/\r?\n/).filter(Boolean);
  lines.forEach((line) => console.log(`[${tag}] ${line}`));
}

function run(cmd, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: options.cwd || ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: process.platform === "win32"
    });
    child.stdout.on("data", (d) => log(options.tag || cmd, d));
    child.stderr.on("data", (d) => log(options.tag || cmd, d));
    child.on("close", (code) => resolve(code));
  });
}

async function ensureServerDeps() {
  if (fs.existsSync(path.join(ROOT, "node_modules"))) return;
  console.log("[setup] installing dependencies (first run only)…");
  const code = await run("npm", ["install", "--no-audit", "--no-fund"], {
    cwd: ROOT,
    tag: "setup"
  });
  if (code !== 0) {
    console.error("[setup] npm install failed — run `npm install` manually.");
    process.exit(1);
  }
}

async function main() {
  await ensureServerDeps();

  const children = [];

  children.push(
    spawn(process.execPath, [SERVER_ENTRY], {
      cwd: SERVER_DIR,
      env: { ...process.env, PORT: String(API_PORT) },
      stdio: ["ignore", "pipe", "pipe"]
    })
  );

  children.push(
    spawn(process.execPath, [path.join(__dirname, "static.js")], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(WEB_PORT) },
      stdio: ["ignore", "pipe", "pipe"]
    })
  );

  children.forEach((child, i) => {
    const tag = i === 0 ? "api" : "web";
    child.stdout.on("data", (d) => log(tag, d));
    child.stderr.on("data", (d) => log(tag, d));
    child.on("close", (code) => log(tag, `exited (${code})`));
  });

  console.log("");
  console.log("  Noisy Mail Generator — dev mode");
  console.log(`  website : http://127.0.0.1:${WEB_PORT}`);
  console.log(`  relay   : http://127.0.0.1:${API_PORT}/api/status`);
  console.log("  press Ctrl+C to stop both");
  console.log("");

  const shutdown = () => {
    children.forEach((child) => {
      try {
        process.platform === "win32"
          ? spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" })
          : child.kill();
      } catch (_) {}
    });
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  children.forEach((child) =>
    child.on("close", () => {
      if (children.every((c) => c.exitCode !== null || c.killed)) shutdown();
    })
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
