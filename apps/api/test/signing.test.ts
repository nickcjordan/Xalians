import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { canonicalize, signRecord, verifyRecord } from '../src/lib/signing.ts';

const ORIGINAL_SECRET = process.env.XALIAN_SIGNING_SECRET;

describe('signing', () => {
  beforeEach(() => {
    process.env.XALIAN_SIGNING_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.XALIAN_SIGNING_SECRET = ORIGINAL_SECRET;
  });

  it('round trips: a record signed with signRecord verifies with verifyRecord', () => {
    const record = { xalianId: 'fire-1', species: { name: 'Ember' }, stats: { speedPoints: { points: 5 } } };
    const signature = signRecord(record);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
    expect(verifyRecord(record, signature)).toBe(true);
  });

  it('is independent of key order (canonical JSON)', () => {
    const a = { xalianId: 'fire-1', species: { name: 'Ember', id: 'fire' } };
    const b = { species: { id: 'fire', name: 'Ember' }, xalianId: 'fire-1' };
    expect(canonicalize(a)).toBe(canonicalize(b));
    expect(signRecord(a)).toBe(signRecord(b));
  });

  it('fails verification when a stat is tampered with', () => {
    const record = { xalianId: 'fire-1', stats: { speedPoints: { points: 5 } } };
    const signature = signRecord(record);
    const tampered = { xalianId: 'fire-1', stats: { speedPoints: { points: 9999 } } };
    expect(verifyRecord(tampered, signature)).toBe(false);
  });

  it('fails verification for a garbage signature without throwing', () => {
    const record = { xalianId: 'fire-1' };
    expect(verifyRecord(record, 'not-hex-and-wrong-length')).toBe(false);
  });

  it('throws when the secret is missing', () => {
    delete process.env.XALIAN_SIGNING_SECRET;
    expect(() => signRecord({ a: 1 })).toThrow(/XALIAN_SIGNING_SECRET/);
  });
});
