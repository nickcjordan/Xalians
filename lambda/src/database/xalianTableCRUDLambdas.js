const delegate = require('./xalianDbDelegate.js');
const builder = require('./responseBuilder.js');

module.exports.createXalian = (event, context, callback) => {
	const xalian = JSON.parse(event.body);
	console.log(`inbound event: ` + JSON.stringify(event, null, 2));
	console.log(`inbound xalian: ` + JSON.stringify(xalian, null, 2));

	try {
		delegate.createXalian(
			xalian,
			function onSuccess() {
				callback(undefined, builder.buildSuccess());
			},
			function onFail(error) {
				console.log(`ERROR :: ${JSON.stringify(error, null, 2)}`);
				callback(builder.buildError(err));
			}
		);
	} catch (e) {
		callback(builder.buildError(e));
	}

};

module.exports.retrieveXalian = (event, context, callback) => {
  if (!event.queryStringParameters.xalianId) {
    callback(null, builder.buildXalianError('BAD_REQUEST', 'No xalianId found in query string parameters'));
  }

	let xalianIds = event.queryStringParameters.xalianId.split(',');

	if (xalianIds.length == 1) {
		let xalianId = xalianIds.pop();

    delegate.getXalian(
			xalianId,
			function onSuccess(xalian) {
				let response = builder.buildResponse(200, xalian);
				console.log(`SUCCESS :: returning response:\n${JSON.stringify(response, null, 2)}`);
				callback(undefined, response);
			},
			function onNotFound() {
				callback(null, builder.buildXalianError('XALIAN_NOT_FOUND', 'Did not find xalian with xaianId=' + xalianId));
			},
			function onFail(error) {
				console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
				callback(builder.buildError(err));
			}
		);

	} else {
		delegate.getXalianBatch(
			xalianIds,
			function onSuccess(xalians) {
				let response = builder.buildResponse(200, xalians);
				console.log(`SUCCESS :: returning response:\n${JSON.stringify(response, null, 2)}`);
				callback(undefined, response);
			},
			function onFail(error) {
				console.log(`ERROR :: ${JSON.stringify(error, null, 2)}`);
				callback(builder.buildError(err));
			}
		);
	}
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

// module.exports.updateXalian = (event, context, callback) => {
//   const req = JSON.parse(event.body);

//   var params = {
//     TableName: TABLE_NAME,
//     Key: {
//       'Season': season,
//       'Episode': episode
//     },
//     UpdateExpression: 'set Title = :t, Subtitle = :s',
//     ExpressionAttributeValues: {
//       ':t': 'NEW_TITLE',
//       ':s': 'NEW_SUBTITLE'
//     }
//   };

//   docClient.update(params, function (err, data) {
//     if (err) {
//       console.log('Error', err);
//     } else {
//       console.log('Success', data);
//     }
//   });
// };
