// Derives the caller's identity from the Cognito JWT authorizer context. Never trust a
// client-supplied userId; this is the only source of truth for "who is calling."

class ApiError extends Error {
	constructor(status, code, message) {
		super(message);
		this.name = 'ApiError';
		this.status = status;
		this.code = code;
	}
}

// Existing user records are keyed by lowercased Cognito username (see
// responseBuilder.buildXalianUsersTableItem), so lowercasing here maps onto them with no
// migration needed.
function getSubject(event) {
	const claims =
		event &&
		event.requestContext &&
		event.requestContext.authorizer &&
		event.requestContext.authorizer.jwt &&
		event.requestContext.authorizer.jwt.claims;

	const username = claims && claims['cognito:username'];
	return username ? String(username).toLowerCase() : null;
}

function requireSubject(event) {
	const subject = getSubject(event);
	if (!subject) {
		throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid authorization token');
	}
	return subject;
}

module.exports = {
	ApiError: ApiError,
	getSubject: getSubject,
	requireSubject: requireSubject,
};
