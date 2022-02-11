import axios from "axios";
import qs from "qs";
import Amplify, { API, Auth } from "aws-amplify";
import { Signer } from "@aws-amplify/core";

async function signRequest(url, method, body, headers, qp) {
  const urlParams = new URLSearchParams();
  urlParams.set("ids", qp);
  const editedUrl = qp ? url + "?" + urlParams.toString() : url;

  const essentialCredentials = Auth.essentialCredentials(await Auth.currentCredentials());
  const params = {
    method: method,
    url: editedUrl,
    data: JSON.stringify(body),
    headers: headers,
    params: qp,
  };
  const credentials = {
    secret_key: essentialCredentials.secretAccessKey,
    access_key: essentialCredentials.accessKeyId,
    session_token: essentialCredentials.sessionToken,
  };
  const awsDetails = { service: "execute-api", region: "us-east-1" };
  return Signer.sign(params, credentials, awsDetails);
}

export const callGetXalian = (id = "00009-4c1d8607-d3de-4313-91b1-84eecd5ce921") => {
  return callGet("https://api.xalians.com/prod/db/xalian?xalianId=" + id);
};

export const callGetUser = (id) => {
  // return callGet("https://api.xalians.com/prod/db/user?userId=" + encodeURIComponent(id));
  return callGet("https://api.xalians.com/prod/db/user?userId=" + id);
};

export const callGet = (url, params) => {
  return new Promise((resolve) => {
    try {
      signRequest(url, "GET").then((signedRequest) => {
        axios.defaults.withCredentials = true;
        axios
          .get(signedRequest.url, { headers: signedRequest.headers })
          .then((response) => {
            console.log("RESPONSE: " + JSON.stringify(response));
            resolve(response.data);
          })
          .catch((e) => {
            alert("BOOOOO \n\n" + "axios GET ERROR : \n" + JSON.stringify(e, null, 2));
            console.log("axios GET ERROR : " + e);
          });
      });
    } catch (e) {
      console.log("caught ERROR : " + e);
    }
  });
};

export const callGetXalianBatch = (ids) => {
    var qString = '';
  ids.filter((v, i, a) => a.indexOf(v) === i).forEach((id) => {
    qString = qString + id + ",";
  });
  qString = qString.slice(0, qString.length - 1);
  return callGet("https://api.xalians.com/prod/db/xalian?xalianId=" + encodeURIComponent(qString));
};

//   export const callGetUserBatch = (id) => {
//     // return callGet("https://api.xalians.com/prod/db/user?userId=" + encodeURIComponent(id));
//     return callGet("https://api.xalians.com/prod/db/user?userId=" + id);
//   };

export const callGetBatch = (url, ids) => {
  var editedUrl = url + "?xalianId=";
  // ids.
  axios.defaults.withCredentials = true;
  return new Promise((resolve) => {
    try {
      signRequest(editedUrl, "GET").then((signedRequest) => {
        axios
          .get(signedRequest.url, {
            headers: signedRequest.headers,
          })
          .then((response) => {
            console.log("RESPONSE: " + JSON.stringify(response));
            resolve(response.data);
          })
          .catch((e) => {
            alert("BOOOOO \n\n" + "axios GET ERROR : \n" + JSON.stringify(e, null, 2));
            console.log("axios GET ERROR : " + e);
          });
      });
    } catch (e) {
      console.log("caught ERROR : " + e);
    }
  });
};

export const callCreateXalian = (xalian) => {
  return callCreate("https://api.xalians.com/prod/db/xalian", xalian);
};

export const callCreateUser = (user) => {
  return callCreate("https://api.xalians.com/prod/db/user", user);
};

export const callCreate = (url, data) => {
  return new Promise((resolve) => {
    try {
      signRequest(url, "POST", data, { "content-type": "application/json" }).then((signedRequest) => {
        axios.defaults.withCredentials = true;
        axios({
          method: "post",
          url: signedRequest.url,
          headers: signedRequest.headers,
          data: signedRequest.data,
        })
          .then((response) => {
            console.log("RESPONSE: " + JSON.stringify(response));
            resolve(response.data);
          })
          .catch((e) => {
            alert("axios ERROR : " + e);
            console.log("caught ERROR : " + e);
          });
      });
    } catch (e) {
      console.log("caught ERROR : " + e);
    }
  });
};

export const callUpdateUserAddXalian = (userId, xalianId) => {
  const data = {
    userId: userId,
    action: "ADD_XALIAN_ID",
    value: xalianId,
  };

  const url = "https://api.xalians.com/prod/db/user";
  const method = "PATCH";

  return new Promise((resolve) => {
    try {
      signRequest(url, method, data, { "content-type": "application/json" }).then((signedRequest) => {
        axios.defaults.withCredentials = true;
        axios({
          method: method,
          url: signedRequest.url,
          headers: signedRequest.headers,
          data: signedRequest.data,
        })
          .then((response) => {
            console.log("RESPONSE: " + JSON.stringify(response));
            resolve(response.data);
          })
          .catch((e) => {
            alert("axios ERROR : " + e);
            console.log("caught ERROR : " + e);
          });
      });
    } catch (e) {
      console.log("caught ERROR : " + e);
    }
  });
};
