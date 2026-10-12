import { randomBytes } from 'node:crypto';
import { KIND_LETTER, type Kind } from './schema.ts';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ALIAS_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

/** A ULID: 10 time characters (48-bit ms) then 16 random characters, Crockford base32. */
export function ulid(time: number = Date.now()): string {
	let t = time;
	let timePart = '';
	for (let i = 0; i < 10; i++) {
		timePart = CROCKFORD[t % 32] + timePart;
		t = Math.floor(t / 32);
	}
	const bytes = randomBytes(16);
	let rand = '';
	for (let i = 0; i < 16; i++) rand += CROCKFORD[bytes[i]! % 32];
	return timePart + rand;
}

export function newId(kind: Kind, time?: number): string {
	return `${KIND_LETTER[kind]}-${ulid(time)}`;
}

/** A short display alias, kind letter plus four lowercase base32 characters, unique among `taken`. */
export function newAlias(kind: Kind, taken: ReadonlySet<string>): string {
	for (;;) {
		const bytes = randomBytes(4);
		let s = '';
		for (let i = 0; i < 4; i++) s += ALIAS_ALPHABET[bytes[i]! % 32];
		const alias = `${KIND_LETTER[kind]}-${s}`;
		if (!taken.has(alias)) return alias;
	}
}
