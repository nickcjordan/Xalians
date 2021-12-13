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
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: responseMessage,
        }),
    }
}
