// Structured logging. Every line is a single JSON object with a level and message.
// Callers must never pass the whole event, request headers, or a request/response body
// here; only ids, action names, counts, and error codes belong in `fields`.

export type LogFields = Record<string, unknown>;

function write(level: 'info' | 'error', msg: string, fields?: LogFields): void {
  const line = { level, msg, ...(fields ?? {}) };
  console.log(JSON.stringify(line));
}

export function info(msg: string, fields?: LogFields): void {
  write('info', msg, fields);
}

export function error(msg: string, fields?: LogFields): void {
  write('error', msg, fields);
}
