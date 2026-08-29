import axios from 'axios';

export const callGenerateXalian = () => {

    const url = "https://api.xalians.com/xalian";
    return axios.get(url).then(response => response.data);

}
