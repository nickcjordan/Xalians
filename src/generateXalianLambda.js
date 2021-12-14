const xalianBuilder = require('./xalianBuilder.js');
const translator = require('./translator.js');

module.exports.handler = async (event) => {
    // console.log('Event: ', event);

    let xalian = xalianBuilder.buildXalian();
    let translatedXalian = translator.translateCharacterToPresentableType(xalian);
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
        body: JSON.stringify(translatedXalian)
    }
}
