// Generate a pbkdf2 password hash compatible with tinacms + lib/env-auth.ts.
// Usage: node scripts/gen-password-hash.mjs "<plaintext-password>"
// Prints the salted hash to paste into ADMIN_PASSWORD_HASH / AGENCY_ADMIN_PASSWORD_HASH.
import crypto from "node:crypto";

const SALT_LENGTH = 32;
const KEY_LENGTH = 512;
const ITERATIONS = 25000;
const DIGEST = "sha256";

const password = process.argv[2];
if (!password || password.length < 3) {
  console.error('Usage: node scripts/gen-password-hash.mjs "<password (>= 3 chars)>"');
  process.exit(1);
}

const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
const hash = crypto
  .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
  .toString("hex");
process.stdout.write(`${salt}${hash}\n`);
