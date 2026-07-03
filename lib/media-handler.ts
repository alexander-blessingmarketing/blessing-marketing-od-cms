import { Octokit } from "@octokit/rest";

// Git-backed media for self-hosted Tina. Reads/writes assets in the client repo.
const owner = () =>
  process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER || "";
const repo = () =>
  process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG || "";
const branch = () =>
  process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";
const publicFolder = () =>
  process.env.CONTENT_PUBLIC_FOLDER || "src/clients/blessing-marketing-od";
const mediaRoot = () => "assets";
const octokit = () => new Octokit({ auth: process.env.GITHUB_PERSONAL_ACCESS_TOKEN });
const repoDir = (dir?: string) =>
  `${publicFolder()}/${mediaRoot()}${dir ? "/" + dir : ""}`;
// Thumbnails/Vorschau werden vom Backend serviert (Task 6): /api/assets/<file>
const srcFor = (file: string) => `/api/assets/${file}`;

export function createMediaRoute() {
  return {
    secure: true,
    handler: async (req: any, res: any) => {
      const parts = new URL(req.url, "http://x").pathname
        .split("/")
        .filter(Boolean); // [api,tina,media,<op>,...]
      const op = parts[3];
      if (req.method === "GET" && op === "list") {
        const dir = parts.slice(4).join("/");
        const files: { filename: string; src: string }[] = [];
        const directories: string[] = [];
        try {
          const { data } = await octokit().repos.getContent({
            owner: owner(),
            repo: repo(),
            path: repoDir(dir),
            ref: branch(),
          });
          for (const item of Array.isArray(data) ? data : []) {
            if (item.type === "dir") directories.push(item.name);
            else
              files.push({
                filename: item.name,
                src: srcFor((dir ? dir + "/" : "") + item.name),
              });
          }
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ cursor: null, files, directories }));
        return;
      }
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "media op not implemented" }));
    },
  };
}
