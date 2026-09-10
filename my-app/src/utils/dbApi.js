import axios from "axios";
import qs from "qs";
import Amplify, { API, Auth } from "aws-amplify";
import { UserRecordSchema, PublicProfileSchema, XalianRecordSchema } from "@xalians/content/schema";

async function authHeaders() {
  const session = await Auth.currentSession();
  return { Authorization: `Bearer ${session.getIdToken().getJwtToken()}` };
}

export const callGetXalian = (id = "00009-4c1d8607-d3de-4313-91b1-84eecd5ce921") => {
  return callGet("https://api.xalians.com/prod/db/xalian?xalianId=" + id);
};

// The legacy user record's shape is still drifting (D1's docs call this out as the
// "drift alarm", not a hard contract): safeParse rather than parse, warn with the zod
// issue path on a mismatch, and always return the raw data so the legacy pages that
// tolerate extra/missing fields keep working either way.
function warnOnSchemaMismatch(schema, data, label) {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.warn(
      `dbApi: ${label} response did not match its schema: ${result.error.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ")}`
    );
  }
  return data;
}

export const callGetUser = (id, populateXalians = false) => {
  const url = populateXalians
    ? "https://api.xalians.com/prod/db/user?userId=" + id + "&populateXalians=true"
    : "https://api.xalians.com/prod/db/user?userId=" + id;

  return callGet(url).then((data) => {
    // A caller's own full record has "tokens"/"attributes"; anyone else's is the public
    // profile (userId + xalianIds, optionally xalians). Pick the schema that matches the
    // shape actually returned rather than guessing from the request.
    const schema = "tokens" in data || "attributes" in data ? UserRecordSchema : PublicProfileSchema;
    const label = schema === UserRecordSchema ? "GET /db/user (own profile)" : "GET /db/user (public profile)";
    return warnOnSchemaMismatch(schema, data, label);
  });
};

export const callGet = (url) => {
  return authHeaders().then((headers) => {
    return axios
      .get(url, { headers })
      .then((response) => response.data);
  });
};

export const callGetXalianBatch = (ids) => {

  if (import.meta.env.VITE_USE_CACHE === 'true') {
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
  // the API returns a bare xalian object for a single id and an array for 2+;
  // normalize so callers always get an array of bare xalians
  return callGet("https://api.xalians.com/prod/db/xalian?xalianId=" + encodeURIComponent(qString)).then((result) =>
    Array.isArray(result) ? result : [result]
  );
};

// Keeps a Xalian in one call: posts the { xalian, signature } envelope
// callGenerateXalian() returned, unchanged. The server verifies the signature, persists,
// and appends the id to the caller's user record itself (apps/api/src/handlers/createXalian.ts);
// there is no longer a separate "add to user" step (see the deleted callUpdateUserAddXalian).
export const callKeepXalian = (envelope) => {
  return callCreate("https://api.xalians.com/prod/db/xalian", envelope);
};

export const callCreateUser = (user) => {
  return callCreate("https://api.xalians.com/prod/db/user", user);
};

export const callCreate = (url, data) => {
  return authHeaders().then((headers) => {
    return axios({
      method: "post",
      url,
      headers: { ...headers, "content-type": "application/json" },
      data,
    }).then((response) => response.data);
  });
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

  return authHeaders().then((headers) => {
    return axios({
      method: method,
      url,
      headers: { ...headers, "content-type": "application/json" },
      data,
    }).then((response) => response.data);
  });
};

// -----------------------------------------------------------------------------------
// Registry (D1): server-generated, ratified XalianRecords. No page uses these yet (the
// generator and account pages stay on the legacy shape until the separate record-view
// design brief); these are new and typed end to end, so responses are parsed strictly
// (schema.parse, not safeParse) rather than warned-and-passed-through.
// -----------------------------------------------------------------------------------

export const callGenerateRegistryXalian = (species) => {
  return callCreate("https://api.xalians.com/prod/xalians", species ? { species } : {}).then((data) =>
    XalianRecordSchema.parse(data)
  );
};

export const callListRegistryXalians = (ownerId, cursor) => {
  const params = new URLSearchParams();
  if (ownerId) params.set("ownerId", ownerId);
  if (cursor) params.set("cursor", cursor);
  const qsSuffix = params.toString() ? "?" + params.toString() : "";

  return callGet("https://api.xalians.com/prod/xalians" + qsSuffix).then((data) => ({
    items: data.items.map((item) => XalianRecordSchema.parse(item)),
    nextCursor: data.nextCursor,
  }));
};

export const callGetRegistryXalian = (id) => {
  return callGet("https://api.xalians.com/prod/xalians/" + encodeURIComponent(id)).then((data) =>
    XalianRecordSchema.parse(data)
  );
};
