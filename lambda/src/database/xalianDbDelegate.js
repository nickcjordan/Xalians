const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
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

		dynamoDb.send(new GetCommand(params))
			.then((data) => {
				if (data.Item) {
					console.log(`SUCCESS :: data:\n${JSON.stringify(data.Item.attributes, null, 2)}`);
					onSuccess(data.Item.attributes);
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

function getXalianBatch(xalianIds, onSuccess, onFail) {
	try {
        var params = builder.buildBatchGetParams(xalianIds);
		console.log(`params: \n${JSON.stringify(params, null, 2)}`);

		dynamoDb.send(new BatchGetCommand(params))
			.then((data) => {
				onSuccess(data.Responses.XalianTable);
			}, (err) => {
				onFail(err);
			});
	} catch (e) {
		onFail(e);
	}
}

function createXalian(xalian, onSuccess, onFail) {
	try {
		var params = {
			TableName: TABLE_NAME,
			Item: builder.buildXalianTableItem(xalian),
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
