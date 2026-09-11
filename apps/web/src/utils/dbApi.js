import axios from "axios";
import { Auth } from "aws-amplify";
import { UserRecordSchema, PublicProfileSchema, XalianRecordSchema } from "@xalians/content/schema";
import { generateXalian, getSpeciesTemplates } from "@xalians/rules/generator";

/**
 * The one HTTP client for the Xalians API.
 *
 * Creatures live in the registry as ratified XalianRecords, and every record
 * that comes back is parsed strictly through XalianRecordSchema: a response
 * that does not match the ratified shape is a bug worth failing on, not
 * something to render half of. The legacy creature routes (GET /xalian,
 * POST /db/xalian, GET /db/xalian) and their client functions were deleted
 * with issue #180.
 *
 * The /db/user routes are Cognito-JWT-authorized; the showroom is the one
 * anonymous route, so it sends no Authorization header at all.
 */

const API = "https://api.xalians.com/prod";

// Sample records for the offline paint check and for local work without a
// signed-in session. VITE_USE_CACHE=true swaps every network call below for a
// generated record, so the pages render exactly what the API would return.
const useCache = () => import.meta.env.VITE_USE_CACHE === "true";

// A cheap counter, not a real 128-bit genome: it only needs to change the seed on each
// offline pull so repeated "Generate another" clicks under VITE_USE_CACHE=true actually
// render a different creature, the way the real API's random seed does.
let pullCounter = 0;

function sampleRecords(count = 1, profile, pullSeed) {
  const templates = getSpeciesTemplates();
  const picks = ["graviclaw", "neph", "yetimoth"];
  return Array.from({ length: count }, (unused, index) => {
    const key = picks[index % picks.length];
    const template = templates.find((t) => t.key === key) || templates[index % templates.length];
    const seed = pullSeed
      ? `sample-${template.key}-${pullSeed}-${profile || "full"}`
      : `sample-${template.key}-${index + 1}-${profile || "full"}`;
    return generateXalian(template, seed, {
      origin: template.homePlanet,
      generatedAt: "2026-09-07T00:00:00Z",
      profile,
    });
  });
}

async function authHeaders() {
  const session = await Auth.currentSession();
  return { Authorization: `Bearer ${session.getIdToken().getJwtToken()}` };
}

const callGet = (url) =>
  authHeaders().then((headers) => axios.get(url, { headers }).then((response) => response.data));

const callCreate = (url, data) =>
  authHeaders().then((headers) =>
    axios({ method: "post", url, headers: { ...headers, "content-type": "application/json" }, data })
      .then((response) => response.data)
  );

const callDelete = (url) =>
  authHeaders().then((headers) => axios.delete(url, { headers }).then((response) => response.data));

// ---------------------------------------------------------------------------
// The registry: ratified creature records
// ---------------------------------------------------------------------------

/**
 * The free lever (docs/design/xalians-platform-vision-and-economy.md section 3):
 * an anonymous pull that generates a real record and keeps nothing. Resolves
 * with { record, keepable }, where keepable is always false today.
 *
 * profile (issue #197): 'showroom' (the default the API applies when omitted)
 * or 'full'. Driven by the visible generator-profile toggle on the generator
 * page; this parameter is client-supplied on an anonymous route and is
 * deliberately not an entitlement check while that toggle exists.
 */
export const callShowroomXalian = (profile) => {
  if (useCache()) {
    pullCounter += 1;
    return Promise.resolve({
      record: XalianRecordSchema.parse(sampleRecords(1, profile || "showroom", pullCounter)[0]),
      keepable: false,
    });
  }
  const suffix = profile ? `?profile=${encodeURIComponent(profile)}` : "";
  return axios.get(`${API}/xalians/showroom${suffix}`).then((response) => ({
    record: XalianRecordSchema.parse(response.data.record),
    keepable: response.data.keepable === true,
  }));
};

/**
 * Generates a record server-side and keeps it under the caller.
 *
 * profile (issue #197): 'full' (the API's default) or 'showroom', driven by
 * the same generator-profile toggle so a signed-in visitor can compare modes
 * too.
 */
export const callGenerateXalian = (species, profile) => {
  if (useCache()) {
    pullCounter += 1;
    return Promise.resolve(XalianRecordSchema.parse(sampleRecords(1, profile, pullCounter)[0]));
  }
  const body = {};
  if (species) body.species = species;
  if (profile) body.profile = profile;
  return callCreate(`${API}/xalians`, body).then((data) => XalianRecordSchema.parse(data));
};

/**
 * Lists an owner's records, newest first. Omit ownerId for the caller's own.
 * Resolves with { items, nextCursor }; nextCursor is undefined on the last page.
 */
export const callListXalians = (ownerId, cursor) => {
  if (useCache()) {
    return Promise.resolve({ items: sampleRecords(3).map((r) => XalianRecordSchema.parse(r)), nextCursor: undefined });
  }
  const params = new URLSearchParams();
  if (ownerId) params.set("ownerId", ownerId);
  if (cursor) params.set("cursor", cursor);
  const suffix = params.toString() ? `?${params.toString()}` : "";

  return callGet(`${API}/xalians${suffix}`).then((data) => ({
    items: data.items.map((item) => XalianRecordSchema.parse(item)),
    nextCursor: data.nextCursor,
  }));
};

/** Reads one record. Any signed-in caller may read any record. */
export const callGetXalian = (id) => {
  if (useCache()) {
    return Promise.resolve(XalianRecordSchema.parse(sampleRecords(1)[0]));
  }
  return callGet(`${API}/xalians/${encodeURIComponent(id)}`).then((data) => XalianRecordSchema.parse(data));
};

/** Releases one of the caller's own records. Owner-only; the server enforces it. */
export const callReleaseXalian = (id) => {
  if (useCache()) {
    return Promise.resolve({ message: "ok" });
  }
  return callDelete(`${API}/xalians/${encodeURIComponent(id)}`);
};

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

// The user record's shape is still drifting: safeParse rather than parse, warn
// with the zod issue path on a mismatch, and always return the raw data so a
// page that tolerates extra or missing fields keeps working either way.
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

export const callGetUser = (id) => {
  const url = id ? `${API}/db/user?userId=${encodeURIComponent(id)}` : `${API}/db/user`;

  return callGet(url).then((data) => {
    // A caller's own full record has "tokens"/"attributes"; anyone else's is
    // the public profile. Pick the schema that matches the shape actually
    // returned rather than guessing from the request.
    const own = "tokens" in data || "attributes" in data;
    return warnOnSchemaMismatch(
      own ? UserRecordSchema : PublicProfileSchema,
      data,
      own ? "GET /db/user (own record)" : "GET /db/user (public profile)"
    );
  });
};

export const callCreateUser = (user) => callCreate(`${API}/db/user`, user);
