// const xalianBuilder = require('../xalianBuilder.js');
// const translator = require('../translator.js');

const AWS = require("aws-sdk");
AWS.config.setPromisesDependency(require("bluebird"));
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

("use strict");

function buildXalianError(errorCode, errorMessage, status = 400) {
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      errorMessage: errorMessage,
      errorCode: errorCode,
    }),
  };
}

function buildError(e, status = 500) {
  console.error("Error JSON: ", JSON.stringify(e, null, 2));
  // console.log('Error', err);
  return {
    statusCode: status,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(e),
  };
}

function buildSuccess(text = "ok") {
  console.log("Success: " + text);
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: text,
    }),
  };
}

function buildResponse(status, body) {
  return {
    statusCode: status,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    // body: body
  };
}

const TABLE_NAME = "XalianUsersTable";

module.exports.createXalianUser = (event, context, callback) => {
  const user = JSON.parse(event.body);
  console.log(`inbound event: ` + JSON.stringify(event, null, 2));
  console.log(`inbound user: ` + JSON.stringify(user, null, 2));

  var params = {
    TableName: TABLE_NAME,
    Item: bulidXalianUsersTableItem(user),
  };

  dynamoDb.put(params, function (err, data) {
    if (err) {
      callback(buildError(err));
    } else {
      callback(undefined, buildSuccess());
    }
  });
};

function bulidXalianUsersTableItem(user) {
  return {
    userId: user.userId.toLowerCase(),
    attributes: user,
  };
}

module.exports.retrieveXalianUser = (event, context, callback) => {
  // let xalianId = JSON.parse(event.body).xalianId;
  try {
    let userId = event.queryStringParameters.userId.toLowerCase();
    console.log("inbound userId=" + userId);
    var params = {
      TableName: TABLE_NAME,
      Key: {
        userId: userId,
      },
    };

    dynamoDb.get(params, function (err, data) {
      if (err) {
        console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
        callback(buildError(err));
      } else {
        if (data.Item) {
          console.log(`SUCCESS :: data:\n${JSON.stringify(data.Item.attributes, null, 2)}`);
          // let response = buildResponse(200, data.Item.attributes);
          let response = buildResponse(200, data.Item);
          console.log(`SUCCESS :: returning response:\n${JSON.stringify(response, null, 2)}`);
          callback(undefined, response);
        } else {
          callback(null, buildXalianError("USER_NOT_FOUND", "Did not find user with userId=" + userId));
        }
      }
    });
  } catch (e) {
    callback(buildError(e));
  }
};

module.exports.updateXalianUser = (event, context, callback) => {
  const request = JSON.parse(event.body);
  console.log(`action=${request.action} :: userId=${request.userId} :: value=${request.value}`);

  dynamoDb.get(
    {
      TableName: TABLE_NAME,
      Key: {
        userId: request.userId.toLowerCase(),
      },
    },
    function (err, data) {
      if (err) {
        console.log(`ERROR :: ${JSON.stringify(err, null, 2)}`);
        callback(buildError(err));
      } else {
        if (data.Item) {
          var updatedXalianIds = data.Item.xalianIds || [];
          if (request.action === "REMOVE_XALIAN_ID") {
            if (updatedXalianIds.includes(request.value)) {
              const index = updatedXalianIds.indexOf(request.value);
              if (index > -1) {
                updatedXalianIds.splice(index, 1); // 2nd parameter means remove one item only
              }
            }
          } else if (request.action === "ADD_XALIAN_ID") {
            updatedXalianIds.push(request.value);
          } else {
            callback(null, buildXalianError("UNKNOWN_ACTION", "Update action [" + request.action + "] is not valid"));
          }

          // do update
          var params = {
            TableName: TABLE_NAME,
            Key: {
              userId: request.userId,
            },
            UpdateExpression: "set xalianIds = :ids",
            ExpressionAttributeValues: {
              ":ids": updatedXalianIds,
            },
          };

          dynamoDb.update(params, function (err, data) {
            if (err) {
              console.log("Error", err);
              callback(buildError(e));
            } else {
              console.log("Success", data);
              callback(undefined, buildSuccess());
            }
          });
        } else {
          callback(null, buildXalianError("USER_NOT_FOUND", "Did not find user with userId=" + userId));
        }
      }
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
