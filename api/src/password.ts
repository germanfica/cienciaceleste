import { argon2, randomBytes, timingSafeEqual } from "node:crypto";

const FORMAT = "cc-argon2id-v1";
const MEMORY = 65_536;
const PASSES = 3;
const PARALLELISM = 1;
const TAG_LENGTH = 32;
const SALT_LENGTH = 16;

type StoredHash = {
  memory: number;
  passes: number;
  parallelism: number;
  tagLength: number;
  salt: Buffer;
  digest: Buffer;
};

function derive(password: string, salt: Buffer, parameters: Omit<StoredHash, "salt" | "digest">): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    argon2(
      "argon2id",
      {
        message: Buffer.from(password, "utf8"),
        nonce: salt,
        memory: parameters.memory,
        passes: parameters.passes,
        parallelism: parameters.parallelism,
        tagLength: parameters.tagLength
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      }
    );
  });
}

function parsePositiveInteger(value: string): number | null {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

function decodeStoredHash(encoded: string): StoredHash | null {
  const [format, parameters, saltText, digestText] = encoded.split("$");

  if (format !== FORMAT || !parameters || !saltText || !digestText) {
    return null;
  }

  const values = new Map(
    parameters.split(",").map(part => {
      const [key, value] = part.split("=");
      return [key, value] as const;
    })
  );

  const memory = parsePositiveInteger(values.get("m") ?? "");
  const passes = parsePositiveInteger(values.get("t") ?? "");
  const parallelism = parsePositiveInteger(values.get("p") ?? "");
  const tagLength = parsePositiveInteger(values.get("l") ?? "");

  if (!memory || !passes || !parallelism || !tagLength) {
    return null;
  }

  // Refuse malformed hashes before asking Argon2 to allocate unbounded memory.
  if (memory > 262_144 || passes > 10 || parallelism > 8 || tagLength > 128) {
    return null;
  }

  try {
    const salt = Buffer.from(saltText, "base64url");
    const digest = Buffer.from(digestText, "base64url");

    if (salt.length < SALT_LENGTH || digest.length !== tagLength) {
      return null;
    }

    return { memory, passes, parallelism, tagLength, salt, digest };
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const parameters = {
    memory: MEMORY,
    passes: PASSES,
    parallelism: PARALLELISM,
    tagLength: TAG_LENGTH
  };
  const digest = await derive(password, salt, parameters);

  return [
    FORMAT,
    `m=${parameters.memory},t=${parameters.passes},p=${parameters.parallelism},l=${parameters.tagLength}`,
    salt.toString("base64url"),
    digest.toString("base64url")
  ].join("$");
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const stored = decodeStoredHash(encoded);

  if (!stored) {
    return false;
  }

  const digest = await derive(password, stored.salt, stored);

  return digest.length === stored.digest.length && timingSafeEqual(digest, stored.digest);
}
