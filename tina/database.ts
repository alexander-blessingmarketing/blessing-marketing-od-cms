import { createDatabase, createLocalDatabase } from "@tinacms/datalayer";
import { MongodbLevel } from "mongodb-level";
import { GitHubProvider } from "tinacms-gitprovider-github";

// Manage this flag in your CI/CD pipeline and make sure it is set to false in production
const isLocal = process.env.TINA_PUBLIC_IS_LOCAL === "true";

// Build-only escape hatch. During the image build we run `tinacms build` purely to
// generate the admin bundle + client/types (codegen). That step forces a datalayer
// connection even with --skip-indexing, so without this we'd need a live Mongo at
// build time. TINA_BUILD_LOCAL_DB=true swaps ONLY the datalayer to an in-memory local
// one; TINA_PUBLIC_IS_LOCAL stays false so the generated client + auth remain
// production-mode. Runtime indexing runs separately via scripts/index-content.mjs.
// NEVER set this at container runtime.
const buildLocalDb = process.env.TINA_BUILD_LOCAL_DB === "true";

const token = process.env.GITHUB_PERSONAL_ACCESS_TOKEN as string;
const owner = (process.env.GITHUB_OWNER ||
  process.env.VERCEL_GIT_REPO_OWNER) as string;
const repo = (process.env.GITHUB_REPO ||
  process.env.VERCEL_GIT_REPO_SLUG) as string;
const branch = (process.env.GITHUB_BRANCH ||
  process.env.VERCEL_GIT_COMMIT_REF ||
  "main") as string;

if (!isLocal && !branch) {
  throw new Error(
    "No branch found. Make sure that you have set the GITHUB_BRANCH or process.env.VERCEL_GIT_COMMIT_REF environment variable."
  );
}

export default isLocal || buildLocalDb
  ? createLocalDatabase()
  : createDatabase({
      gitProvider: new GitHubProvider({
        branch,
        owner,
        repo,
        token,
      }),
      databaseAdapter: new MongodbLevel<string, Record<string, unknown>>({
        collectionName: `tinacms-${branch}`,
        dbName: process.env.MONGO_DB || "tinacms",
        mongoUri: process.env.MONGODB_URI as string,
      }),
      namespace: branch,
    });
