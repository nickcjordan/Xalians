const xalianBuilder = require('./xalianBuilder.js');

module.exports.handler = async (event) => {
    console.log('Event: ', event);

    // if (event.queryStringParameters && event.queryStringParameters['Name']) {
    //   responseMessage = 'Helloo, new ' + event.queryStringParameters['Name'] + '!';
    // }

    var responseMessage = xalianBuilder.buildXalian();
    // let responseMessage = 'Helloo, World!';

    return {
        statusCode: 200,
        headers: {
            "Content-Type" : "application/json",
            "Access-Control-Allow-Headers" : "*",
            "Access-Control-Allow-Methods" : "*",
            "Access-Control-Allow-Credentials" : true,
            "Access-Control-Allow-Origin" : "*",
            "X-Requested-With" : "*"
        },
        body: JSON.stringify({
            message: responseMessage,
        }),
    }
}
