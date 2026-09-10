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
	// The HTTP API integrations use Lambda payload format 1.0, which puts JWT claims at
	// requestContext.authorizer.claims. Payload format 2.0 nests them one level deeper at
	// requestContext.authorizer.jwt.claims. Read both so a format change cannot lock every
	// caller out (a valid token produced this handler's own 401 on 2026-09-10 for exactly
	// that reason).
	const authorizer = event && event.requestContext && event.requestContext.authorizer;
	const claims = authorizer && ((authorizer.jwt && authorizer.jwt.claims) || authorizer.claims);

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
