import {
  UsernamePasswordAuthJSProvider,
  TinaUserCollection,
} from "tinacms-authjs/dist/tinacms";
import { defineConfig, LocalAuthProvider } from "tinacms";

import { BlessingCollection } from "./collections/blessing";

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
    tina: {
      mediaRoot: "assets",
      publicFolder: "src/clients/blessing-marketing-od",
      // Read-only static media: `tinacms build` generates a manifest of the
      // baked-in assets, so the Media Manager lists them without a backend
      // media route (TinaNodeBackend serves only gql+auth). Uploading new files
      // needs a custom /api/tina/media handler — deferred to the one-repo move.
      static: true,
    },
  },
  schema: {
    collections: [TinaUserCollection, BlessingCollection],
  },
});
