import { beforeEach, describe, expect, it, vi } from 'vitest';
import sampleGraviclaw from '../../../../../docs/design/sample-record-graviclaw.json';

const getIdToken = vi.hoisted(() => vi.fn());
vi.mock('../authUtil', () => ({ getIdToken }));

import {
	callCreateUser,
	callGenerateXalian,
	callGetUser,
	callListXalians,
	callReleaseXalian,
	callShowroomXalian,
} from '../dbApi';

beforeEach(() => {
	vi.restoreAllMocks();
	getIdToken.mockReset();
	getIdToken.mockResolvedValue('jwt-token');
});

describe('native API client', () => {
	it('keeps the showroom anonymous', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ record: sampleGraviclaw, keepable: false }), {
			status: 200,
			headers: { 'content-type': 'application/json' },
		}));

		await expect(callShowroomXalian()).resolves.toMatchObject({ record: sampleGraviclaw, keepable: false });
		expect(getIdToken).not.toHaveBeenCalled();
		expect(fetch).toHaveBeenCalledWith('https://api.xalians.com/prod/xalians/showroom', {});
	});

	it('sends JSON and the current ID token for writes', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

		await callCreateUser({ userId: 'nick', xalianIds: [] });

		expect(fetch).toHaveBeenCalledWith('https://api.xalians.com/prod/db/user', {
			method: 'POST',
			headers: { Authorization: 'Bearer jwt-token', 'content-type': 'application/json' },
			body: JSON.stringify({ userId: 'nick', xalianIds: [] }),
		});
	});

	it('propagates the current ID token to protected reads and deletes', async () => {
		vi.spyOn(globalThis, 'fetch')
			.mockResolvedValueOnce(new Response(JSON.stringify({ items: [], nextCursor: undefined }), { status: 200 }))
			.mockResolvedValueOnce(new Response(JSON.stringify({ message: 'ok' }), { status: 200 }));

		await callListXalians(undefined, 'page 2');
		await callReleaseXalian('xal/one');

		expect(fetch).toHaveBeenNthCalledWith(1, 'https://api.xalians.com/prod/xalians?cursor=page+2', {
			headers: { Authorization: 'Bearer jwt-token' },
		});
		expect(fetch).toHaveBeenNthCalledWith(2, 'https://api.xalians.com/prod/xalians/xal%2Fone', {
			method: 'DELETE',
			headers: { Authorization: 'Bearer jwt-token' },
		});
	});

	it('does not send a protected request when the session has no usable token', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		getIdToken.mockRejectedValue(new Error('The signed-in session did not include an ID token.'));

		await expect(callGenerateXalian(undefined, 'full')).rejects.toThrow('did not include an ID token');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('turns a failed HTTP response into a useful error', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'No access' }), { status: 403 }));

		await expect(callGetUser()).rejects.toMatchObject({ message: 'No access', status: 403 });
	});
});
