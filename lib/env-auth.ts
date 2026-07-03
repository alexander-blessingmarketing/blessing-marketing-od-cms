import CredentialsProvider from "next-auth/providers/credentials";
import crypto from "node:crypto";

// Decoupled auth (design §6, Fallback ②): users live neither in the public repo nor
// in the datalayer — they are verified against env-provided pbkdf2 hashes. This removes
// the public-creds smell AND the redeploy-staleness risk (nothing to re-index/clobber),
// at the cost of self-service password change (accepted trade-off).
//
// The pbkdf2 parameters below MUST match @tinacms/graphql `generatePasswordHash`
// (dist/index.js): salt = 32 random bytes, keyLength 512, 25000 iterations, sha256,
// stored as `${saltHex}${hashHex}`. `scripts/gen-password-hash.mjs` produces values in
// this exact format for ADMIN_PASSWORD_HASH / AGENCY_ADMIN_PASSWORD_HASH.
const SALT_LENGTH = 32;
const KEY_LENGTH = 512;
const ITERATIONS = 25000;
const DIGEST = "sha256";

export function checkPasswordHash(saltedHash: string, password: string): boolean {
  if (!saltedHash || !password) return false;
  // Tolerate whitespace/newlines in the stored hash: a long hash pasted into a YAML
  // compose/.env often wraps across lines, and YAML folds those newlines into spaces
  // mid-hex. Strip all whitespace so the value is used as one continuous hex string.
  saltedHash = saltedHash.replace(/\s+/g, "");
  const salt = saltedHash.slice(0, SALT_LENGTH * 2);
  const expectedHex = saltedHash.slice(SALT_LENGTH * 2);
  if (!salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
  return (
    actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  );
}

type EnvUser = { username: string; hash: string; sub: string };

function envUsers(): EnvUser[] {
  const users: EnvUser[] = [];
  // Client-specific admin.
  if (process.env.ADMIN_USER && process.env.ADMIN_PASSWORD_HASH) {
    users.push({
      username: process.env.ADMIN_USER,
      hash: process.env.ADMIN_PASSWORD_HASH,
      sub: "client-admin",
    });
  }
  // Agency admin — same credentials wired into every instance's env.
  if (process.env.AGENCY_ADMIN_USER && process.env.AGENCY_ADMIN_PASSWORD_HASH) {
    users.push({
      username: process.env.AGENCY_ADMIN_USER,
      hash: process.env.AGENCY_ADMIN_PASSWORD_HASH,
      sub: "agency-admin",
    });
  }
  return users;
}

const TINA_CREDENTIALS_PROVIDER_NAME = "TinaCredentials";

function EnvCredentialsProvider() {
  const provider = (CredentialsProvider as any).default
    ? (CredentialsProvider as any).default(makeConfig())
    : (CredentialsProvider as any)(makeConfig());
  provider.name = TINA_CREDENTIALS_PROVIDER_NAME;
  return provider;
}

function makeConfig() {
  return {
    credentials: {
      username: { label: "Username", type: "text" },
      password: { label: "Password", type: "password" },
    },
    authorize: async (credentials: any) => {
      const user = envUsers().find((u) => u.username === credentials?.username);
      if (user && checkPasswordHash(user.hash, credentials?.password || "")) {
        return { id: user.sub, sub: user.sub, name: user.username };
      }
      return null;
    },
  };
}

// Mirrors tinacms-authjs `TinaAuthJSOptions` but resolves role from the env-authenticated
// user instead of `databaseClient.authorize`, so no datalayer user record is needed.
export function EnvAuthJSOptions({ secret }: { secret: string }) {
  return {
    session: { strategy: "jwt" as const },
    secret,
    providers: [EnvCredentialsProvider()],
    callbacks: {
      jwt: async ({ token, user }: any) => {
        if (user) {
          token.sub = user.sub;
          token.role = "user";
          token.passwordChangeRequired = false;
        }
        if (token.role === undefined) token.role = "guest";
        return token;
      },
      session: async ({ session, token }: any) => {
        session.user.role = token.role;
        session.user.passwordChangeRequired = false;
        session.user.sub = token.sub;
        return session;
      },
    },
  };
}
