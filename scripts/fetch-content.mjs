// Holt CONTENT_PATH (+ Geschwister-assets) frisch aus dem public Client-Repo.
// Public → kein Token nötig. Nutzt den Codeload-Tarball (kein git im Pfad nötig).
import { mkdirSync, createWriteStream, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { pipeline } from "node:stream/promises";

const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER;
const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG; // repo name only, no slash
const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const contentPath = process.env.CONTENT_PATH;      // "src/clients/<slug>/content"
if (!owner || !repo || !contentPath) { console.error("GITHUB_OWNER, GITHUB_REPO and CONTENT_PATH required"); process.exit(1); }
const slugDir = contentPath.replace(/\/content$/, ""); // "src/clients/<slug>"

const url = `https://codeload.github.com/${owner}/${repo}/tar.gz/refs/heads/${branch}`;
const res = await fetch(url);
if (!res.ok) { console.error(`content fetch failed: ${res.status} ${url}`); process.exit(1); }
mkdirSync("/tmp/site", { recursive: true });
await pipeline(res.body, createWriteStream("/tmp/site.tar.gz"));
// tar ist im slim-Image via apt (siehe Dockerfile). Strip den <repo>-<branch>/ Top-Ordner.
execFileSync("tar", ["-xzf", "/tmp/site.tar.gz", "-C", "/tmp/site", "--strip-components=1"], { stdio: "inherit" });
mkdirSync(slugDir, { recursive: true });
execFileSync("cp", ["-r", `/tmp/site/${contentPath}`, slugDir + "/"], { stdio: "inherit" });
execFileSync("cp", ["-r", `/tmp/site/${slugDir}/assets`, slugDir + "/"], { stdio: "inherit" });
rmSync("/tmp/site", { recursive: true, force: true });
console.log(`content fetched into ${slugDir}`);
