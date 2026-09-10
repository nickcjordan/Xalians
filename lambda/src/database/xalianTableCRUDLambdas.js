const delegate = require('./xalianDbDelegate.js');
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

// POST /db/xalian. Requires an authenticated caller. The body is still trusted as-is; a
// later PR (Wave D, D1 in docs/design/backend-modernization-plan.md) moves generation
// server-side so a client can no longer post arbitrary stats.
module.exports.createXalian = (event, context, callback) => {
	const reqId = requestId(context, event);
	try {
		requireSubject(event);
		const xalian = JSON.parse(event.body);
		delegate.createXalian(
			xalian,
			function onSuccess() {
				log.info('createXalian success', { requestId: reqId, xalianId: xalian && xalian.xalianId });
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

// GET /db/xalian and GET /db/xalians. Requires an authenticated caller; any authenticated
// caller may read any xalian (collections are viewable by other users, e.g. from
// userDetailsPage).
module.exports.retrieveXalian = (event, context, callback) => {
	const reqId = requestId(context, event);
	try {
		requireSubject(event);
	} catch (e) {
		respondToError(e, reqId, callback);
		return;
	}

	if (!event.queryStringParameters || !event.queryStringParameters.xalianId) {
		callback(null, builder.buildXalianError('BAD_REQUEST', 'No xalianId found in query string parameters'));
		return;
	}

	let xalianIds = event.queryStringParameters.xalianId.split(',');

	if (xalianIds.length == 1) {
		let xalianId = xalianIds.pop();

		delegate.getXalian(
			xalianId,
			function onSuccess(xalian) {
				let response = builder.buildResponse(200, xalian);
				log.info('retrieveXalian success', { requestId: reqId, xalianId });
				callback(undefined, response);
			},
			function onNotFound() {
				callback(null, builder.buildXalianError('XALIAN_NOT_FOUND', 'Did not find xalian with xaianId=' + xalianId));
			},
			function onFail(error) {
				respondToError(error, reqId, callback);
			}
		);
	} else {
		delegate.getXalianBatch(
			xalianIds,
			function onSuccess(xalians) {
				// return bare xalians like the single-id path does, not raw table items
				let unwrapped = xalians.map((x) => (x && x.attributes ? x.attributes : x));
				let response = builder.buildResponse(200, unwrapped);
				log.info('retrieveXalian batch success', { requestId: reqId, count: unwrapped.length });
				callback(undefined, response);
			},
			function onFail(error) {
				respondToError(error, reqId, callback);
			}
		);
	}
};

// GET /db/xalians is wired to this handler in main.tf; it accepts the same
// comma-separated xalianId query param as retrieveXalian
module.exports.retrieveXalianBatch = module.exports.retrieveXalian;
