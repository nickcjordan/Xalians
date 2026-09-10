import type { ApiEvent } from '../src/lib/api.ts';

export function authedEvent(username: string, overrides: Partial<ApiEvent> = {}): ApiEvent {
  return {
    requestContext: { authorizer: { jwt: { claims: { 'cognito:username': username } } } },
    ...overrides,
  };
}

export function fakeContext(requestId = 'req-test'): { awsRequestId: string } {
  return { awsRequestId: requestId };
}
