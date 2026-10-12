import { createHash, randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { StudioError } from './errors.ts';

export const DEFAULT_STORE = 'C:/dev/art-data/studio';

/** The blob store root. Read on every call so tests and tools can point it elsewhere. */
export function storeRoot(): string {
	return process.env.XALIANS_STUDIO_STORE ?? DEFAULT_STORE;
}

const SHA = /^[0-9a-f]{64}$/;

export function blobPath(sha: string, root: string = storeRoot()): string {
	if (!SHA.test(sha)) throw new StudioError(`not a sha256: ${sha}`);
	return join(root, 'blobs', sha.slice(0, 2), sha);
}

export function hasBlob(sha: string, root: string = storeRoot()): boolean {
	return SHA.test(sha) && existsSync(blobPath(sha, root));
}

/** Stores a file under its sha256 and returns the hash. Copies only when the blob is missing; writes a temp file then renames. */
export function putFile(file: string, root: string = storeRoot()): string {
	if (!existsSync(file)) throw new StudioError(`file not found: ${file}`);
	const sha = createHash('sha256').update(readFileSync(file)).digest('hex');
	const dest = blobPath(sha, root);
	if (existsSync(dest)) return sha;
	mkdirSync(dirname(dest), { recursive: true });
	const tmp = `${dest}.tmp-${process.pid}-${randomBytes(4).toString('hex')}`;
	try {
		copyFileSync(file, tmp);
		renameSync(tmp, dest);
	} catch (e) {
		rmSync(tmp, { force: true });
		if (!existsSync(dest)) throw e;
	}
	return sha;
}
