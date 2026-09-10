import { beforeEach, describe, expect, it } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import { handler } from '../../src/handlers/postConfirmation.ts';

const ddbMock = mockClient(DynamoDBDocumentClient);
const cognitoMock = mockClient(CognitoIdentityProviderClient);

function fakeEvent(userName: string): PostConfirmationTriggerEvent {
  return {
    version: '1',
    region: 'us-east-1',
    userPoolId: 'us-east-1_dDy7NYWbz',
    userName,
    callerContext: { awsSdkVersion: 'aws-sdk-unknown', clientId: 'test-client' },
    triggerSource: 'PostConfirmation_ConfirmSignUp',
    request: {
      userAttributes: { sub: userName, email: `${userName}@example.com` },
    },
    response: {},
  } as unknown as PostConfirmationTriggerEvent;
}

beforeEach(() => {
  ddbMock.reset();
  cognitoMock.reset();
});

describe('postConfirmation handler', () => {
  it('adds the user to the standard group and lazy-creates the user record', async () => {
    ddbMock.on(PutCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

    const event = fakeEvent('Nick');
    const result = await handler(event);

    expect(result).toBe(event);

    const groupCalls = cognitoMock.commandCalls(AdminAddUserToGroupCommand);
    expect(groupCalls).toHaveLength(1);
    expect(groupCalls[0].args[0].input).toMatchObject({
      UserPoolId: 'us-east-1_dDy7NYWbz',
      Username: 'Nick',
      GroupName: 'xalianStandardUserGroup',
    });

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].args[0].input.Item).toMatchObject({ userId: 'nick', xalianIds: [] });
  });

  it('is idempotent: an existing user record is left untouched', async () => {
    const err = Object.assign(new Error('conditional check failed'), { name: 'ConditionalCheckFailedException' });
    ddbMock.on(PutCommand).rejects(err);
    cognitoMock.on(AdminAddUserToGroupCommand).resolves({});

    const result = await handler(fakeEvent('nick'));
    expect(result.userName).toBe('nick');
  });

  it('propagates a Cognito failure so confirmation is blocked', async () => {
    ddbMock.on(PutCommand).resolves({});
    cognitoMock.on(AdminAddUserToGroupCommand).rejects(new Error('boom'));

    await expect(handler(fakeEvent('nick'))).rejects.toThrow('boom');
  });
});
