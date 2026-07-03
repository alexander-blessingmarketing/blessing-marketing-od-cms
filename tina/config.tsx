import {
  UsernamePasswordAuthJSProvider,
  TinaUserCollection,
} from "tinacms-authjs/dist/tinacms";
import { defineConfig, LocalAuthProvider } from "tinacms";

import { SiteCollection } from "./collections/site";

const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

export default defineConfig({
  authProvider: isLocal
    ? new LocalAuthProvider()
    : new UsernamePasswordAuthJSProvider(),
  contentApiUrlOverride: "/api/tina/gql",
  build: {
    publicFolder: "public",
    outputFolder: "admin",
  },
  media: {
    // Custom git-backed store (lib/media-store.ts) instead of `tina` — the built-in
    // store runs in cloud mode for a self-hosted apiUrl and can't talk to a git backend.
    loadCustomStore: async () => {
      const mod = await import("../lib/media-store");
      return mod.GitMediaStore;
    },
  },
  schema: {
    collections: [TinaUserCollection, SiteCollection],
  },
});
