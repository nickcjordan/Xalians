import { UserRecordSchema, PublicProfileSchema, TradeOfferSchema, XalianRecordSchema } from "@xalians/content/schema";
import { generateXalian, getSpeciesTemplates } from "@xalians/rules/generator";
import { getIdToken } from './authUtil';

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
const sampleRecordCache = new Map();
const sampleTradeCache = new Map();

function sampleRecords(count = 1, profile, pullSeed) {
  const templates = getSpeciesTemplates();
  const picks = ["graviclaw", "neph", "yetimoth"];
  return Array.from({ length: count }, (unused, index) => {
    const key = picks[index % picks.length];
    const template = templates.find((t) => t.key === key) || templates[index % templates.length];
    const seed = pullSeed
      ? `sample-${template.key}-${pullSeed}-${profile || "full"}`
      : `sample-${template.key}-${index + 1}-${profile || "full"}`;
    const record = generateXalian(template, seed, {
      origin: template.homePlanet,
      generatedAt: "2026-09-07T00:00:00Z",
      profile,
    });
    sampleRecordCache.set(record.id, record);
    return record;
  });
}

async function authHeaders() {
  return { Authorization: `Bearer ${await getIdToken()}` };
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : undefined;
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = data && typeof data === 'object' && (data.errorMessage || data.message)
      ? data.errorMessage || data.message
      : `Xalians API request failed (${response.status}).`;
    const error = new Error(message);
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
}

const callGet = async (url) => requestJson(url, { headers: await authHeaders() });

const callCreate = async (url, data) => requestJson(url, {
  method: 'POST',
  headers: { ...await authHeaders(), 'content-type': 'application/json' },
  body: JSON.stringify(data),
});

const callDelete = async (url) => requestJson(url, {
  method: 'DELETE',
  headers: await authHeaders(),
});

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
  return requestJson(`${API}/xalians/showroom${suffix}`).then((data) => ({
    record: XalianRecordSchema.parse(data.record),
    keepable: data.keepable === true,
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

/** Public read used by shareable creature pages; sends no identity or token. */
export const callGetPublicXalian = (id) => {
  if (useCache()) {
    const cached = sampleRecordCache.get(id) || sampleRecords(1, undefined, id)[0];
    return Promise.resolve(XalianRecordSchema.parse(cached));
  }
  return requestJson(`${API}/registry/xalians/${encodeURIComponent(id)}`)
    .then((data) => XalianRecordSchema.parse(data));
};

/** Public read used by shareable binder pages; sends no identity or token. */
export const callListPublicXalians = (ownerId, cursor) => {
  if (useCache()) {
    return Promise.resolve({
      items: sampleRecords(3, undefined, ownerId).map((r) => XalianRecordSchema.parse(r)),
      nextCursor: undefined,
    });
  }
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson(`${API}/registry/owners/${encodeURIComponent(ownerId)}/xalians${suffix}`)
    .then((data) => ({
      items: data.items.map((item) => XalianRecordSchema.parse(item)),
      nextCursor: data.nextCursor,
    }));
};

/** Releases one of the caller's own records. Owner-only; the server enforces it. */
export const callReleaseXalian = (id) => {
  if (useCache()) {
    return Promise.resolve({ message: "ok" });
  }
  return callDelete(`${API}/xalians/${encodeURIComponent(id)}`);
};

// ---------------------------------------------------------------------------
// Direct swaps
// ---------------------------------------------------------------------------

function sampleTrade(id = 'trd_sample') {
  const offered = sampleRecords(2, undefined, 'collector');
  const requested = sampleRecords(2);
  return TradeOfferSchema.parse({
    id,
    proposerId: 'collector',
    recipientId: 'sample',
    offeredXalianIds: offered.map((record) => record.id),
    requestedXalianIds: requested.map((record) => record.id),
    status: 'open',
    createdAt: '2026-09-12T12:00:00Z',
  });
}

export const callCreateTrade = (proposal) => {
  if (useCache()) {
    pullCounter += 1;
    const trade = TradeOfferSchema.parse({
      ...proposal,
      id: `trd_sample_${pullCounter}`,
      proposerId: 'sample',
      recipientId: proposal.recipientId.toLowerCase(),
      status: 'open',
      createdAt: new Date().toISOString(),
    });
    if (trade.counterTo) {
      const original = sampleTradeCache.get(trade.counterTo);
      if (original) sampleTradeCache.set(original.id, { ...original, status: 'countered', respondedAt: trade.createdAt });
    }
    sampleTradeCache.set(trade.id, trade);
    return Promise.resolve(trade);
  }
  return callCreate(`${API}/trades`, proposal).then((data) => TradeOfferSchema.parse(data));
};

export const callGetTrade = (id) => {
  if (useCache()) {
    if (!sampleTradeCache.has(id)) sampleTradeCache.set(id, sampleTrade(id));
    return Promise.resolve(TradeOfferSchema.parse(sampleTradeCache.get(id)));
  }
  return requestJson(`${API}/trades/${encodeURIComponent(id)}`)
    .then((data) => TradeOfferSchema.parse(data));
};

export const callAcceptTrade = (id) => {
  if (useCache()) {
    const current = sampleTradeCache.get(id) || sampleTrade(id);
    const trade = TradeOfferSchema.parse({ ...current, status: 'accepted', respondedAt: new Date().toISOString() });
    sampleTradeCache.set(id, trade);
    return Promise.resolve(trade);
  }
  return callCreate(`${API}/trades/${encodeURIComponent(id)}/accept`, {})
    .then((data) => TradeOfferSchema.parse(data));
};

export const callCancelTrade = (id) => {
  if (useCache()) {
    const current = sampleTradeCache.get(id) || sampleTrade(id);
    const trade = TradeOfferSchema.parse({ ...current, status: 'cancelled', respondedAt: new Date().toISOString() });
    sampleTradeCache.set(id, trade);
    return Promise.resolve(trade);
  }
  return callCreate(`${API}/trades/${encodeURIComponent(id)}/cancel`, {})
    .then((data) => TradeOfferSchema.parse(data));
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
