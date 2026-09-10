const test = require('node:test');
const assert = require('node:assert/strict');
const { getSubject, requireSubject, ApiError } = require('../src/auth.js');

test('getSubject returns null when there is no requestContext', () => {
	assert.equal(getSubject({}), null);
});

test('getSubject returns null when there are no jwt claims', () => {
	assert.equal(getSubject({ requestContext: {} }), null);
	assert.equal(getSubject({ requestContext: { authorizer: {} } }), null);
	assert.equal(getSubject({ requestContext: { authorizer: { jwt: {} } } }), null);
});

test('getSubject lowercases cognito:username', () => {
	const event = {
		requestContext: {
			authorizer: { jwt: { claims: { 'cognito:username': 'NickJordan' } } },
		},
	};
	assert.equal(getSubject(event), 'nickjordan');
});

test('requireSubject throws ApiError(401, UNAUTHORIZED) when there is no subject', () => {
	assert.throws(
		() => requireSubject({ requestContext: {} }),
		(err) => {
			assert.ok(err instanceof ApiError);
			assert.equal(err.status, 401);
			assert.equal(err.code, 'UNAUTHORIZED');
			return true;
		}
	);
});

test('requireSubject returns the lowercased subject when present', () => {
	const event = {
		requestContext: {
			authorizer: { jwt: { claims: { 'cognito:username': 'Nick' } } },
		},
	};
	assert.equal(requireSubject(event), 'nick');
});
