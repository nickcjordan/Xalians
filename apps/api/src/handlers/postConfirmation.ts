// Cognito post-confirmation trigger. NOT wired through withApi: this is invoked directly
// by Cognito (see cognito.tf, aws_lambda_function.post_confirmation and
// aws_cognito_user_pool.xalians.lambda_config.post_confirmation), not through API Gateway,
// so there is no ApiEvent to parse and no HTTP response to shape. Cognito ignores the
// return value except that it must resolve with the event for the sign-up flow to
// continue; throwing here blocks the user's confirmation.
//
// Replaces the Amplify-managed function
// apps/web/amplify/backend/function/xalianSignUpSignInResourcePostConfirmation (deleted in
// the same change, see issue #182): adds the new user to the standard group, same as
// that function's add-to-group.js, and additionally lazy-creates the XalianUsersTable
// record (previously only created on first POST /db/user from the frontend) so it exists
// before the user's first page load.
import type { PostConfirmationTriggerEvent } from 'aws-lambda';
import {
  AdminAddUserToGroupCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import * as usersRepo from '../repositories/users.ts';
import * as log from '../lib/log.ts';

const STANDARD_USER_GROUP = 'xalianStandardUserGroup';

const cognito = new CognitoIdentityProviderClient({});

// Both calls are idempotent: AdminAddUserToGroup on a user already in the group is a
// no-op, and createUserIfMissing leaves an existing record untouched (see
// repositories/users.ts). Safe to retry the whole trigger.
export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  const userId = event.userName.toLowerCase();

  await cognito.send(
    new AdminAddUserToGroupCommand({
      UserPoolId: event.userPoolId,
      Username: event.userName,
      GroupName: STANDARD_USER_GROUP,
    })
  );

  await usersRepo.createUserIfMissing(userId);

  log.info('postConfirmation success', { userId, userPoolId: event.userPoolId });

  return event;
};
