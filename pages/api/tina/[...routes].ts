import { TinaNodeBackend, LocalBackendAuthProvider } from "@tinacms/datalayer";

import { AuthJsBackendAuthProvider } from "tinacms-authjs";

import type { NextApiRequest, NextApiResponse } from "next";
import databaseClient from "../../../tina/__generated__/databaseClient";
import { createMediaRoute } from "../../../lib/media-handler";
import { EnvAuthJSOptions } from "../../../lib/env-auth";

// Next's default body parser decodes multipart uploads as a utf-8 string (corrupting
// binary images) and caps them at 1mb. We disable it so the media upload handler can
// read the raw stream, and re-create `req.body` below for the gql/auth routes exactly
// as Next would (JSON / urlencoded) so those keep working unchanged.
export const config = { api: { bodyParser: false } };

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

const baseAuth = isLocal
  ? LocalBackendAuthProvider()
  : AuthJsBackendAuthProvider({
      // Env-based credentials (design §6, Fallback ②): users are decoupled from both the
      // public repo and the datalayer — verified against ADMIN_PASSWORD_HASH /
      // AGENCY_ADMIN_PASSWORD_HASH. No content/users record, so no redeploy staleness.
      authOptions: EnvAuthJSOptions({
        secret: process.env.NEXTAUTH_SECRET!,
      }),
    });

const handler = TinaNodeBackend({
  authProvider: {
    ...baseAuth,
    extraRoutes: { ...(baseAuth.extraRoutes || {}), media: createMediaRoute() },
  },
  databaseClient,
});

async function bufferBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const c of req as any)
    chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
  return Buffer.concat(chunks).toString("utf8");
}

const tinaHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  const action = new URL(req.url || "", "http://x").pathname
    .split("/")
    .filter(Boolean)[2]; // /api/tina/<action>/...

  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method || "GET");
  // Media routes read the raw stream in their own handler — leave the body untouched.
  if (hasBody && action !== "media" && (req as any).body === undefined) {
    const raw = await bufferBody(req);
    const type = (req.headers["content-type"] || "").split(";")[0].trim();
    if (type === "application/json" || type === "application/ld+json") {
      (req as any).body = raw ? JSON.parse(raw) : {};
    } else if (type === "application/x-www-form-urlencoded") {
      (req as any).body = Object.fromEntries(new URLSearchParams(raw));
    } else {
      (req as any).body = raw;
    }
  }

  return handler(req as any, res as any);
};

export default tinaHandler;
