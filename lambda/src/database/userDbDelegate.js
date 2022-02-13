const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = 'XalianUsersTable';

module.exports = {
	getUser: getUser,
	createUser: createUser,
    updateUser: updateUser
};

function getUser(userId, onSuccess, onNotFound, onFail) {
	try {
		console.log('inbound userId=' + userId);
		var params = {
			TableName: TABLE_NAME,
			Key: {
				userId: userId,
			},
		};

		dynamoDb.get(params, function (err, data) {
			if (err) {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				onFail(err);
			} else {
				if (data.Item) {
					console.log(`SUCCESS :: data:\n${JSON.stringify(data.Item.attributes, null, 2)}`);
					var user = {
						userId: data.Item.userId,
						xalianIds: data.Item.xalianIds
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
			Item: builder.bulidXalianUsersTableItem(user),
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

function updateUser(userId, updatedXalianIds, onSuccess, onFail) {
	try {
		var params = {
			TableName: TABLE_NAME,
			Key: {
				userId: userId,
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
