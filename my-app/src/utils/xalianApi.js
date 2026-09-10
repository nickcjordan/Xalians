import axios from 'axios';

// Returns the whole { xalian, signature } envelope (apps/api/src/handlers/generateXalian.ts).
// `xalian` is the exact legacy shape this endpoint always returned; `signature` is a
// server HMAC over it that dbApi.callKeepXalian sends back unchanged when the user keeps
// this Xalian, so the server can verify the stats were never edited client-side.
export const callGenerateXalian = () => {

    const url = "https://api.xalians.com/xalian";
    return axios.get(url).then(response => response.data);

}
