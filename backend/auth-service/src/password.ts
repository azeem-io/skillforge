import { randomBytes, timingSafeEqual } from "node:crypto";

import { argon2idAsync } from "@noble/hashes/argon2.js";

/**
 * argon2id at the OWASP baseline, wired into `emailAndPassword.password`.
 * Two backends, one output format: `Bun.password` natively when the process
 * runs under Bun, pure JS otherwise. Both emit and consume the standard PHC
 * string, and argon2id is deterministic given the same salt and parameters, so
 * a hash written by either verifies under the other.
 */
const MEMORY_COST = 19_456; // KiB — 19 MiB
const TIME_COST = 2;
const PARALLELISM = 1;
const SALT_BYTES = 32;
const HASH_BYTES = 32;
/** Argon2 0x13, the only version either backend emits. */
const VERSION = 19;

const ARGON2ID_OPTIONS = {
  algorithm: "argon2id",
  memoryCost: MEMORY_COST,
  timeCost: TIME_COST,
} as const;

/**
 * How long the pure-JS derivation may hold the thread before yielding, in ms.
 * It costs roughly half a second at these parameters; without a yield budget
 * that is half a second in which the service answers nothing at all.
 */
const ASYNC_TICK_MS = 10;

type BunPassword = {
  hash(
    password: string,
    options: { algorithm: "argon2id"; memoryCost: number; timeCost: number },
  ): Promise<string>;
  verify(password: string, hash: string): Promise<boolean>;
};

function bunPassword(): BunPassword | null {
  const runtime = (globalThis as { Bun?: { password?: BunPassword } }).Bun;
  return runtime?.password ?? null;
}

/** Unpadded standard base64, the alphabet PHC strings use. */
function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64").replace(/=+$/, "");
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

export type Argon2Params = {
  memoryCost: number;
  timeCost: number;
  parallelism: number;
  version: number;
  salt: Uint8Array;
  hash: Uint8Array;
};

/**
 * Returns null rather than throwing: a stored hash this service cannot read
 * must fail the login, not raise a 500 that distinguishes "unreadable hash"
 * from "wrong password".
 */
export function parsePhc(value: string): Argon2Params | null {
  const parts = value.split("$");
  if (parts.length !== 6 || parts[0] !== "" || parts[1] !== "argon2id") {
    return null;
  }

  const version = /^v=(\d+)$/.exec(parts[2]!);
  const params = /^m=(\d+),t=(\d+),p=(\d+)$/.exec(parts[3]!);
  if (!version || !params) return null;

  const salt = fromBase64(parts[4]!);
  const hash = fromBase64(parts[5]!);
  if (salt.length === 0 || hash.length < 4) return null;

  return {
    version: Number(version[1]),
    memoryCost: Number(params[1]),
    timeCost: Number(params[2]),
    parallelism: Number(params[3]),
    salt,
    hash,
  };
}

export function formatPhc(params: Argon2Params): string {
  const { version, memoryCost, timeCost, parallelism, salt, hash } = params;
  return [
    "",
    "argon2id",
    `v=${version}`,
    `m=${memoryCost},t=${timeCost},p=${parallelism}`,
    toBase64(salt),
    toBase64(hash),
  ].join("$");
}

/**
 * `p` comes from the stored hash on the verify path so a hash written with
 * different parameters still verifies; only `hashPassword` pins the baseline.
 */
async function deriveKey(
  password: string,
  params: Omit<Argon2Params, "hash">,
  dkLen: number,
): Promise<Uint8Array> {
  return argon2idAsync(password, params.salt, {
    m: params.memoryCost,
    t: params.timeCost,
    p: params.parallelism,
    version: params.version,
    dkLen,
    asyncTick: ASYNC_TICK_MS,
  });
}

export async function hashPassword(password: string): Promise<string> {
  const native = bunPassword();
  if (native) return native.hash(password, ARGON2ID_OPTIONS);

  const salt = new Uint8Array(randomBytes(SALT_BYTES));
  const params = {
    memoryCost: MEMORY_COST,
    timeCost: TIME_COST,
    parallelism: PARALLELISM,
    version: VERSION,
    salt,
  };
  const hash = await deriveKey(password, params, HASH_BYTES);
  return formatPhc({ ...params, hash });
}

/**
 * `timingSafeEqual` throws on a length mismatch rather than returning false,
 * so lengths are checked first — that leaks only the digest length, which the
 * PHC string publishes anyway.
 */
function constantTimeEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Signature matches Better Auth's `password.verify` contract exactly. */
export async function verifyPassword({
  hash,
  password,
}: {
  hash: string;
  password: string;
}): Promise<boolean> {
  const native = bunPassword();
  if (native) {
    // Bun throws on a hash it cannot parse; a value this service never wrote
    // is a failed login, not a 500.
    try {
      return await native.verify(password, hash);
    } catch {
      return false;
    }
  }

  const parsed = parsePhc(hash);
  if (!parsed) return false;

  const derived = await deriveKey(password, parsed, parsed.hash.length);
  return constantTimeEquals(derived, parsed.hash);
}
