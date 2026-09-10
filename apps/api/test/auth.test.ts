import { describe, expect, it } from 'vitest';
import { ApiError, getSubject, requireSubject } from '../src/lib/auth.ts';

describe('getSubject / requireSubject', () => {
  it('getSubject returns null when there is no requestContext', () => {
    expect(getSubject({})).toBe(null);
  });

  it('getSubject returns null when there are no jwt claims', () => {
    expect(getSubject({ requestContext: {} })).toBe(null);
    expect(getSubject({ requestContext: { authorizer: {} } })).toBe(null);
    expect(getSubject({ requestContext: { authorizer: { jwt: {} } } })).toBe(null);
  });

  it('getSubject lowercases cognito:username', () => {
    const event = {
      requestContext: {
        authorizer: { jwt: { claims: { 'cognito:username': 'NickJordan' } } },
      },
    };
    expect(getSubject(event)).toBe('nickjordan');
  });

  it('requireSubject throws ApiError(401, UNAUTHORIZED) when there is no subject', () => {
    try {
      requireSubject({ requestContext: {} });
      expect.unreachable('requireSubject should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).status).toBe(401);
      expect((err as ApiError).code).toBe('UNAUTHORIZED');
    }
  });

  it('requireSubject returns the lowercased subject when present', () => {
    const event = {
      requestContext: {
        authorizer: { jwt: { claims: { 'cognito:username': 'Nick' } } },
      },
    };
    expect(requireSubject(event)).toBe('nick');
  });

  it('getSubject reads payload format 1.0 claims at requestContext.authorizer.claims', () => {
    const event = {
      requestContext: {
        authorizer: { claims: { 'cognito:username': 'King_Kozrak' }, scopes: null },
      },
    };
    expect(getSubject(event)).toBe('king_kozrak');
  });
});
