// Derives the caller's identity from the Cognito JWT authorizer context. Never trust a
// client-supplied userId; this is the only source of truth for "who is calling."

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

// Loosely typed on purpose: the HTTP API integration is payload format 2.0
// (APIGatewayProxyEventV2WithJWTAuthorizer puts claims at
// requestContext.authorizer.jwt.claims), but payload format 1.0 puts them one level
// shallower at requestContext.authorizer.claims. Neither the 1.0 nor 2.0 typings share a
// common shape for `authorizer`, so this accepts anything event-shaped and reads both
// paths defensively rather than trusting a single generated type. A valid token produced
// this handler's own 401 on 2026-09-10 for exactly this reason; read both so a format
// change cannot lock every caller out again.
type AuthorizerClaimsEvent = {
  requestContext?: {
    authorizer?: {
      jwt?: { claims?: Record<string, unknown> };
      claims?: Record<string, unknown>;
    };
  };
};

// Existing user records are keyed by lowercased Cognito username (see
// repositories/users.ts), so lowercasing here maps onto them with no migration needed.
export function getSubject(event: AuthorizerClaimsEvent): string | null {
  const authorizer = event?.requestContext?.authorizer;
  const claims = authorizer?.jwt?.claims ?? authorizer?.claims;
  const username = claims?.['cognito:username'];
  return username ? String(username).toLowerCase() : null;
}

export function requireSubject(event: AuthorizerClaimsEvent): string {
  const subject = getSubject(event);
  if (!subject) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Missing or invalid authorization token');
  }
  return subject;
}
