const test = require('node:test');
const assert = require('node:assert/strict');
const builder = require('../src/database/responseBuilder.js');

test('buildError never includes the thrown error fields', () => {
	const sensitiveError = new Error('DynamoDB table XalianUsersTable not found');
	sensitiveError.tableName = 'XalianUsersTable';
	sensitiveError.$metadata = { requestId: 'internal-aws-request-id' };

	const response = builder.buildError(sensitiveError, 'req-99');

	assert.equal(response.statusCode, 500);
	const body = JSON.parse(response.body);
	assert.deepEqual(Object.keys(body).sort(), ['errorCode', 'errorMessage', 'requestId']);
	assert.equal(body.errorCode, 'INTERNAL_ERROR');
	assert.equal(body.errorMessage, 'Unexpected error');
	assert.equal(body.requestId, 'req-99');

	// the raw error's message/table name/metadata must never leak into the body
	assert.ok(!response.body.includes('XalianUsersTable'));
	assert.ok(!response.body.includes('DynamoDB'));
	assert.ok(!response.body.includes('internal-aws-request-id'));
});

test('buildXalianError returns the given code and message (used for 4xx, not buildError)', () => {
	const response = builder.buildXalianError('USER_NOT_FOUND', 'Did not find user with userId=nick', 404);
	assert.equal(response.statusCode, 404);
	const body = JSON.parse(response.body);
	assert.equal(body.errorCode, 'USER_NOT_FOUND');
	assert.equal(body.errorMessage, 'Did not find user with userId=nick');
});
