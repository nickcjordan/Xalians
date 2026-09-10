# Backend modernization audit

Audit of everything behind `api.xalians.com` as of 2026-09-10: `lambda/`, the root `package.json`, `main.tf` and `terraform/modules/lambda`, `github-oidc.tf`, the two backend workflows, the Amplify-managed Cognito functions, and the seam where backend code is copied into `my-app/`. Requested by Nick after noticing the Lambdas are CommonJS on an old stack. The brief: find what should be modernized, with TypeScript shared between frontend and backend as the headline, and raise anything else worth enhancing.

## Context

The backend is seven Lambda functions behind one HTTP API Gateway, all deployed from a single zip of the `lambda/` directory. One function (`GET /xalian`) runs the legacy generation engine unauthenticated. The other six are DynamoDB CRUD handlers behind `AWS_IAM` auth, signed by the frontend with Cognito identity-pool credentials. Persistence is two hand-created DynamoDB tables, `XalianTable` (keys `speciesId` + `xalianId`) and `XalianUsersTable` (key `userId`).

The audit was run against `main` (commit `84e0823`), not the checked-out `design/duel-board` branch, which is 302 commits behind. Every backend source file is byte-identical between the two; only the workflow branch names differ.

Two facts change the shape of the recommendations:

1. **The infrastructure is already modern; the code is not.** Runtime is `nodejs20.x` (not `nodejs12.x` as `CLAUDE.md` says), the DB delegates already use AWS SDK v3, Terraform is 1.14 with an S3 backend and lockfile, and CI deploys through GitHub OIDC. The handlers themselves are 2021-era CommonJS with callback-style signatures wrapped around a promise-based SDK.
2. **The engine in `lambda/` is the scrapped stat system.** The ratified generator (seed-deterministic, `xal_` ids, provenance block, no game numbers) lives in `my-app/src/gameplay/generator/` and its own header says it moves to the Lambda unchanged once the backend generates real records. Porting the legacy engine to TypeScript would be wasted work. The modernization should move the new generator into a shared package and retire the old one.

## Assumptions & Decisions

| # | Assumption / Decision | Confidence | Supporting Evidence |
|---|---|---|---|
| 1 | Audit against `main`, not the checked-out branch; backend sources are identical on both. | 100% | `git diff --stat HEAD main -- lambda/src/*.js lambda/src/database ...` returns only workflow branch-name changes |
| 2 | The legacy engine (`ai.js`, `moveBuilder.js`, `translator.js`, stat constants) is not worth porting; the new generator replaces it. | 90% | Generator header in `my-app/src/gameplay/generator/generate.js:1-16`; creature-system redesign scrapped the stat system; `xalians-platform-vision-and-economy.md` |
| 3 | Shared types should be derived from zod schemas rather than hand-written interfaces, because the frontend already depends on zod 4 and the backend needs runtime validation anyway. | 85% | `my-app/package.json` (`zod ^4.6.0`); no validation in any handler |
| 4 | npm workspaces over pnpm or yarn workspaces: `lambda/` is already npm with a v3 lockfile and CI runs `npm ci`; yarn classic in `my-app` is the odd one out and would be folded in. | 75% | `lambda/package-lock.json` lockfileVersion 3; `deploy-backend.yml` cache `npm`; `my-app/yarn.lock` |
| 5 | esbuild bundling per handler replaces zipping the whole `lambda/` tree. It is what makes TypeScript, ESM, and tree-shaking free at deploy time. | 90% | `main.tf:73-92` manual excludes list; `tools.js:45-58` CWD-relative JSON loading exists only because the tree is shipped raw |
| 6 | Node 20 reached end of life in April 2026 and AWS lists `nodejs20.x` deprecation at the same date; the target is `nodejs22.x` (or `nodejs24.x` if the provider supports it). | 85% | Node.js release schedule; AWS Lambda runtime deprecation table; local machine runs v24 |
| 7 | Identity should come from the request context (Cognito identity id) or a JWT authorizer, not from a `userId` parameter. Which of the two is a design choice deferred to the registry work (issue #20), but the parameter must stop being trusted now. | 95% | `userTableCRUDLambdas.js:14-20, 152-160`; `xalianTableCRUDLambdas.js:4-22` |
| 8 | The DynamoDB key design (`speciesId` derived from `xalianId.split('-')[0]`) will not survive the new record ids (`xal_...`, species keys like `graviclaw`); a registry key design is part of the modernization, not a later concern. | 90% | `responseBuilder.js:78-87`; `docs/design/sample-record-graviclaw.json:1-3` |

## Findings

Severity: P1 blocks or endangers real users or the deploy pipeline; P2 is structural debt that gets more expensive with every consumer; P3 is hygiene.

### P1: security and integrity

**F1. Any signed-in user can read and modify any other user's record, including granting themselves tokens.** `AWS_IAM` on the routes only proves the caller holds a Cognito identity. The handlers then trust `userId` from the query string (`retrieveXalianUser`) or body (`updateXalianUser`). `PATCH /db/user` with `{ userId: "someone-else", action: "ADD_TOKENS", value: "1000000" }` succeeds. The identity is available in `event.requestContext.authorizer.iam.cognitoIdentity.identityId` for HTTP APIs with IAM auth; the handlers never read it. Fix: derive the subject from the request context and reject or ignore any client-supplied `userId`. The cleaner long-term shape is a Cognito JWT authorizer on API Gateway with `sub` from claims, which also removes SigV4 signing from the frontend. (`lambda/src/database/userTableCRUDLambdas.js:14-20`, `152-160`)

**F2. Generated Xalians are trusted from the client.** Generation is an unauthenticated `GET /xalian`; keeping is a separate authenticated `POST /db/xalian` whose body is written to DynamoDB verbatim. Nothing ties the two together, so a client can post any record it likes with any stats, then attach it to its user. This breaks the platform's core premise (uniquely generated, provably legitimate creatures) and the Scrambler Token economy before it exists. Fix: generate and persist in one server-side call (the "generate" verb the vision doc ratified), or return a signed record from the generator and verify the signature on keep. (`lambda/src/database/xalianTableCRUDLambdas.js:4-22`, `my-app/src/pages/generatorPage.tsx:60-73`)

**F3. Full request events are logged, including SigV4 authorization headers.** Every CRUD handler does `console.log(JSON.stringify(event))`. For IAM-signed requests that puts the `authorization` and `x-amz-security-token` headers into CloudWatch, plus every user id and record. Retention is 7 days, but it is still credential material at rest. Fix: structured logging with an explicit allowlist of fields. (`xalianTableCRUDLambdas.js:5`, `userTableCRUDLambdas.js:16`, `59`)

**F4. Raw errors are returned to the client.** `buildError` serializes the caught error object as the 500 body, exposing DynamoDB error names, table names, and request ids. Fix: log the error, return a fixed shape (`{ errorCode, errorMessage, requestId }`). (`lambda/src/database/responseBuilder.js:22-30`)

**F5. The Lambda role has `AmazonDynamoDBFullAccess` across the account, shared by all seven functions.** The generator function does not need DynamoDB at all. Fix: one role per function or per group, scoped to the two table ARNs and the specific actions each handler uses. (`main.tf:54-57`)

**F6. Deprecated runtimes.** `nodejs20.x` for the seven API functions is past its AWS deprecation date, which means AWS will eventually block updates and then invocations. The two Amplify-managed Cognito functions (post-confirmation trigger, admin queries) are on `nodejs14.x`, deprecated since 2023, and both `require('aws-sdk')` v2, which is not present on runtimes from 18 up. The trigger works today only because it was never redeployed. Fix: `nodejs22.x` or newer everywhere; SDK v3 in the Amplify functions. (`terraform/modules/lambda/lambda_instance.tf:47`, `my-app/amplify/backend/function/*/…-cloudformation-template.json`)

### P2: structure and correctness

**F7. No shared types, and the sharing that exists runs the wrong way.** `copy-js` copies `lambda/src/constants` and `lambda/src/gameplay` into `my-app/src` with `cp -rf` on every dev start and CI build, then a Vite CommonJS shim makes the copies importable. Meanwhile the ratified generator, the expedition rules, and the registries live only in `my-app/src/gameplay` and are meant to move to the backend later. There is no single place where "what a Xalian is" is defined for both sides. This is the TypeScript question, and the answer is a workspace package (section "Target architecture" below).

**F8. Callback-style handlers over a promise SDK.** All six CRUD handlers take `(event, context, callback)` and thread `onSuccess`/`onNotFound`/`onFail` callbacks through the delegates, which internally call `.then()` on SDK v3 commands. Three layers of error plumbing for what is `try { await } catch {}`. `retrieveXalianUser` is missing a `return` after its bad-request callback, so it then throws on `.toLowerCase()` of `undefined` and invokes the callback twice. Fix: `async` handlers, delegates that return promises, one error wrapper. (`userTableCRUDLambdas.js:14-20`)

**F9. Lost-update races on user mutations.** `updateXalianUser` reads the user, edits `xalianIds` or `attributes.tokens` in memory, and writes the whole attribute back with no condition expression. Two concurrent keeps, or a keep racing a token spend, drop one write. Fix: atomic `list_append` / `ADD` update expressions with a `ConditionExpression` on the prior value, or a version attribute. (`userTableCRUDLambdas.js:160-190`, `userDbDelegate.js:68-118`)

**F10. Batch reads ignore `UnprocessedKeys` and the 100-key limit.** `getXalianBatch` returns `data.Responses.XalianTable` directly. Under throttling DynamoDB returns partial results; a user with more than 100 Xalians gets a validation error. (`xalianDbDelegate.js:45-58`)

**F11. The DynamoDB tables are not in Terraform.** Both `aws_dynamodb_table` blocks are commented out; the live tables were created by hand and their key schema is documented only in a comment. No point-in-time recovery is declared, so its state is unknown. Everything else in the account is code-managed, so this is the one piece that cannot be rebuilt from the repo. Fix: `import` blocks for the live tables, enable PITR. (`main.tf:799-830`)

**F12. The key design does not fit the new records.** `buildBatchGetParams` and `getXalian` derive the partition key from `xalianId.split('-')[0]`, which assumes the legacy `00006-<uuid>` id. The ratified record id is `xal_<hex>` with a species key like `graviclaw`. Either the new ids carry the species prefix or the table gets a real design (single-table with `PK = USER#<id>` / `SK = XALIAN#<id>`, or a GSI on owner). This is the concrete case that reopens issue #20 earlier than "when a second consumer exists": the moment the backend generates a real record, it has nowhere valid to put it. (`responseBuilder.js:78-87`, `docs/design/sample-record-graviclaw.json`)

**F13. Shipping the raw source tree instead of a bundle.** `archive_file` zips all of `lambda/` with a hand-maintained excludes list that already went stale once (the current branch adds two more entries). Data JSON is loaded at runtime with `fs.readFileSync` against the process working directory through a chain of fallback paths in `tools.js`. A bundler resolves imports at build time, ships only what each handler reaches, and removes the excludes list and the path juggling. (`main.tf:73-92`, `lambda/src/tools.js:19-58`)

**F14. No tests, no lint, no typecheck for the backend.** CI builds the frontend and plans Terraform. Nothing exercises a handler. The legacy engine's "verification" is running `start.js` and eyeballing output. The generator moving into a shared package brings its existing Vitest suites with it; handlers need their own with `aws-sdk-client-mock`.

**F15. `GET /xalian` has no throttling.** The vision doc ratified API Gateway throttling on the free lever. `aws_apigatewayv2_stage` supports `default_route_settings { throttling_burst_limit, throttling_rate_limit }` and per-route overrides; none are set. (`main.tf:127-175`)

**F16. User record creation happens in the browser after sign-up.** `authButtonGroup.tsx` calls `callCreateUser` client-side. If the tab closes between confirmation and that call, the Cognito user exists with no record and every later page fails on `USER_NOT_FOUND`. The post-confirmation trigger only adds the user to a group; `CLAUDE.md` is wrong that it creates the record. Fix: create the record in the trigger (or lazily on first authenticated read). (`my-app/src/components/auth/authButtonGroup.tsx:90`, `amplify/.../add-to-group.js`)

**F17. Hand-rolled CORS on the generator response.** `Access-Control-Allow-Origin: *` together with `Allow-Credentials: true` is an invalid combination browsers reject when credentials are actually sent, and `X-Requested-With: *` is not a header. API Gateway already owns CORS for the whole API. Remove the handler-level headers. (`lambda/src/generateXalianLambda.js:10-17`)

### P3: hygiene

**F18. The root `package.json` is a junk drawer.** `aws-sdk` v2, `express`, `morgan`, `cookie-parser`, `bluebird`, `csv-parser`, `free-google-image-search`, `react-inlinesvg`, `boardgame.io`, and an npm package literally named `terraform` are declared and none are used by the backend. The workspace root should hold only tooling.

**F19. `uuid` can go.** Node 20 and up ship `crypto.randomUUID()`. The Lambda package would then have zero runtime dependencies.

**F20. Dead code.** Roughly a third of the handler files are commented-out earlier versions; `characterTemplate.js` is an empty class; `mappings.js`, `statLevelConstants.js`, and the `txt/` and `csv/` folders serve the legacy engine only.

**F21. `CLAUDE.md` is stale on the backend.** It states `nodejs12.x`, says `uuid` is undeclared, describes the DB delegates as SDK v2 `DocumentClient`, and says the post-confirmation trigger creates the user record. All four are wrong today.

**F22. `terraform fmt -check` is `continue-on-error`.** Run `terraform fmt -recursive` once and make the check real.

## Target architecture

The single change that answers the TypeScript request and fixes F7, F12 (partly), F13, and F14 together is turning the repo into a workspace with one shared core package.

```
xalians/
  package.json              npm workspaces root: tooling only (typescript, eslint, prettier, vitest)
  tsconfig.base.json
  packages/
    core/                   @xalians/core, TypeScript, zero runtime deps beyond zod
      src/schema/           zod schemas: XalianRecord, SpeciesTemplate, Registries, User, API request/response shapes
      src/generator/        moved from my-app/src/gameplay/generator (prng, constants, generate, grade)
      src/duel/             attackCalculator and the constants the duel reads today
      src/data/             species.json, speciesRecords.json, registries.json, abilityCatalog.json, elements.json (single source; the copy-json step disappears)
      src/index.ts
  apps/
    api/                    the Lambda handlers, TypeScript, ESM
      src/handlers/         one file per route, each `export const handler = withApi(schema, async (req, ctx) => ...)`
      src/lib/              db client, auth (subject from request context), response, logger
      esbuild.config.mjs    bundle each handler to dist/<name>/index.mjs, platform node, target node22, external @aws-sdk/*
      test/                 vitest + aws-sdk-client-mock
    web/                    my-app, unchanged apart from importing @xalians/core instead of copied files
  main.tf, terraform/       archive_file points at apps/api/dist; one zip per handler or one dist zip with distinct handler paths
```

How the pieces fit:

- **Types come from schemas.** `packages/core/src/schema/xalian.ts` declares `XalianRecordSchema` with zod and exports `type XalianRecord = z.infer<typeof XalianRecordSchema>`. The API validates every inbound body and every outbound record against it; the web app's `dbApi` parses responses with the same schema, so a shape drift fails loudly on both sides instead of rendering `undefined`. `generatorVersion` and `schemaVersion` are enums in the schema, which is how versioned records stay parseable as levers move.
- **The generator runs on both sides.** Same code path for the free showroom lever in the browser (with the constrained profile the vision doc ratified) and for real generation on the server. Determinism from the seed means the server can re-derive and verify a client-shown record rather than trusting it (F2).
- **Handlers are thin.** `withApi` does: parse and validate input against the route schema, pull the subject from the request context, call the handler, serialize the result, map thrown `ApiError`s to status codes, log one structured line. Roughly 60 lines; no framework needed at this size. Middy is the off-the-shelf alternative if the middleware count grows.
- **Data is imported, not read from disk.** JSON in `packages/core/src/data` is imported as modules and bundled. `tools.getObject` and the excludes list go away.
- **Vite already handles it.** `my-app/tsconfig.json` has `allowJs`, `paths`, and TypeScript 7; the shim for CommonJS copies is deleted once the copies are gone. The `jsx-in-js` plugin stays until the remaining `.js` components are converted, which is out of scope here.

## Migration order

Each step is one PR and leaves the site working.

1. **Runtime and role.** `nodejs22.x`, scoped IAM policies per function, throttling on the stage and the generator route, `terraform fmt`. Import the two DynamoDB tables and enable PITR. Pure Terraform, no code change. (F5, F6, F11, F15, F22)
2. **Subject from context.** Read the Cognito identity id from `requestContext` in every user handler; ignore client `userId`. Stop logging events; fixed error shape. Still JavaScript, small diff, closes the open hole first. (F1, F3, F4)
3. **Workspace skeleton.** Root `package.json` with workspaces, `packages/core` holding the generator, duel math, constants, and data moved from `my-app`; `my-app` imports from it; `copy-js` and `copy-json` deleted; the Vite CommonJS shim deleted. The Lambda still ships the legacy engine at this point. (F7, F18)
4. **Schemas.** zod schemas for `XalianRecord`, `SpeciesTemplate`, `User`, and each API request and response in `packages/core/src/schema`. The web client parses responses through them. (F7)
5. **`apps/api` in TypeScript.** Rewrite the six CRUD handlers as `async` functions over promise-returning delegates with atomic updates and batch-read pagination, bundled with esbuild, deployed from `dist`. Handler tests with `aws-sdk-client-mock`. Terraform `archive_file` repointed. (F8, F9, F10, F13, F14, F17, F19)
6. **Generate on the server.** `POST /xalians` generates a real record from `@xalians/core`, persists it under the caller's subject, and returns it; the keep flow becomes one call. The legacy engine, `translator`, `moveBuilder`, `ai.js`, and the `txt`/`csv` folders are deleted. This is where the key design (F12) has to be settled, so it is also where issue #20's registry design starts. (F2, F12, F20)
7. **Cognito functions.** Post-confirmation trigger creates the user record, on SDK v3 and a current runtime. Ideally this moves out of Amplify and into Terraform alongside the other functions so there is one deploy path. (F6, F16)
8. **Docs.** `CLAUDE.md` backend section rewritten to the new layout. (F21)

Steps 1 and 2 are independent of the TypeScript work and should not wait for it.

## Friction reported

Per the levers-not-stone rule: the ratified record id format (`xal_<hex>` with a separate `species` field) and the live DynamoDB key design (`speciesId` parsed out of the id) cannot both stand. Recommended smallest change: keep the record format, redesign the table when the server starts generating (step 6), and treat issue #20's "wait for a second consumer" as superseded by that step.
