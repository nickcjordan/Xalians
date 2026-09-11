import { beforeEach, describe, expect, it, vi } from 'vitest';
import sampleGraviclaw from '../../../../../docs/design/sample-record-graviclaw.json';

const getIdToken = vi.hoisted(() => vi.fn());
vi.mock('../authUtil', () => ({ getIdToken }));

import { callCreateUser, callGetUser, callShowroomXalian } from '../dbApi';

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

	it('turns a failed HTTP response into a useful error', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ message: 'No access' }), { status: 403 }));

		await expect(callGetUser()).rejects.toMatchObject({ message: 'No access', status: 403 });
	});
});
