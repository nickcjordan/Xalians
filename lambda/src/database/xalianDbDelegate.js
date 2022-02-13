const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient();
const builder = require('./responseBuilder.js');

const TABLE_NAME = 'XalianTable';

module.exports = {
	getXalian: getXalian,
	createXalian: createXalian,
    getXalianBatch: getXalianBatch
};

function getXalian(xalianId, onSuccess, onNotFound, onFail) {
	try {
        let speciesId = xalianId.split('-')[0];
		var params = {
			TableName: TABLE_NAME,
			Key: {
				speciesId: speciesId,
				xalianId: xalianId,
			},
		};

		dynamoDb.get(params, function (err, data) {
			if (err) {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				onFail(err);
			} else {
				if (data.Item) {
					console.log(`SUCCESS :: data:\n${JSON.stringify(data.Item.attributes, null, 2)}`);
					onSuccess(data.Item.attributes);
				} else {
					onNotFound();
				}
			}
		});
	} catch (e) {
		onFail(e);
	}
}

function getXalianBatch(xalianIds, onSuccess, onFail) {
	try {
        var params = builder.buildBatchGetParams(xalianIds);
		console.log(`params: \n${JSON.stringify(params, null, 2)}`);

		dynamoDb.batchGet(params, function (err, data) {
			if (err) {
				onFail(err);
			} else {
				onSuccess(data.Responses.XalianTable);
			}
		});
	} catch (e) {
		onFail(e);
	}
}

function createXalian(xalian, onSuccess, onFail) {
	try {
		var params = {
			TableName: TABLE_NAME,
			Item: builder.bulidXalianTableItem(xalian),
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

// function updateXalian(userId, updatedXalianIds, onSuccess, onFail) {
// 	try {
// 		var params = {
// 			TableName: TABLE_NAME,
// 			Key: {
// 				userId: userId,
// 			},
// 			UpdateExpression: 'set xalianIds = :ids',
// 			ExpressionAttributeValues: {
// 				':ids': updatedXalianIds,
// 			},
// 		};

// 		dynamoDb.update(params, function (err, data) {
// 			if (err) {
// 				onFail(err);
// 			} else {
// 				onSuccess();
// 			}
// 		});
// 	} catch (e) {
// 		onFail(e);
// 	}
// }
