import type { NextApiRequest, NextApiResponse } from "next";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, sep, extname } from "node:path";

// Serves media for the Tina editor's thumbnails. Files live in the
// locally-fetched copy of the client repo; if not present, fall back to
// redirecting to the raw file in the client repo on GitHub.
const root = () =>
  `${process.env.CONTENT_PUBLIC_FOLDER || "src/clients/blessing-marketing-od"}/assets`;

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
};

export const config = { api: { responseLimit: false } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const rel = ([] as string[]).concat(req.query.path as any).join("/");
  const base = resolve(process.cwd(), root());
  const abs = resolve(base, rel);
  // Path containment: reject any resolved path that escapes the assets dir.
  if (abs !== base && !abs.startsWith(base + sep)) {
    res.status(400).end("bad path");
    return;
  }
  if (existsSync(abs) && statSync(abs).isFile()) {
    const mime = MIME[extname(abs).toLowerCase()];
    if (mime) res.setHeader("content-type", mime);
    createReadStream(abs).pipe(res);
    return;
  }
  const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "";
  const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "";
  const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
  res.redirect(302, `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${root()}/${rel}`);
}
