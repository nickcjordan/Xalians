const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient();
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

		dynamoDb.get(params, function (err, data) {
			if (err) {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				onFail(err);
			} else {
				if (data.Item) {

					console.log(`SUCCESS :: data:\n${JSON.stringify(data.Item, null, 2)}`);
					var user = {
						userId: data.Item.userId,
						xalianIds: data.Item.xalianIds,
						tokens: data.Item.attributes.tokens || 0,
						attributes: data.Item.attributes
					};
					onSuccess(user);
				} else {
					onNotFound();
				}
			}
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

		dynamoDb.put(params, function (err, data) {
			if (err) {
				onFail(err);
			} else {
				onSuccess();
			}
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

		dynamoDb.update(params, function (err, data) {
			if (err) {
				onFail(err);
			} else {
				onSuccess();
			}
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
			UpdateExpression: 'set attributes = :attr',
			ExpressionAttributeValues: {
				':attr': updatedAttributes,
			},
		};

		dynamoDb.update(params, function (err, data) {
			if (err) {
				onFail(err);
			} else {
				onSuccess();
			}
		});
	} catch (e) {
		onFail(e);
	}
}
