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

export const callGetUser = (id, populateXalians = false) => {
  // return callGet("https://api.xalians.com/prod/db/user?userId=" + encodeURIComponent(id));
  if (populateXalians) {
    return callGet("https://api.xalians.com/prod/db/user?userId=" + id + "&populateXalians=true");
  } else {
    return callGet("https://api.xalians.com/prod/db/user?userId=" + id);
  }
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
            alert("BOOOOO in get \n\n" + "axios GET ERROR : \n" + JSON.stringify(e, null, 2));
            console.log("axios GET ERROR : " + e);
          });
      });
    } catch (e) {
      console.log("caught ERROR : " + e);
    }
  });
};

export const callGetXalianBatch = (ids) => {

  if (process.env.REACT_APP_USE_CACHE === 'true') {
		return new Promise((resolve) => {
			let mockXalians = JSON.parse(`[{"speciesId":"00006","xalianId":"00006-75186702-4de0-4aac-832a-f718ec01da71","attributes":{"xalianId":"00006-75186702-4de0-4aac-832a-f718ec01da71","species":{"generation":"0","planet":"Poseidas","name":"Newtapede","description":"A 16 legged amphibious creature with a long, segmented body. While adapted to land, its slender frame and webbed feet make it a formidable opponent in water.","weight":"238 lbs / 108 kg","id":"00006","height":"91 in / 231 cm"},"healthPoints":999,"stats":{"evasionPoints":{"name":"evasionPoints","range":"low","points":210,"percentage":84},"standardAttackPoints":{"name":"standardAttackPoints","range":"medium","points":457,"percentage":91},"standardDefensePoints":{"name":"standardDefensePoints","range":"low","points":272,"percentage":108},"staminaPoints":{"name":"staminaPoints","range":"low","points":269,"percentage":107},"specialDefensePoints":{"name":"specialDefensePoints","range":"low","points":300,"percentage":120},"recoveryPoints":{"name":"recoveryPoints","range":"high","points":814,"percentage":108},"specialAttackPoints":{"name":"specialAttackPoints","range":"medium","points":594,"percentage":118},"speedPoints":{"name":"speedPoints","range":"medium","points":551,"percentage":110}},"moves":[{"name":"Prompt Shadey Thrust","rating":8,"description":"Dark-typed quick, willing and ready application of force to propel something","cost":10,"type":"Dark","element":"Shadey"},{"name":"Evil Stab","rating":14,"description":"Morally bad or wrong, strong attack with the tip of a sharp pointed instrument","cost":10},{"name":"Incapacitating Trap","rating":13,"description":"Crippling or disabling, magical force preventing movement","cost":10},{"name":"Debile Water Tear","rating":7,"description":"Water-typed physically weak or feeble, forceful pull in opposite directions","cost":10,"type":"Water","element":"Water"}],"meta":{"avgPercentage":105,"totalStatPoints":3467},"elements":{"secondaryType":"Dark","primaryType":"Water","secondaryElement":"Voodoo","primaryElement":"Aqua"},"speciesId":"00006","createTimestamp":1644693065439}},{"speciesId":"00002","xalianId":"00002-1743c1a3-2d8d-4add-a55a-4c69d9fb24f9","attributes":{"xalianId":"00002-1743c1a3-2d8d-4add-a55a-4c69d9fb24f9","species":{"generation":"0","planet":"Magmuth","name":"Dromeus","description":"A partially feathered ground bird with lizard features, somewhat resembling a velociraptor. These creatures are extremely quick with razor sharp teeth, and prefer to hunt in packs.","weight":"","id":"00002","height":""},"healthPoints":999,"stats":{"evasionPoints":{"name":"evasionPoints","range":"low","points":277,"percentage":110},"standardAttackPoints":{"name":"standardAttackPoints","range":"high","points":824,"percentage":109},"standardDefensePoints":{"name":"standardDefensePoints","range":"medium","points":542,"percentage":108},"staminaPoints":{"name":"staminaPoints","range":"low","points":210,"percentage":84},"specialDefensePoints":{"name":"specialDefensePoints","range":"low","points":275,"percentage":110},"recoveryPoints":{"name":"recoveryPoints","range":"low","points":287,"percentage":114},"specialAttackPoints":{"name":"specialAttackPoints","range":"low","points":293,"percentage":117},"speedPoints":{"name":"speedPoints","range":"high","points":601,"percentage":80}},"moves":[{"name":"Faint Clobber","rating":11,"description":"Weak or feeble smash with great physical force","cost":10},{"name":"Evil Inferno Incantation","rating":12,"description":"Fire-typed morally bad or wrong chant producing a magical spell","cost":10,"type":"Fire","element":"Inferno"},{"name":"Mindless Bop","rating":5,"description":"Foolish or heedless, playful, harmless smack","cost":10},{"name":"Ethereal Hook","rating":15,"description":"Divine, spiritually perfect, short swinging punch delivered from the side","cost":10}],"meta":{"avgPercentage":104,"totalStatPoints":3309},"elements":{"secondaryType":"Ice","primaryType":"Fire","secondaryElement":"Frost","primaryElement":"Ember"},"speciesId":"00002","createTimestamp":1644693143871}}]`);
			resolve(mockXalians);
		});
  }

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
            console.log('\n\n' + JSON.stringify(response.data) + '\n\n');
            resolve(response.data);
          })
          .catch((e) => {
            alert("BOOOOO batch \n\n" + "axios GET ERROR : \n" + JSON.stringify(e, null, 2));
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
  return callUpdateUserXalian('ADD_XALIAN_ID', userId, xalianId);
};

export const callUpdateUserRemoveXalian = (userId, xalianId) => {
  return callUpdateUserXalian('REMOVE_XALIAN_ID', userId, xalianId);
};

export const callUpdateUserXalian = (action, userId, xalianId) => {
  const data = {
    userId: userId,
    action: action,
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
            alert("axios update user ERROR : " + e);
            console.log("caught ERROR : " + e);
          });
      });
    } catch (e) {
      console.log("caught ERROR : " + e);
    }
  });
};

