// withApi is the one place every handler's plumbing lives: parse and validate the
// request, derive the subject, call the route function, serialize the result, map thrown
// errors to a response, and log exactly one structured line per request. Handlers never
// build a response object or touch event.body themselves.
import type { ZodType } from 'zod';
import { ApiError, getSubject, requireSubject } from './auth.ts';
import * as log from './log.ts';

export { ApiError };

// Only the field every Lambda invocation context carries that this file actually reads.
// Using the full aws-lambda Context type here would force every test (and the standalone
// bundle-smoke-test invocation in the verification steps) to fabricate a dozen unused
// fields.
export type ApiContext = { awsRequestId: string };

// A concrete response shape rather than the aws-lambda APIGatewayProxyResultV2 union
// (which also allows a bare string): every route through withApi returns the same three
// fields, so callers and tests can rely on that without narrowing a union first.
export type ApiResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
};

// Loose event type: this file only reads the handful of fields every payload format
// shares (body, queryStringParameters, requestContext.http, routeKey) plus whatever
// auth.ts needs, so it does not depend on the exact JWT-authorizer event type.
export type ApiEvent = {
  body?: string | null;
  queryStringParameters?: Record<string, string | undefined> | null;
  pathParameters?: Record<string, string | undefined> | null;
  routeKey?: string;
  rawPath?: string;
  requestContext?: {
    http?: { method?: string };
    authorizer?: {
      jwt?: { claims?: Record<string, unknown> };
      claims?: Record<string, unknown>;
    };
  };
};

export type HandlerArgs<TBody, TQuery, TParams> = {
  subject: string | null;
  body: TBody;
  query: TQuery;
  params: TParams;
  event: ApiEvent;
  requestId: string;
};

export type HandlerResult = { status: number; body: unknown };

export type WithApiOptions<TBody, TQuery, TParams> = {
  auth: 'jwt' | 'none';
  body?: ZodType<TBody>;
  query?: ZodType<TQuery>;
  params?: ZodType<TParams>;
};

function zodIssueMessage(issue: { path: PropertyKey[]; message: string }): string {
  const path = issue.path.length > 0 ? issue.path.join('.') : '(body)';
  return `${path}: ${issue.message}`;
}

export function withApi<TBody = undefined, TQuery = undefined, TParams = undefined>(
  fn: (args: HandlerArgs<TBody, TQuery, TParams>) => Promise<HandlerResult>,
  opts: WithApiOptions<TBody, TQuery, TParams>
) {
  return async (event: ApiEvent, context: ApiContext): Promise<ApiResult> => {
    const requestId = context?.awsRequestId ?? 'unknown';
    const start = Date.now();
    const route = event.routeKey ?? `${event.requestContext?.http?.method ?? 'UNKNOWN'} ${event.rawPath ?? ''}`;
    let status = 500;
    let subjectForLog: string | null = null;

    try {
      const subject = opts.auth === 'jwt' ? requireSubject(event) : getSubject(event);
      subjectForLog = subject;

      let body = undefined as TBody;
      if (opts.body) {
        let raw: unknown = {};
        if (event.body) {
          try {
            raw = JSON.parse(event.body);
          } catch {
            throw new ApiError(400, 'BAD_REQUEST', 'Request body is not valid JSON');
          }
        }
        const parsed = opts.body.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(400, 'BAD_REQUEST', zodIssueMessage(parsed.error.issues[0]));
        }
        body = parsed.data;
      }

      let query = undefined as TQuery;
      if (opts.query) {
        const parsed = opts.query.safeParse(event.queryStringParameters ?? {});
        if (!parsed.success) {
          throw new ApiError(400, 'BAD_REQUEST', zodIssueMessage(parsed.error.issues[0]));
        }
        query = parsed.data;
      }

      let params = undefined as TParams;
      if (opts.params) {
        const parsed = opts.params.safeParse(event.pathParameters ?? {});
        if (!parsed.success) {
          throw new ApiError(400, 'BAD_REQUEST', zodIssueMessage(parsed.error.issues[0]));
        }
        params = parsed.data;
      }

      const result = await fn({ subject, body, query, params, event, requestId });
      status = result.status;
      return {
        statusCode: result.status,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(result.body),
      };
    } catch (err) {
      if (err instanceof ApiError) {
        status = err.status;
        return {
          statusCode: err.status,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ errorCode: err.code, errorMessage: err.message }),
        };
      }

      status = 500;
      // The real error is logged server-side only; the client gets a fixed shape plus a
      // request id to correlate. Never serialize the caught error into the response body,
      // that would leak DynamoDB error names, table names, and internal request ids.
      log.error('Unhandled error', {
        requestId,
        errorName: err instanceof Error ? err.name : typeof err,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      return {
        statusCode: 500,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ errorCode: 'INTERNAL_ERROR', errorMessage: 'Unexpected error', requestId }),
      };
    } finally {
      log.info('request', { route, status, durationMs: Date.now() - start, requestId, subject: subjectForLog });
    }
  };
}
