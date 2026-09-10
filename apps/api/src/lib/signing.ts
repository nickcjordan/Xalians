// Signs and verifies legacy showroom Xalians (audit F2). GET /xalian returns a record
// generated server-side plus an HMAC over it; POST /db/xalian verifies that HMAC before
// persisting, so a client can no longer keep a record it fabricated or tampered with.
//
// The secret comes from XALIAN_SIGNING_SECRET (a random_password resource in main.tf,
// injected only into the GenerateXalian and TableCreateXalian functions). It is read
// lazily on first use rather than at module load, so importing this file in a test or a
// handler that never signs anything does not require the env var to be set.
import { createHmac, timingSafeEqual } from 'node:crypto';

function secret(): string {
  const value = process.env.XALIAN_SIGNING_SECRET;
  if (!value) {
    throw new Error('XALIAN_SIGNING_SECRET is not set; cannot sign or verify a Xalian record');
  }
  return value;
}

// Canonical JSON: object keys sorted recursively, no whitespace. Two calls with the same
// logical record (regardless of key insertion order) produce byte-identical input to the
// HMAC, which is what makes verification independent of how the record was constructed
// or re-serialized on its way over the wire.
export function canonicalize(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value as Record<string, unknown>).sort();
    const entries = keys.map((key) => `${JSON.stringify(key)}:${canonicalize((value as Record<string, unknown>)[key])}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

export function signRecord(record: unknown): string {
  return createHmac('sha256', secret()).update(canonicalize(record)).digest('hex');
}

export function verifyRecord(record: unknown, signature: string): boolean {
  const expected = signRecord(record);
  const expectedBuf = Buffer.from(expected, 'hex');
  const actualBuf = Buffer.from(signature ?? '', 'hex');
  // timingSafeEqual throws if the buffers differ in length, which a forged or
  // truncated signature will; treat that as "not verified" rather than an error.
  if (expectedBuf.length !== actualBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, actualBuf);
}
