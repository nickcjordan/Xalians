// GET /xalian. Unauthenticated free showroom generator. Runs the legacy (pre-record)
// engine and returns its translated shape unchanged, plus a server-side HMAC over it
// (audit F2 / signing.ts): POST /db/xalian verifies that signature before persisting, so
// keeping a Xalian can no longer write stats the server never generated. CORS is API
// Gateway's, not this handler's (the old hand-rolled CORS headers here were invalid and
// are gone).
//
// The legacy engine (src/legacy) is CommonJS. Importing it with plain ESM `import`
// syntax, rather than a hand-rolled `require`, is what lets esbuild see the reference
// statically and bundle the whole legacy module graph into this handler's output; a
// `require()` call through a locally created `createRequire` is opaque to esbuild's
// bundler and is left as a literal unresolved path in the compiled output, which is
// exactly the mistake this file used to make.
import xalianBuilder from '../legacy/xalianBuilder.js';
import translator from '../legacy/translator.js';
import { withApi } from '../lib/api.ts';
import { signRecord } from '../lib/signing.ts';

type LegacyXalianBuilder = { buildXalian: (selectedSpecies?: unknown) => unknown };
type LegacyTranslator = { translateCharacterToPresentableType: (xalian: unknown) => unknown };

const builder = xalianBuilder as unknown as LegacyXalianBuilder;
const translate = translator as unknown as LegacyTranslator;

export const handler = withApi(
  async () => {
    const xalian = builder.buildXalian();
    const translated = translate.translateCharacterToPresentableType(xalian);
    const signature = signRecord(translated);
    return { status: 200, body: { xalian: translated, signature } };
  },
  { auth: 'none' }
);
