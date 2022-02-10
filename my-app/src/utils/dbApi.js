import axios from 'axios';
import Amplify, { API, Auth } from 'aws-amplify';
import { Signer } from '@aws-amplify/core';
import * as urlLib from 'url';

const API_NAME = 'XalianCRUDAPI';

async function signRequest(url, method, service, region, body, headers) {
    const essentialCredentials = Auth.essentialCredentials(await Auth.currentCredentials());
   console.log(JSON.stringify(essentialCredentials, null, 2));
   const params = { method: method, url: url, data: JSON.stringify(body), headers: headers};
   const credentials = {
       secret_key: essentialCredentials.secretAccessKey,
       access_key: essentialCredentials.accessKeyId,
       session_token: essentialCredentials.sessionToken,
   };
            console.log(credentials.access_key);
            console.log(credentials.secret_key);
            console.log(credentials.session_token);
// set your region and service here
   const serviceInfo = {region, service};
// Signer.sign takes care of all other steps of Signature V4
   return Signer.sign(params, credentials, serviceInfo);
}


export const callCreateUser = (user) => {

    const url = "https://api.xalians.com/prod/db/user";
    const method = 'POST';

    return new Promise((resolve) => {

        try {
            signRequest(url, method, "execute-api", 'us-east-1', user, { "content-type": "application/json" }).then(signedRequest => {

                axios.defaults.withCredentials = true;
                axios({
                    method: 'post',
                    url: signedRequest.url,
                    headers: signedRequest.headers,
                    data: signedRequest.data
                })
                    .then(response => {
                        console.log('RESPONSE: ' + JSON.stringify(response));
                        resolve(response.data);
                    }).catch(e => {
                        console.log('axios ERROR : ' + e);
                    });

            })
            
        } catch (e) {
            console.log('caught ERROR : ' + e);
        }

        
    });

}

export const callGetUser = (id) => {

    const url = "https://api.xalians.com/prod/db/user?userId=" + id;
    const method = 'GET';
    axios.defaults.withCredentials = true;

    return new Promise((resolve) => {

        try {
            signRequest(url, method, "execute-api", 'us-east-1').then(signedRequest => {
                console.log("signed request:\n" + JSON.stringify(signedRequest, null, 2));
                axios.get(signedRequest.url, { 
                    headers: signedRequest.headers
                })
                    .then(response => {
                        console.log('RESPONSE: ' + JSON.stringify(response));
                        resolve(response.data);
                    }).catch(e => {
                        alert('BOOOOO \n\n' + 'axios GET ERROR : \n' + JSON.stringify(e, null, 2));
                        console.log('axios GET ERROR : ' + e);
                    });

            })
            
        } catch (e) {
            console.log('caught ERROR : ' + e);
        }

    });

}

// export const callUpdateUser = (id, val) => {

//     const url = "https://api.xalians.com/prod/db/user?userId=" + id;
//     const method = 'GET';
//     axios.defaults.withCredentials = true;

//     return new Promise((resolve) => {

//         try {
//             signRequest(url, method, "execute-api", 'us-east-1').then(signedRequest => {
//                 console.log("signed request:\n" + JSON.stringify(signedRequest, null, 2));
//                 axios.get(signedRequest.url, { 
//                     headers: signedRequest.headers
//                 })
//                     .then(response => {
//                         console.log('RESPONSE: ' + JSON.stringify(response));
//                         resolve(response.data);
//                     }).catch(e => {
//                         alert('BOOOOO \n\n' + 'axios GET ERROR : \n' + JSON.stringify(e, null, 2));
//                         console.log('axios GET ERROR : ' + e);
//                     });

//             })
            
//         } catch (e) {
//             console.log('caught ERROR : ' + e);
//         }

//     });

// }


export const callCreateXalian = (xalian) => {

    const url = "https://api.xalians.com/prod/db/xalian";
    const method = 'POST';

    return new Promise((resolve) => {

        try {
            signRequest(url, method, "execute-api", 'us-east-1', xalian, { "content-type": "application/json" }).then(signedRequest => {

                axios.defaults.withCredentials = true;
                axios({
                    method: 'post',
                    url: signedRequest.url,
                    headers: signedRequest.headers,
                    data: signedRequest.data
                })
                    .then(response => {
                        console.log('RESPONSE: ' + JSON.stringify(response));
                        resolve(response.data);
                    }).catch(e => {
                        console.log('axios ERROR : ' + e);
                    });

            })
            
        } catch (e) {
            console.log('caught ERROR : ' + e);
        }

        
    });

}

export const callGetXalian = (id = '00009-4c1d8607-d3de-4313-91b1-84eecd5ce921') => {

    const url = "https://api.xalians.com/prod/db/xalian?xalianId=" + id;
    const method = 'GET';
    axios.defaults.withCredentials = true;

    return new Promise((resolve) => {

        try {
            signRequest(url, method, "execute-api", 'us-east-1').then(signedRequest => {
                console.log("signed request:\n" + JSON.stringify(signedRequest, null, 2));
                axios.get(signedRequest.url, { 
                    headers: signedRequest.headers
                })
                    .then(response => {
                        console.log('RESPONSE: ' + JSON.stringify(response));
                        resolve(response.data);
                    }).catch(e => {
                        alert('BOOOOO \n\n' + 'axios GET ERROR : \n' + JSON.stringify(e, null, 2));
                        console.log('axios GET ERROR : ' + e);
                    });

            })
            
        } catch (e) {
            console.log('caught ERROR : ' + e);
        }

    });

}