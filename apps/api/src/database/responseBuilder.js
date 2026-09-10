const log = require('../log.js');

module.exports = {
	buildXalianError: buildXalianError,
	buildError: buildError,
	buildSuccess: buildSuccess,
	buildResponse: buildResponse,
	buildXalianUsersTableItem: buildXalianUsersTableItem,
	buildXalianTableItem: buildXalianTableItem,
	buildBatchGetParams: buildBatchGetParams,
};

function buildXalianError(errorCode, errorMessage, status = 400) {
	return {
		statusCode: status,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			errorMessage: errorMessage,
			errorCode: errorCode,
		}),
	};
}

// Never serializes the caught error into the response body: that would leak DynamoDB
// error names, table names, and internal request ids to the client. The real error is
// logged server-side only; the client gets a fixed shape plus a request id to correlate.
function buildError(e, requestId) {
	log.error('Unhandled error', {
		requestId: requestId,
		errorName: e && e.name,
		errorMessage: e && e.message,
	});
	return {
		statusCode: 500,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({
			errorCode: 'INTERNAL_ERROR',
			errorMessage: 'Unexpected error',
			requestId: requestId,
		}),
	};
}

function buildSuccess(text = 'ok') {
	return {
		statusCode: 200,
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify({
			message: text,
		}),
	};
}

function buildResponse(status, body) {
	return {
		statusCode: status,
		headers: {
			'content-type': 'application/json',
		},
		body: JSON.stringify(body),
	};
}

function buildXalianUsersTableItem(user) {
	return {
		userId: user.userId.toLowerCase(),
		xalianIds: user.xalianIds,
		attributes: user,
	};
}

function buildXalianTableItem(xalian) {
	return {
		speciesId: xalian.speciesId,
		xalianId: xalian.xalianId,
		attributes: xalian,
	};
}

function buildBatchGetParams(ids) {
	var keys = [];
	ids.forEach((id) => {
		let extractedSpeciesId = id.split('-')[0];
		keys.push({ xalianId: id, speciesId: extractedSpeciesId });
	});
	return {
		RequestItems: {
			XalianTable: {
				Keys: keys,
			},
		},
	};
}
