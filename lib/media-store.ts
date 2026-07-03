import type {
  Media,
  MediaList,
  MediaListOptions,
  MediaStore,
  MediaUploadOptions,
} from "tinacms";

// Client-side media store for self-hosted Tina.
//
// Why a custom store: for a self-hosted apiUrl the built-in TinaMediaStore runs in
// NON-local mode (parseURL("/api/tina/gql") => isLocalClient:false), which speaks the
// Tina Cloud signed-URL protocol (GET media/upload_url -> PUT to S3 -> poll status).
// That is incompatible with a git backend. This store bypasses that entirely and talks
// directly to our git-backed /api/tina/media routes (list/upload/delete) — the canonical
// self-hosted approach. Wired via `media.loadCustomStore` in tina/config.tsx.
const BASE = "/api/tina/media";
// Preview URL — served by the backend asset route from the locally-fetched copy.
const assetSrc = (rel: string) => `/api/assets/${rel}`;
// Value stored in content (Astro-relative), matching existing de.json refs "assets/<file>".
const fieldValue = (rel: string) => `assets/${rel}`;

const trim = (s: string) => (s || "").replace(/^\/+|\/+$/g, "");

function toMedia(filename: string, directory: string): Media {
  const rel = directory ? `${directory}/${filename}` : filename;
  return {
    type: "file",
    id: rel,
    filename,
    directory,
    src: assetSrc(rel),
    thumbnails: {
      "75x75": assetSrc(rel),
      "400x400": assetSrc(rel),
      "1000x1000": assetSrc(rel),
    },
  };
}

export class GitMediaStore implements MediaStore {
  accept = "*";

  async persist(files: MediaUploadOptions[]): Promise<Media[]> {
    const out: Media[] = [];
    for (const { file, directory } of files) {
      const dir = trim(directory);
      const uploadPath = dir ? `${dir}/${file.name}` : file.name;
      const form = new FormData();
      form.append("file", file);
      form.append("directory", directory);
      form.append("filename", file.name);
      const res = await fetch(`${BASE}/upload/${uploadPath}`, {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error(`upload failed: ${res.status}`);
      const data = await res.json().catch(() => ({}));
      if (!data?.success) throw new Error(data?.message || "upload failed");
      out.push(toMedia(file.name, dir));
    }
    return out;
  }

  async list(options?: MediaListOptions): Promise<MediaList> {
    const dir = trim(options?.directory || "");
    const limit = options?.limit || 20;
    const res = await fetch(`${BASE}/list/${dir}?limit=${limit}`, {
      credentials: "same-origin",
    });
    if (res.status === 404) throw new Error("media route not found");
    if (!res.ok) throw new Error(`list failed: ${res.status}`);
    const { files = [], directories = [] } = await res.json();
    const items: Media[] = [
      ...directories.map((name: string) => ({
        type: "dir" as const,
        id: name,
        filename: name,
        directory: dir,
      })),
      ...files.map((f: { filename: string }) => toMedia(f.filename, dir)),
    ];
    return { items, nextOffset: undefined };
  }

  async delete(media: Media): Promise<void> {
    const rel = media.directory
      ? `${media.directory}/${media.filename}`
      : media.filename;
    const res = await fetch(`${BASE}/${rel}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    if (!res.ok) throw new Error(`delete failed: ${res.status}`);
  }

  // The value written into content when an image is picked.
  parse(media: Media): string {
    const rel = media.directory
      ? `${media.directory}/${media.filename}`
      : media.filename;
    return fieldValue(rel);
  }
}
