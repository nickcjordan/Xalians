const xalianBuilder = require('./xalianBuilder.js');
const translator = require('./translator.js');

module.exports.handler = async (event) => {
    let xalian = xalianBuilder.buildXalian();
    let translatedXalian = translator.translateCharacterToPresentableType(xalian);
    return {
        statusCode: 200,
        headers: {
            "Content-Type" : "application/json"
        },
        body: JSON.stringify(translatedXalian)
    }
}
