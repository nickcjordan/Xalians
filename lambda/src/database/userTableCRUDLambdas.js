const delegate = require('./userDbDelegate.js');
const xalianDelegate = require('./xalianDbDelegate.js');
const builder = require('./responseBuilder.js');
const log = require('../log.js');
const { ApiError, requireSubject } = require('../auth.js');

function requestId(context, event) {
	return (context && context.awsRequestId) || (event && event.requestContext && event.requestContext.requestId);
}

function respondToError(e, reqId, callback) {
	if (e instanceof ApiError) {
		callback(null, builder.buildXalianError(e.code, e.message, e.status));
	} else {
		callback(null, builder.buildError(e, reqId));
	}
}

function publicProfile(user) {
	return {
		userId: user.userId,
		xalianIds: user.xalianIds,
	};
}

// GET /db/user. Subject comes from the JWT, never from the client. With no userId query
// param the caller gets their own full record; with a userId param that matches the
// subject, same thing; with a userId param for someone else, only the public profile
// (userId + xalianIds, optionally populated xalians) is returned.
module.exports.retrieveXalianUser = (event, context, callback) => {
	const reqId = requestId(context, event);
	try {
		const subject = requireSubject(event);
		const params = event.queryStringParameters || {};
		const requestedUserId = params.userId ? params.userId.toLowerCase() : null;
		const targetUserId = requestedUserId || subject;
		const isOwnProfile = targetUserId === subject;
		const shouldPopulateXalians = params.populateXalians === 'true';

		delegate.getUser(
			targetUserId,
			function onSuccess(user) {
				const respond = (body) => {
					const response = builder.buildResponse(200, body);
					log.info('retrieveXalianUser success', { requestId: reqId, targetUserId, isOwnProfile });
					callback(undefined, response);
				};

				if (shouldPopulateXalians && user.xalianIds && user.xalianIds.length > 0) {
					xalianDelegate.getXalianBatch(
						user.xalianIds,
						function onSuccess(xalians) {
							if (isOwnProfile) {
								user.xalians = xalians;
								respond(user);
							} else {
								const profile = publicProfile(user);
								profile.xalians = xalians;
								respond(profile);
							}
						},
						function onFail(error) {
							respondToError(error, reqId, callback);
						}
					);
				} else {
					respond(isOwnProfile ? user : publicProfile(user));
				}
			},
			function onNotFound() {
				callback(null, builder.buildXalianError('USER_NOT_FOUND', 'Did not find user with userId=' + targetUserId));
			},
			function onFail(error) {
				respondToError(error, reqId, callback);
			}
		);
	} catch (e) {
		respondToError(e, reqId, callback);
	}
};

// POST /db/user. Ignores any userId in the body; the record is always created for the
// subject. Idempotent: an existing record is left untouched (see
// userDbDelegate.createUser's ConditionExpression).
module.exports.createXalianUser = (event, context, callback) => {
	const reqId = requestId(context, event);
	try {
		const subject = requireSubject(event);
		const user = { userId: subject, xalianIds: [] };

		delegate.createUser(
			user,
			function onSuccess() {
				log.info('createXalianUser success', { requestId: reqId, userId: subject });
				callback(undefined, builder.buildSuccess());
			},
			function onFail(error) {
				respondToError(error, reqId, callback);
			}
		);
	} catch (e) {
		respondToError(e, reqId, callback);
	}
};

/*
	Updates the caller's own user record given a hard coded action keyword. The subject
	always comes from the JWT; any userId in the body is ignored.

	ACTIONS:
		ADD_XALIAN_ID
		REMOVE_XALIAN_ID
		REMOVE_TOKENS

	ADD_TOKENS is rejected: token issuance is server-only.
*/
module.exports.updateXalianUser = (event, context, callback) => {
	const reqId = requestId(context, event);
	try {
		const subject = requireSubject(event);
		const request = event.body ? JSON.parse(event.body) : {};
		const userId = subject;

		if (request.action === 'ADD_TOKENS') {
			callback(null, builder.buildXalianError('FORBIDDEN_ACTION', 'Token issuance is server-only', 403));
			return;
		}

		delegate.getUser(
			userId,
			function onSuccess(user) {
				var updatedXalianIds = user.xalianIds || [];
				var attributes = user.attributes || {};
				var existingTokens = attributes.tokens || 0;

				if (request.action === 'REMOVE_XALIAN_ID') {
					const index = updatedXalianIds.indexOf(request.value);
					if (index > -1) {
						updatedXalianIds.splice(index, 1);
						updateUserXalianIds(userId, updatedXalianIds, reqId, callback);
					} else {
						callback(null, builder.buildXalianError('XALIAN_NOT_FOUND_IN_USER', 'Did not find xalian with xalianId=' + request.value));
					}
				} else if (request.action === 'ADD_XALIAN_ID') {
					updatedXalianIds.push(request.value);
					updateUserXalianIds(userId, updatedXalianIds, reqId, callback);
				} else if (request.action === 'REMOVE_TOKENS') {
					let tokensToRemove = parseInt(request.value);
					if (tokensToRemove > existingTokens) {
						callback(null, builder.buildXalianError('INSUFFICIENT_TOKENS', `User tokens [${existingTokens}] was not enough to remove requested [${tokensToRemove}]`));
					} else {
						attributes.tokens = existingTokens - tokensToRemove;
						updateUserAttributes(userId, attributes, reqId, callback);
					}
				} else {
					callback(null, builder.buildXalianError('UNKNOWN_ACTION', 'Update action [' + request.action + '] is not valid'));
				}
			},
			function onNotFound() {
				callback(null, builder.buildXalianError('USER_NOT_FOUND', 'Did not find user with userId=' + userId));
			},
			function onFail(error) {
				respondToError(error, reqId, callback);
			}
		);
	} catch (e) {
		respondToError(e, reqId, callback);
	}
};

function updateUserXalianIds(userId, updatedXalianIds, reqId, callback) {
	delegate.updateUserXalianIds(
		userId,
		updatedXalianIds,
		function onSuccess() {
			log.info('updateXalianUser success', { requestId: reqId, userId, action: 'UPDATE_XALIAN_IDS' });
			callback(null, builder.buildSuccess());
		},
		function onFail(error) {
			respondToError(error, reqId, callback);
		}
	);
}

function updateUserAttributes(userId, updatedAttributes, reqId, callback) {
	delegate.updateUserAttributes(
		userId,
		updatedAttributes,
		function onSuccess() {
			log.info('updateXalianUser success', { requestId: reqId, userId, action: 'UPDATE_ATTRIBUTES' });
			callback(null, builder.buildSuccess());
		},
		function onFail(error) {
			respondToError(error, reqId, callback);
		}
	);
}
