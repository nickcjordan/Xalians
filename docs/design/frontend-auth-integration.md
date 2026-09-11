# Frontend authentication integration contract

Audit date: 2026-09-11  
Starting point: `0965b6d` (`main` after PR #237)

## Boundary

The frontend tests the contract it owns: Amplify response normalization, modal transitions, route state, and authorization headers sent to the Xalians API. Cognito itself is not duplicated in tests. All automated auth responses are deterministic mocks, and production smoke is non-destructive: it never submits credentials or stores an account secret.

## Scenario matrix

| State or action | Expected UI/API behavior | Enforcement |
| --- | --- | --- |
| Signed out | Account shows an intentional sign-in/create-account recovery surface; protected collection API is not called | `userAccountPage.test.js` |
| Verified session | Account normalizes the Cognito identity, requests the caller's collection, and renders the signed-in name/empty collection state | `authUtil.test.js`, `userAccountPage.test.js` |
| Unverified session | `email_verified` remains false; identity stays signed in and an unconfirmed sign-in moves to verification | `authUtil.test.js`, `authButtonGroup.test.js`, `signInModal.test.js` |
| Successful sign-in | Amplify receives the submitted username/password; the modal calls its owner and closes | `signInModal.test.js` |
| Invalid credentials | `NotAuthorizedException` and `UserNotFoundException` use the same inline message, avoiding username enumeration | `signInModal.test.js` |
| Generic Cognito error | Form remains open/enabled and presents a recoverable service message | `signInModal.test.js` |
| Sign-up succeeds | Auth controls transition to a verification dialog prefilled with the submitted username/email | `authButtonGroup.test.js` |
| Expired or absent session | Auth normalization returns signed out for Cognito's auth exceptions; a missing ID token rejects before `fetch` | `authUtil.test.js`, `dbApi.test.js` |
| Cognito session probe fails | Global navigation/auth controls remain usable; account distinguishes outage from signed out | `authButtonGroup.test.js`, `userAccountPage.test.js` |
| Protected API calls | Current ID token is sent as `Authorization: Bearer …` on reads, writes, and deletes; identifiers/cursors are encoded | `dbApi.test.js` |
| Anonymous showroom | Generates through the public endpoint with no token lookup and no Authorization header, even when the auth probe is unavailable | `dbApi.test.js`, `generatorPage.test.js` |
| Protected API fails | Account replaces collection content with an explicit retry-later state rather than an empty or stale collection | `userAccountPage.test.js` |

## Production smoke

The production check is limited to observable, non-destructive states: load `/account` signed out, open the sign-in dialog, exercise client-side validation without submitting valid credentials, and load `/generator` through its anonymous showroom path. Signed-in and Cognito failure responses stay in deterministic tests unless a dedicated disposable test identity and CI secret policy are approved later.
