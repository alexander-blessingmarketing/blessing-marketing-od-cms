// Indexiert den (per fetch-content.mjs frisch geholten) Client-Content in den
// geteilten Mongo-Datalayer — OHNE `tinacms build`, also OHNE den teuren Codegen/
// Admin-Build (~3,3 GB). Der Admin ist bereits im Image gebacken (siehe Dockerfile:
// `tinacms build --skip-indexing`), hier läuft nur noch die Indexierung.
//
// Spiegelt die CLI-Interna von @tinacms/cli (indexContentWithSpinner) und die
// Datalayer-Konstruktion aus tina/database.ts. Getestet gegen @tinacms/graphql@2.4.1
// — bei Tina-Upgrades gegen die CLI-Quelle gegenprüfen (dist/index.js:
// createAndInitializeDatabase + buildSchema + database.indexContent).
import { createDatabase, createSchema, FilesystemBridge } from "@tinacms/graphql";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

// mongodb-level and tinacms-gitprovider-github are CommonJS — a bare ESM named
// import fails under plain Node (works in database.ts only via esbuild/Next interop).
// createRequire loads them CJS-style. @tinacms/graphql above is ESM-importable.
const require = createRequire(import.meta.url);
const { MongodbLevel } = require("mongodb-level");
const { GitHubProvider } = require("tinacms-gitprovider-github");

const root = process.cwd();
const genDir = path.join(root, "tina", "__generated__");

// Codegen-Artefakte, die im Image gebacken sind:
//  _graphql.json = GraphQL-AST (DocumentNode), _schema.json = Schema-Objekt,
//  _lookup.json  = Lookup-Map. Aus denen bauen wir tinaSchema statt tina/config.tsx
//  zur Laufzeit zu kompilieren (robuster, kein esbuild/TSX-Schritt nötig).
const readJson = async (name) =>
  JSON.parse(await readFile(path.join(genDir, name), "utf8"));

const [graphQLSchema, schema, lookup] = await Promise.all([
  readJson("_graphql.json"),
  readJson("_schema.json"),
  readJson("_lookup.json"),
]);

// The `site` collection's path is per-client via CONTENT_PATH (see tina/collections/
// site.ts) — a RUNTIME env. The schema baked into the image was generated at build time
// when CONTENT_PATH was unset, so it fell back to "content". Re-apply the runtime value
// (mirroring site.ts) so this index writes the site doc at the real content location.
// The backend resolves against the schema THIS index stores in the datalayer, so fixing
// it here fixes both indexing and querying. Other collections keep their baked paths.
const siteCollectionPath = process.env.CONTENT_PATH || "content";
for (const c of schema.collections) {
  if (c.name === "site") c.path = siteCollectionPath;
}

const tinaSchema = await createSchema({ schema });

// --- Datalayer identisch zu tina/database.ts (Produktionszweig, Mongo) ---
const branch =
  process.env.GITHUB_BRANCH || process.env.VERCEL_GIT_COMMIT_REF || "main";

const database = createDatabase({
  gitProvider: new GitHubProvider({
    branch,
    owner: process.env.GITHUB_OWNER || process.env.VERCEL_GIT_REPO_OWNER,
    repo: process.env.GITHUB_REPO || process.env.VERCEL_GIT_REPO_SLUG,
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
  }),
  databaseAdapter: new MongodbLevel({
    collectionName: `tinacms-${branch}`,
    dbName: process.env.MONGO_DB || "tinacms",
    mongoUri: process.env.MONGODB_URI,
  }),
  namespace: branch,
});

// Die CLI hängt der self-hosted DB eine FilesystemBridge an (dist/index.js:1338).
// Sie liest die Content-Dateien von der Platte (dort, wo fetch-content.mjs sie ablegt).
database.bridge = new FilesystemBridge(root);

// Voll-Reindex bei jedem Start. Content ist minimal (Single-Doc-JSON pro Client),
// daher kein Partial-Reindex/SHA-Handling nötig (das bräuchte ein .git im Container).
await database.indexContent({ graphQLSchema, tinaSchema, lookup });

console.log(
  `index-content: reindexed branch "${branch}" (site path "${siteCollectionPath}") into Mongo datalayer`
);
process.exit(0);
