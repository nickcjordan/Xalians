import axios from 'axios';
import Amplify, { API, Auth } from 'aws-amplify';
import { Signer } from '@aws-amplify/core';
import * as urlLib from 'url';

const API_NAME = 'XalianCRUDAPI';

const buidAWSAuthHeaderString = () => {
    return `AWS4-HMAC-SHA256 
    Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, 
    SignedHeaders=host;range;x-amz-date,
    Signature=fe5f80f77d5fa3beca038a248ff027d0445342fe2855ddc963176630326f1024`;
}

const buildAuthHeaders = () => {
    return {
        
    };
}

async function signRequest(url, method, service, region, body) {
    const essentialCredentials = Auth.essentialCredentials(await Auth.currentCredentials());
   console.log(JSON.stringify(essentialCredentials, null, 2));
   const params = { method: method, url: url, data: JSON.stringify(body)};
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

async function signRequesty(url, method, data) {
    // the urlLib code is adopted from Amplify Rest Client
    const { search, ...parsedUrl } = urlLib.parse(url, true, true);
    let formattedUrl = urlLib.format({
        ...parsedUrl,
        query: { ...parsedUrl.query }
    });

    // set your AWS region and service here
    const serviceInfo = {
        region: 'us-east-1', service: 'execute-api'
    }

    return Auth.currentCredentials()
        .then(credentials => {
            let cred = Auth.essentialCredentials(credentials);

            return Promise.resolve(cred);
        })
        .then(essentialCredentials => {
            let params = {
                headers: { "content-type": "application/json" },
                data: JSON.stringify(data),
                method: method,
                url: formattedUrl
            }

            // cred object keys must stay the same so that 
            // Signer.sign function can access the keys
            let cred = {
                secret_key: essentialCredentials.secretAccessKey,
                access_key: essentialCredentials.accessKeyId,
                session_token: essentialCredentials.sessionToken
            }


            console.log(cred.access_key);
            console.log(cred.secret_key);
            console.log(cred.session_token);

            // Signer.sign takes care of all other steps of Signature V4
            let signedReq = Signer.sign(params, cred, serviceInfo);

            return Promise.resolve(signedReq);
        }).catch(e => {
            console.log('ERROR : ' + e);
        });
}


// async function compute(url, method = "GET") {
//     try {
//         const signedRequest = await signRequest(url, method, "execute-api");
//         const response = await fetch(signedRequest.url, {
//             method,
//             mode: "cors",
//             cache: "no-cache",
//             headers: signedRequest.headers,
//             referrer: "client",
//         });
//         if (response.ok) {
//             return response.json();
//         } else {
//             throw new Error("Failed Request");
//         }
//     } catch (e) {
//         // handle the error
//     }
// }

export const callCreateXalian = (xalian) => {

    const url = "https://api.xalians.com/prod/db/xalian";
    const method = 'POST';
    

    // const url = "https://api.xalians.com/xalian";
    // return new Promise((resolve) => {
    //     axios.get(url)
    //         .then(response => {
    //             resolve(response.data);
    //         });
    // });

    // const url = 'https://fjsgl4n448.execute-api.us-east-1.amazonaws.com/test/debug';
    // const config = { 
    //     url: url,
    //     method: 'post',
    //     headers: buildAuthHeaders(),
    //     data: xalian
    // };

    return new Promise((resolve) => {

        

        // var config = {
        //     method: 'post',
        //     url: 'https://api.xalians.com/db/xalian',
        //     headers: { 
        //       'X-Amz-Content-Sha256': 'beaead3198f7da1e70d03ab969765e0821b24fc913697e929e726aeaebf0eba3', 
        //       'X-Amz-Date': '20220208T174903Z', 
        //       'Authorization': 'AWS4-HMAC-SHA256 Credential=AKIASRIHCQPXW453G5OX/20220208/us-east-1/execute-api/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=0bfd25aac5e4a342011f57df7cf0800c8f17f12482cdb759bf14d2758bff7a74', 
        //       'Content-Type': 'application/json'
        //     },
        //     data : xalian
        //   };
          
        //   axios(config)
        //   .then(function (response) {
        //     console.log(JSON.stringify(response.data));
        //   })
        //   .catch(function (error) {
        //     console.log(error);
        //   });

        try {
            signRequesty(url, method, xalian).then(signedRequest => {
                console.log("signed request:\n" + JSON.stringify(signedRequest, null, 2));

                axios.defaults.withCredentials = true;
                axios({
                    method: 'post',
                    url: signedRequest.url,
                    headers: signedRequest.headers,
                    data: signedRequest.data
                })
                //                 // axios.post(url, { 
                //                 //     method: 'post',
                //                 //     headers: signedRequest.headers,
                //                 //     data: signedRequest.data
                //                 // })
                //                     .then(response => {
                //                         console.log('RESPONSE: ' + JSON.stringify(response));
                //                         resolve(response.data);
                //                     }).catch(e => {
                //                         console.log('axios ERROR : ' + e);
                // axios.post(url, { 
                //     method: 'post',
                //     headers: signedRequest.headers,
                //     data: signedRequest.data
                // })
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


//         signRequest(url, xalian)
//             .then(signedRequest => {
// console.log("signed request:\n" + JSON.stringify(signedRequest, null, 2))
//                 axios.request(signedRequest)
//                 // axios.post(url, { 
//                 //     method: 'post',
//                 //     headers: signedRequest.headers,
//                 //     data: signedRequest.data
//                 // })
//                     .then(response => {
//                         console.log('RESPONSE: ' + JSON.stringify(response));
//                         resolve(response.data);
//                     }).catch(e => {
//                         console.log('axios ERROR : ' + e);
//                     });
                    


//             }).catch(e => {
//                 console.log('signing ERROR : ' + e);
//             });
        
    });

    // return new Promise((resolve) => {
    //     API
    //         .post(API_NAME, '/xalian', config)
    //         .then(response => {
    //             console.log('response-> ' + JSON.stringify(response.data, null, 2));
    //             resolve(response.data);
    //         })
    //         // .catch(error => {
    //         //     console.log(JSON.stringify(error, null, 2));
    //         // });
    // });

    // return API.post(API_NAME, '/xalian', config);

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