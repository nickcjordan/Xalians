// const xalianBuilder = require('../xalianBuilder.js');
// const translator = require('../translator.js');

// const AWS = require("aws-sdk");
// AWS.config.setPromisesDependency(require("bluebird"));
// const dynamoDb = new AWS.DynamoDB.DocumentClient();

const delegate = require('./userDbDelegate.js');
const xalianDelegate = require('./xalianDbDelegate.js');
const builder = require('./responseBuilder.js');

module.exports.retrieveXalianUser = (event, context, callback) => {
	try {
		console.log('event :: \n' + JSON.stringify(event, null, 2));
		if (!event.queryStringParameters.userId) {
			callback(null, builder.buildXalianError('BAD_REQUEST', 'No userId found in query string parameters'));
		}
		let userId = event.queryStringParameters.userId.toLowerCase();
		console.log('inbound userId=' + userId);

		delegate.getUser(
			userId,
			function onSuccess(user) {
				if (event.queryStringParameters.populateXalians && event.queryStringParameters.populateXalians === 'true') {
					console.log('populating xalians');
					xalianDelegate.getXalianBatch(
						user.xalianIds,
						function onSuccess(xalians) {
							user.xalians = xalians;
							let response = builder.buildResponse(200, user);
							console.log(`SUCCESS :: returning response:\n${JSON.stringify(response, null, 2)}`);
							callback(undefined, response);
						},
						function onFail(error) {
							console.log(`ERROR :: ${JSON.stringify(error, null, 2)}`);
							callback(builder.buildError(err));
						}
					);
				} else {
					let response = builder.buildResponse(200, user);
					console.log(`SUCCESS :: returning response:\n${JSON.stringify(response, null, 2)}`);
					callback(undefined, response);
				}
			},
			function onNotFound() {
				callback(null, builder.buildXalianError('USER_NOT_FOUND', 'Did not find user with userId=' + userId));
			},
			function onFail(error) {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				callback(builder.buildError(error));
			}
		);
	} catch (e) {
		callback(builder.buildError(e));
	}
};

module.exports.createXalianUser = (event, context, callback) => {
	const user = JSON.parse(event.body);

	console.log(`inbound event: ` + JSON.stringify(event, null, 2));
	console.log(`inbound user: ` + JSON.stringify(user, null, 2));

	try {
		delegate.createUser(
			user,
			function onSuccess() {
				callback(undefined, builder.buildSuccess());
			},
			function onFail(error) {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				callback(builder.buildError(error));
			}
		);
	} catch (e) {
		callback(builder.buildError(e));
	}
};

module.exports.updateXalianUser = (event, context, callback) => {
	const request = JSON.parse(event.body);
	console.log(`action=${request.action} :: userId=${request.userId} :: value=${request.value}`);

	delegate.getUser(
		request.userId,
		function onSuccess(user) {
			var updatedXalianIds = user.xalianIds || [];
			if (request.action === 'REMOVE_XALIAN_ID') {
				const index = updatedXalianIds.indexOf(request.value);
				if (index > -1) {
					updatedXalianIds.splice(index, 1);
				} else {
					callback(null, builder.buildXalianError('XALIAN_NOT_FOUND_IN_USER', 'Did not find xalian with xalianId=' + request.value));
				}
			} else if (request.action === 'ADD_XALIAN_ID') {
				updatedXalianIds.push(request.value);
			} else {
				callback(null, builder.buildXalianError('UNKNOWN_ACTION', 'Update action [' + request.action + '] is not valid'));
			}
			delegate.updateUser(
				request.userId,
				updatedXalianIds,
				function onSuccess() {
					callback(null, builder.buildSuccess());
				},
				function onFail(error) {
					console.log(`ERROR :: ${JSON.stringify(error, null, 2)}`);
					callback(builder.buildError(error));
				}
			);
		},
		function onNotFound() {
			callback(null, builder.buildXalianError('USER_NOT_FOUND', 'Did not find user with userId=' + userId));
		},
		function onFail(error) {
			console.log(`ERROR :: ${JSON.stringify(error, null, 2)}`);
			callback(builder.buildError(error));
		}
	);
};

// module.exports.deleteXalian = (event, context, callback) => {
//   const req = JSON.parse(event.body);
//   const xalianId = req.xalianId;

//   dynamoDb.put(
//     {
//       TableName: TABLE_NAME,
//       Item: req,
//     },
//     function (err, data) {
//       if (err) {
//         console.log('Error', err);
//         callback(null, {
//           statusCode: 500,
//           body: JSON.stringify({
//             message: 'Error occurred: ' + err.message
//           })
//         })
//       } else {
//         console.log('Success', data);
//         callback(null, {
//           statusCode: 200,
//           body: {}
//         })
//       }
//     });
// };

// module.exports.queryXalians = (event, context, callback) => {
//   const req = JSON.parse(event.body);
//   const xalianId = req.xalianId;

//   var params = {
//     ExpressionAttributeValues: {
//       ':s': 2,
//       ':e': 9,
//       ':topic': 'PHRASE'
//      },
//    KeyConditionExpression: 'Season = :s and Episode > :e',
//    FilterExpression: 'contains (Subtitle, :topic)',
//    TableName: 'EPISODES_TABLE'
//   };

//   docClient.query(params, function(err, data) {
//     if (err) {
//       console.log('Error', err);
//     } else {
//       console.log('Success', data.Items);
//     }
//   });
// };
