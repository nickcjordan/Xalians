const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DATABASE_DIR = path.join(__dirname, '..', 'src', 'database');
const HANDLER_PATH = path.join(DATABASE_DIR, 'userTableCRUDLambdas.js');

// Swaps a fake module into require.cache for one dependency of the handler under test,
// so we can exercise the real handler without a live DynamoDB. Small and local enough
// that refactoring the handler to take an injected delegate is not worth it.
function stub(requestPath, fromDir, exportsObj) {
	const resolved = require.resolve(requestPath, { paths: [fromDir] });
	require.cache[resolved] = {
		id: resolved,
		filename: resolved,
		loaded: true,
		exports: exportsObj,
	};
}

function loadHandlerWithStubs(userDelegateOverrides, xalianDelegateOverrides) {
	delete require.cache[HANDLER_PATH];
	stub(
		'./userDbDelegate.js',
		DATABASE_DIR,
		Object.assign(
			{
				getUser: () => assert.fail('getUser should not be called'),
				createUser: () => assert.fail('createUser should not be called'),
				updateUserXalianIds: () => assert.fail('updateUserXalianIds should not be called'),
				updateUserAttributes: () => assert.fail('updateUserAttributes should not be called'),
			},
			userDelegateOverrides
		)
	);
	stub(
		'./xalianDbDelegate.js',
		DATABASE_DIR,
		Object.assign(
			{
				getXalian: () => assert.fail('getXalian should not be called'),
				createXalian: () => assert.fail('createXalian should not be called'),
				getXalianBatch: () => assert.fail('getXalianBatch should not be called'),
			},
			xalianDelegateOverrides
		)
	);
	return require(HANDLER_PATH);
}

function authedEvent(username, overrides) {
	return Object.assign(
		{
			requestContext: { authorizer: { jwt: { claims: { 'cognito:username': username } } } },
		},
		overrides
	);
}

test('retrieveXalianUser calls back exactly once with 401 when there is no subject', () => {
	const handlers = loadHandlerWithStubs({}, {});
	let callCount = 0;
	let result;

	handlers.retrieveXalianUser({ queryStringParameters: null, requestContext: {} }, { awsRequestId: 'req-1' }, (err, response) => {
		callCount += 1;
		result = response;
	});

	assert.equal(callCount, 1);
	assert.equal(result.statusCode, 401);
	assert.equal(JSON.parse(result.body).errorCode, 'UNAUTHORIZED');
});

test('retrieveXalianUser calls back exactly once with the full record for the caller\'s own profile', () => {
	const handlers = loadHandlerWithStubs({
		getUser: (id, onSuccess) => {
			assert.equal(id, 'nick');
			onSuccess({ userId: id, xalianIds: ['a'], attributes: { tokens: 5 } });
		},
	});
	let callCount = 0;
	let result;

	handlers.retrieveXalianUser(
		authedEvent('Nick', { queryStringParameters: null }),
		{ awsRequestId: 'req-2' },
		(err, response) => {
			callCount += 1;
			result = response;
		}
	);

	assert.equal(callCount, 1);
	assert.equal(result.statusCode, 200);
	const body = JSON.parse(result.body);
	assert.equal(body.userId, 'nick');
	assert.ok('attributes' in body);
});

test('retrieveXalianUser calls back exactly once with a public profile for another user', () => {
	const handlers = loadHandlerWithStubs({
		getUser: (id, onSuccess) => {
			assert.equal(id, 'someoneelse');
			onSuccess({ userId: id, xalianIds: ['a', 'b'], attributes: { tokens: 999 } });
		},
	});
	let callCount = 0;
	let result;

	handlers.retrieveXalianUser(
		authedEvent('nick', { queryStringParameters: { userId: 'someoneelse' } }),
		{ awsRequestId: 'req-3' },
		(err, response) => {
			callCount += 1;
			result = response;
		}
	);

	assert.equal(callCount, 1);
	const body = JSON.parse(result.body);
	assert.equal(body.userId, 'someoneelse');
	assert.deepEqual(body.xalianIds, ['a', 'b']);
	assert.equal('attributes' in body, false);
	assert.equal('tokens' in body, false);
});

test('createXalianUser ignores userId in the body and creates the record for the subject', () => {
	const handlers = loadHandlerWithStubs({
		createUser: (user, onSuccess) => {
			assert.equal(user.userId, 'nick');
			assert.deepEqual(user.xalianIds, []);
			onSuccess();
		},
	});
	let callCount = 0;
	let result;

	handlers.createXalianUser(
		authedEvent('nick', { body: JSON.stringify({ userId: 'someone-else', xalianIds: ['x'] }) }),
		{ awsRequestId: 'req-4' },
		(err, response) => {
			callCount += 1;
			result = response;
		}
	);

	assert.equal(callCount, 1);
	assert.equal(result.statusCode, 200);
});

test('updateXalianUser rejects ADD_TOKENS with a single 403 callback and never touches the delegate', () => {
	const handlers = loadHandlerWithStubs({}, {});
	let callCount = 0;
	let result;

	handlers.updateXalianUser(
		authedEvent('nick', { body: JSON.stringify({ action: 'ADD_TOKENS', value: '1000000' }) }),
		{ awsRequestId: 'req-5' },
		(err, response) => {
			callCount += 1;
			result = response;
		}
	);

	assert.equal(callCount, 1);
	assert.equal(result.statusCode, 403);
	assert.equal(JSON.parse(result.body).errorCode, 'FORBIDDEN_ACTION');
});

test('updateXalianUser ignores userId in the body and operates on the subject', () => {
	const handlers = loadHandlerWithStubs({
		getUser: (id, onSuccess) => {
			assert.equal(id, 'nick');
			onSuccess({ userId: id, xalianIds: [], attributes: {} });
		},
		updateUserXalianIds: (id, updatedIds, onSuccess) => {
			assert.equal(id, 'nick');
			assert.deepEqual(updatedIds, ['xal_1']);
			onSuccess();
		},
	});
	let callCount = 0;
	let result;

	handlers.updateXalianUser(
		authedEvent('nick', {
			body: JSON.stringify({ userId: 'someone-else', action: 'ADD_XALIAN_ID', value: 'xal_1' }),
		}),
		{ awsRequestId: 'req-6' },
		(err, response) => {
			callCount += 1;
			result = response;
		}
	);

	assert.equal(callCount, 1);
	assert.equal(result.statusCode, 200);
});
