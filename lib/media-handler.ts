import { Octokit } from "@octokit/rest";

// Git-backed media for self-hosted Tina. Reads/writes assets in the client repo.
//
// Request contract (confirmed by reading tinacms/dist media store, `TinaMediaStore`):
//   list   → GET    /api/tina/media/list/<dir>?limit=..   → { cursor, files:[{filename,src}], directories }
//   upload → POST   /api/tina/media/upload/<path>         → multipart form (fields: file, directory,
//            filename); the store (persist_local) checks the JSON response for `{ success: true }`.
//   delete → DELETE /api/tina/media/<path>                → any 200; store is fire-and-forget in local mode.
// Note: delete has NO "delete" path segment — it is method DELETE on the file path directly.
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

// Minimal multipart/form-data parser over a raw Buffer. Extracts the single file
// part (name="file", the field tinacms' persist_local sends) with its binary intact.
function parseMultipartSingleFile(
  body: Buffer,
  contentType: string
): { filename: string; content: Buffer } | null {
  const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(contentType || "");
  const boundary = m && (m[1] || m[2]);
  if (!boundary) return null;
  const delimiter = Buffer.from(`--${boundary}`);
  // Split the raw body on the boundary delimiter without decoding the binary.
  const parts: Buffer[] = [];
  let start = body.indexOf(delimiter);
  if (start === -1) return null;
  start += delimiter.length;
  while (true) {
    const next = body.indexOf(delimiter, start);
    if (next === -1) break;
    parts.push(body.subarray(start, next));
    start = next + delimiter.length;
  }
  for (let part of parts) {
    // Strip leading CRLF after the delimiter.
    if (part[0] === 0x0d && part[1] === 0x0a) part = part.subarray(2);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd === -1) continue;
    const headers = part.subarray(0, headerEnd).toString("utf8");
    const cd = /content-disposition:[^\r\n]*/i.exec(headers)?.[0] || "";
    if (!/name="file"/i.test(cd)) continue;
    const fnMatch = /filename="([^"]*)"/i.exec(cd);
    const filename = fnMatch ? fnMatch[1] : "upload.bin";
    // Content is between the header block and the trailing CRLF before the next delimiter.
    let content = part.subarray(headerEnd + 4);
    if (content[content.length - 2] === 0x0d && content[content.length - 1] === 0x0a) {
      content = content.subarray(0, content.length - 2);
    }
    return { filename, content };
  }
  return null;
}

async function readRawBody(req: any): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks);
}

export function createMediaRoute() {
  return {
    secure: true,
    handler: async (req: any, res: any) => {
      const parts = new URL(req.url, "http://x").pathname
        .split("/")
        .filter(Boolean); // [api,tina,media,<op>,...]
      const op = parts[3];

      // --- list ---
      if (req.method === "GET" && op === "list") {
        // Decode: URL.pathname keeps segments percent-encoded (e.g. %20 for spaces).
        const dir = decodeURIComponent(parts.slice(4).join("/"));
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

      // --- upload ---  POST /api/tina/media/upload/<path>
      if (req.method === "POST" && op === "upload") {
        const contentType = req.headers["content-type"] || "";
        // Spike aid: first real upload confirms the request shape in the deployed admin logs.
        console.log("[media] upload content-type:", contentType);
        const raw = await readRawBody(req);
        const parsed = parseMultipartSingleFile(raw, contentType);
        if (!parsed) {
          res.statusCode = 400;
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify({ success: false, message: "could not parse upload body" }));
          return;
        }
        const { filename, content } = parsed;
        const path = `${repoDir("")}/${filename}`;
        await octokit().repos.createOrUpdateFileContents({
          owner: owner(),
          repo: repo(),
          path,
          branch: branch(),
          message: `media: upload ${filename}`,
          content: content.toString("base64"),
        });
        // Write locally too so the just-uploaded asset serves immediately via /api/assets.
        const fs = await import("node:fs");
        fs.mkdirSync(`${publicFolder()}/${mediaRoot()}`, { recursive: true });
        fs.writeFileSync(`${publicFolder()}/${mediaRoot()}/${filename}`, content);
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        // persist_local requires `success: true`; it builds `src` client-side.
        res.end(JSON.stringify({ success: true, filename, src: srcFor(filename) }));
        return;
      }

      // --- delete ---  DELETE /api/tina/media/<path>  (no "delete" segment)
      if (req.method === "DELETE") {
        // Decode: filenames with spaces arrive percent-encoded (%20) in the pathname;
        // passing that raw to the GitHub API would look up a literal "%20" name (404).
        const name = decodeURIComponent(parts.slice(3).join("/"));
        const path = `${repoDir("")}/${name}`;
        try {
          const { data } = await octokit().repos.getContent({
            owner: owner(),
            repo: repo(),
            path,
            ref: branch(),
          });
          const sha = (data as any).sha;
          await octokit().repos.deleteFile({
            owner: owner(),
            repo: repo(),
            path,
            branch: branch(),
            message: `media: delete ${name}`,
            sha,
          });
        } catch (e: any) {
          if (e.status !== 404) throw e;
        }
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ ok: true }));
        return;
      }

      // Cloud-mode signed-upload path — only reached if the media store is NOT in local
      // mode. Git-backed media requires local mode; fail loudly so this is unmistakable.
      if (req.method === "GET" && op === "upload_url") {
        console.error(
          "[media] upload_url requested — media store is in CLOUD mode, git-backed upload needs LOCAL mode (see design §7/§11)"
        );
        res.statusCode = 501;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "git-backed media requires local media mode; store is in cloud mode",
          })
        );
        return;
      }

      res.statusCode = 404;
      res.end(JSON.stringify({ error: "media op not implemented" }));
    },
  };
}
