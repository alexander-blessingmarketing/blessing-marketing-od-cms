import { TinaNodeBackend, LocalBackendAuthProvider } from "@tinacms/datalayer";

import { TinaAuthJSOptions, AuthJsBackendAuthProvider } from "tinacms-authjs";

import databaseClient from "../../../tina/__generated__/databaseClient";
import { createMediaRoute } from "../../../lib/media-handler";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

const baseAuth = isLocal
  ? LocalBackendAuthProvider()
  : AuthJsBackendAuthProvider({
      authOptions: TinaAuthJSOptions({
        databaseClient: databaseClient,
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

const tinaHandler = (req, res) => {
  // Modify the request here if you need to
  return handler(req, res);
};

export default tinaHandler;
