const xalianBuilder = require('./xalianBuilder.js.js');
const translator = require('./translator.js.js');

const AWS = require('aws-sdk');
AWS.config.setPromisesDependency(require('bluebird'));
const dynamoDb = new AWS.DynamoDB.DocumentClient();

// module.exports.handler = async (event) => {
//     // console.log('Event: ', event);

//     let xalian = xalianBuilder.buildXalian();
//     let translatedXalian = translator.translateCharacterToPresentableType(xalian);
//     return {
//         statusCode: 200,
//         headers: {
//             'Content-Type' : 'application/json',
//             'Access-Control-Allow-Headers' : '*',
//             'Access-Control-Allow-Methods' : '*',
//             'Access-Control-Allow-Credentials' : true,
//             'Access-Control-Allow-Origin' : '*',
//             'X-Requested-With' : '*'
//         },
//         body: JSON.stringify(translatedXalian)
//     }
// }

'use strict';

function buildError(e, status = 500) {
  console.log('Error', err);
  return {
    statusCode: status,
    body: JSON.stringify({
        message: e.code + ': ' + e.message
    }),
  };
}

function buildSuccess(text = 'ok') {
  console.log('Success: ' + text);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: text
    })
  };
}

const TABLE_NAME = 'XalianTable';

module.exports.createXalian = (event, context, callback) => {
  const xalian = JSON.parse(event.body);

  var params = {
    TableName: TABLE_NAME,
    Item: xalian,
  };

  dynamoDb.put(params,
    function (err, data) {
      if (err) {
        callback(buildError(err));
      } else {
        callback(undefined, buildSuccess());
      }
    });
};



module.exports.retrieveXalian = (event, context, callback) => {
  const req = JSON.parse(event.body);


  var params = {
    TableName: TABLE_NAME,
    Key: {'KEY_NAME': VALUE}
   };
   
   dynamoDb.get(params, function(err, data) {
     if (err) {
       console.log("Error", err);
     } else {
       console.log("Success", data.Item);
     }
   });
};

module.exports.deleteXalian = (event, context, callback) => {
  const req = JSON.parse(event.body);
  const xalianId = req.xalianId;

  dynamoDb.put(
    {
      TableName: TABLE_NAME,
      Item: req,
    },
    function (err, data) {
      if (err) {
        console.log('Error', err);
        callback(null, {
          statusCode: 500,
          body: JSON.stringify({
            message: 'Error occurred: ' + err.message
          })
        })
      } else {
        console.log('Success', data);
        callback(null, {
          statusCode: 200,
          body: {}
        })
      }
    });
};


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