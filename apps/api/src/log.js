// Structured logging. Every line is a single JSON object with a level and message.
// Callers must never pass the whole event, request headers, or a request/response body
// here; only ids, action names, counts, and error codes belong in `fields`.

function write(level, msg, fields) {
	const line = Object.assign({ level: level, msg: msg }, fields || {});
	console.log(JSON.stringify(line));
}

function info(msg, fields) {
	write('info', msg, fields);
}

function error(msg, fields) {
	write('error', msg, fields);
}

module.exports = {
	info: info,
	error: error,
};
