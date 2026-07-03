import type { NextApiRequest, NextApiResponse } from "next";
import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";

// Serves media for the Tina editor's thumbnails. Files live in the
// locally-fetched copy of the client repo; if not present (e.g. cold
// serverless instance without a full checkout), fall back to redirecting
// to the raw file in the client repo on GitHub.
const root = () =>
  `${process.env.CONTENT_PUBLIC_FOLDER || "src/clients/blessing-marketing-od"}/assets`;

export const config = { api: { responseLimit: false } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const rel = ([] as string[]).concat(req.query.path as any).join("/");
  const abs = join(process.cwd(), root(), rel);
  if (existsSync(abs)) {
    createReadStream(abs).pipe(res);
    return;
  }
  const owner = process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "";
  const repo = process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "";
  const branch = process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
  res.redirect(`https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${root()}/${rel}`);
}
