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

function buildError(e, status = 500) {
	console.error('Error JSON: ', JSON.stringify(e, null, 2));
	// console.log('Error', err);
	return {
		statusCode: status,
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(e),
	};
}

function buildSuccess(text = 'ok') {
	console.log('Success: ' + text);
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
		// body: body
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
};
