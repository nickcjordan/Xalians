const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const builder = require('./responseBuilder.js');

const TABLE_NAME = 'XalianUsersTable';

module.exports = {
	getUser: getUser,
	createUser: createUser,
    updateUserXalianIds: updateUserXalianIds,
	updateUserAttributes: updateUserAttributes
};

function getUser(id, onSuccess, onNotFound, onFail) {
	try {
		console.log('inbound userId=' + id);
		var params = {
			TableName: TABLE_NAME,
			Key: {
				userId: id
			},
		};

		dynamoDb.send(new GetCommand(params))
			.then((data) => {
				if (data.Item) {

					console.log(`SUCCESS :: data:\n${JSON.stringify(data.Item, null, 2)}`);
					var attributes = data.Item.attributes || {};
					var user = {
						userId: data.Item.userId,
						xalianIds: data.Item.xalianIds,
						tokens: attributes.tokens || 0,
						attributes: attributes
					};
					onSuccess(user);
				} else {
					onNotFound();
				}
			}, (err) => {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				onFail(err);
			});
	} catch (e) {
		onFail(e);
	}
}

function createUser(user, onSuccess, onFail) {
	try {
		var params = {
			TableName: TABLE_NAME,
			Item: builder.buildXalianUsersTableItem(user)
		};

		dynamoDb.send(new PutCommand(params))
			.then(() => {
				onSuccess();
			}, (err) => {
				onFail(err);
			});
	} catch (e) {
		onFail(e);
	}
}

function updateUserXalianIds(id, updatedXalianIds, onSuccess, onFail) {
	try {
		var params = {
			TableName: TABLE_NAME,
			Key: {
				userId: id
			},
			UpdateExpression: 'set xalianIds = :ids',
			ExpressionAttributeValues: {
				':ids': updatedXalianIds,
			},
		};

		dynamoDb.send(new UpdateCommand(params))
			.then(() => {
				onSuccess();
			}, (err) => {
				onFail(err);
			});
	} catch (e) {
		onFail(e);
	}
}

function updateUserAttributes(id, updatedAttributes, onSuccess, onFail) {
	try {
		var params = {
			TableName: TABLE_NAME,
			Key: {
				userId: id
			},
			// 'attributes' is a DynamoDB reserved word, so it needs an expression attribute name
			UpdateExpression: 'set #attrs = :attr',
			ExpressionAttributeNames: {
				'#attrs': 'attributes',
			},
			ExpressionAttributeValues: {
				':attr': updatedAttributes,
			},
		};

		dynamoDb.send(new UpdateCommand(params))
			.then(() => {
				onSuccess();
			}, (err) => {
				onFail(err);
			});
	} catch (e) {
		onFail(e);
	}
}
