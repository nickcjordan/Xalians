// Post-confirmation trigger: put every confirmed user into the standard group.
// Uses AWS SDK v3, which the nodejs22.x runtime provides; nothing is bundled.
const {
  CognitoIdentityProviderClient,
  AdminAddUserToGroupCommand,
} = require('@aws-sdk/client-cognito-identity-provider');

const client = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  await client.send(
    new AdminAddUserToGroupCommand({
      GroupName: 'xalianStandardUserGroup',
      UserPoolId: event.userPoolId,
      Username: event.userName,
    })
  );
  return event;
};
