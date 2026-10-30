# Slice 2: Private area — plan

## Progress checklist

**Status (2026-10-30):** PR 1 is in review. Next is PR 2 (private API).

- [ ] **PR 1: Cognito user pool** (`slice-2/user-pool`) — in review
  - [x] Config: `OWNER_EMAIL` and `AUTH_DOMAIN_PREFIX` in `infra/lib/config.ts`, `.env.example`, and CI `env:`, with config tests
  - [x] `PrivateAreaStack`: user pool (admin-only signup, TOTP required), app client (code + PKCE, no secret), managed login domain and branding, owner user
  - [x] Assertion tests; turning self-signup on turns a test red
  - [x] CI deploys `SiteStack PrivateAreaStack`
  - [x] Owner: set repo variables `OWNER_EMAIL` and `AUTH_DOMAIN_PREFIX` before merge
  - [ ] Owner: after deploy, sign in once through the managed login URL, set a password, and enroll TOTP
- [ ] **PR 2: Private API** (`slice-2/private-api`)
  - [ ] `services/private-api`: pure `buildPrivateContent`, thin handler that zod-parses the JWT claims, with unit and handler tests
  - [ ] HTTP API with a Cognito JWT authorizer on every route, CORS for site origins, stage throttling, 14-day access logs
  - [ ] `NodejsFunction` (Node 24, arm64, explicit 14-day log group); `esbuild` dev dependency
  - [ ] Assertion tests; removing the authorizer turns a test red
  - [ ] CI smoke: `GET <ApiUrl>/private` with no token returns 401
- [ ] **PR 3: Sign-in and private page** (`slice-2/sign-in`)
  - [ ] SiteStack writes `config.json` (API URL, auth domain, client ID) at deploy time
  - [ ] `apps/web/src/lib/auth/`: config schema, PKCE, authorize/logout URLs, token exchange, session storage, with unit tests
  - [ ] `/private/` (sign in, show content, sign out) and `/auth/callback/` pages
  - [ ] CI smoke also checks `/private/` and `/config.json`
- [ ] **Docs** (see "Docs" section below)
  - [ ] D-022 to D-025
  - [ ] CLAUDE.md: `services/private-api`, new env vars in the synth note
  - [ ] SLICES.md points to this plan
- [ ] **Verification** (see "Verification" section below)
  - [ ] Owner signs in on `https://quathomas.com/private/` and sees private content
  - [ ] The CI smoke test gets 401 from the API with no token
  - [ ] The authorizer and self-signup assertion tests were each proven red once

**Notes from work so far**

- PR 1 departures:
  - Pricing wasn't re-verified in this PR: the pool uses the Essentials plan on the free MAU tier from memory. Check the first bill, and the Budgets alerts cover it.
  - `cdk diff` needs an SSO login (the token had expired), so it runs before merge, not in the PR.
- Owner choices (2026-10-30): Cognito managed login with authorization code + PKCE, password plus **required TOTP MFA**; the 401 check is a curl step in the CI smoke test, not Playwright.

**Instructions for agents**

- Read this file and `CLAUDE.md` first. Work on the first unchecked PR only.
- Start each PR on a new branch (`slice-2/<topic>`) from an up-to-date `main`. Never commit to `main`.
- **Check off items in this checklist as you complete them**, in the same branch as the work, and update the status line. Mark a PR merged only after it actually merges.
- Record any departure from the plan under "Notes from work so far".
- Items marked "Owner" are done by the repo owner. Ask them to confirm before checking these off.
- This slice adds IAM (a Lambda execution role and an API Gateway invoke permission). Explain each in the PR description per CLAUDE.md.

## Context

Slice 1 left a static content site live on `https://quathomas.com`. Slice 2 (docs/SLICES.md) adds a private area that only the owner can reach: a Cognito user pool with self-signup disabled and one user, a sign-in page, and an HTTP API with a JWT authorizer that returns private content.

**Done when:** the owner sees private content after signing in, and an automated test gets 401 with no token.

Constraints that shape the design:

- **D-004 / D-006:** the site is a static export, so pages can't be gated. The `/private/` page itself is public HTML; the _content_ only comes from the authenticated API.
- **The repo is public.** Anything committed is public, so the API's "private content" in this slice is generated from the caller's verified claims (who you are, when the session expires), not a committed file. Real private content arrives with the assistant in Slice 3.
- **No hardcoded domains, IDs, or ARNs:** the browser gets the API URL, auth domain, and client ID from a `config.json` that CDK writes at deploy time.

What's already in place:

- `infra/bin/app.ts` builds `SiteStack` and `GitHubOidcStack` with shared `tags` and `env`. Config comes from `infra/lib/config.ts` (`loadConfig`, using `parseEnv` from `packages/shared/src/parse-env.ts`).
- `infra/test/*.test.ts` show the assertion-test pattern: a `synth()` helper, an untaggable-types allowlist, and per-property `hasResourceProperties` checks.
- `.github/workflows/ci.yml`: the `deploy` job runs `cdk deploy SiteStack` and a curl smoke loop over `cdk-outputs.json`.
- `aws-cdk-lib` 2.272 includes `aws-apigatewayv2`, `aws-apigatewayv2-authorizers` (`HttpUserPoolAuthorizer`), `Runtime.NODEJS_24_X`, and Cognito `featurePlan` / `managedLoginVersion`. `esbuild` is **not** installed.
- `services/*` is already in `pnpm-workspace.yaml` and the Vitest `projects`, so a new service package is picked up automatically.

## Architecture

```
browser ── /private/ (static) ──► redirect to Cognito managed login (code + PKCE, TOTP)
        ◄── /auth/callback/?code ── exchange code at <authDomain>/oauth2/token (fetch)
        ── GET <ApiUrl>/private, Authorization: Bearer <access token> ──►
           HTTP API ── JWT authorizer (issuer = pool, audience = client) ── Lambda ── JSON
```

- New stack **`PrivateAreaStack`** holds the user pool, app client, domain, HTTP API, and Lambda. SiteStack takes its outputs as props for `config.json` (a one-way cross-stack reference: callback URLs come from `SITE_DOMAIN` config, not the distribution, so there's no cycle).
- The API is called on its default `execute-api` URL with CORS, not through CloudFront. Routing `/api/*` through the distribution would collide with its 403/404 → `/404.html` error mapping. Slice 4 revisits CloudFront routing for streaming.

## PRs (each about 300 lines or fewer, excluding the lockfile)

### PR 1: Cognito user pool (`slice-2/user-pool`)

- `infra/lib/config.ts`: add `OWNER_EMAIL` (`z.email()`, required, like `BUDGET_ALERT_EMAIL`) and `AUTH_DOMAIN_PREFIX` (required; lowercase letters, digits, hyphens; must be unique in the region and can't contain "cognito" or "aws"). Add both to `infra/.env.example` and to the CI `env:` block. Tests in `infra/test/config.test.ts`.
- `infra/lib/private-area-stack.ts`, props `{ ownerEmail, authDomainPrefix, siteOrigins }` (`siteOrigins` = `https://<SITE_DOMAIN>` and `https://www.<SITE_DOMAIN>` when set, plus `http://localhost:3000` for `pnpm dev`):
  - **UserPool:** `selfSignUpEnabled: false`, sign-in with email, `featurePlan: ESSENTIALS` (managed login needs it; free under the MAU free tier for one user, so verify current pricing in the PR), `mfa: Mfa.REQUIRED` with `mfaSecondFactor: { otp: true, sms: false }` (no SMS, so no per-message cost), a strong password policy, `accountRecovery: EMAIL_ONLY`, `deletionProtection: true`, `removalPolicy: RETAIN` (it holds the owner's credentials and MFA enrollment).
  - **App client:** public client (`generateSecret: false`), OAuth `authorizationCodeGrant` only, scopes `openid` and `email`, callback `<origin>/auth/callback/` and logout `<origin>/private/` for each site origin, `preventUserExistenceErrors: true`, `authFlows` empty (the managed login page handles credentials, and there's no direct password API). Access and ID tokens valid for 1 hour.
  - **Domain:** `UserPoolDomain` with `cognitoDomain.domainPrefix` and `managedLoginVersion: NEWER_MANAGED_LOGIN`, plus a `CfnManagedLoginBranding` with `useCognitoProvidedValues: true` for the client. **Risk to check first:** if v2 managed login misbehaves without custom branding, fall back to the classic hosted UI and record it in Notes.
  - **Owner user:** `CfnUserPoolUser` with `username` and `email` = `OWNER_EMAIL`, `email_verified: true`, and `desiredDeliveryMediums: ['EMAIL']`. Cognito emails a temporary password on creation; managed login forces a new password and TOTP enrollment on the first sign-in. This keeps the user in IaC (no console clicks).
  - **Outputs:** `UserPoolId`, `UserPoolClientId`, `AuthDomain` (the `https://<prefix>.auth.us-east-1.amazoncognito.com` base URL).
- `infra/bin/app.ts`: instantiate `PrivateAreaStack` with the shared `tags` and `env`.
- `infra/test/private-area-stack.test.ts` asserts:
  - `AdminCreateUserConfig.AllowAdminCreateUserOnly` is true (break-on-purpose test)
  - MFA is `ON` with only software-token MFA enabled
  - the client has no secret, only the `code` flow, and exactly the expected callback and logout URLs
  - the pool has `DeletionPolicy: Retain` and deletion protection
  - every taggable resource has `project` and `env` tags (copy the SiteStack test's pattern)
- CI deploy: `cdk deploy SiteStack PrivateAreaStack ...`. The deploy role is unchanged; it still only assumes bootstrap roles (D-016).
- **Owner:** set repo variables `OWNER_EMAIL` and `AUTH_DOMAIN_PREFIX` before merging. Without them, PR synth fails. After the deploy, open the managed login URL (the callback goes to `localhost`, which is fine for this check), set a password, and enroll an authenticator app.

### PR 2: Private API (`slice-2/private-api`)

- `services/private-api/` (`package.json` named `@portfolio/private-api`, `tsconfig.json`, `src/`):
  - `src/private-content.ts`: a pure `buildPrivateContent({ email, expiresAt })` that returns `{ message, email, sessionExpiresAt }`. Unit-tested.
  - `src/handler.ts`: zod-parses the slice of the HTTP API v2 event it uses (`requestContext.authorizer.jwt.claims`: `sub`, `email` if present, `exp`), calls the pure function, and returns a JSON response. A bad shape gets a 500 with a structured JSON log that never includes the token. A zod schema replaces `@types/aws-lambda`, so there's no new dependency there.
  - `src/handler.test.ts`: valid claims return 200 with the expected body; missing claims return 500 and log no claim values.
  - The access token carries no `email` claim. The handler shows `sub` and the API reads `email` only if present, or the web page sends the ID token instead. Decide in this PR, write it in Notes, and keep the authorizer audience matching.
- `infra/lib/private-area-stack.ts` additions:
  - `NodejsFunction` with entry `services/private-api/src/handler.ts`, `Runtime.NODEJS_24_X`, `Architecture.ARM_64`, 128 MB, a 5 s timeout, an explicit `LogGroup` (14 days, `DESTROY`), and `reservedConcurrentExecutions` left unset. Reserved concurrency arrives with the LLM in Slice 3; this Lambda does no paid work.
  - `HttpApi` with `HttpUserPoolAuthorizer` (pool and client) as the **default authorizer**, so a new route can't be added unauthenticated by accident. One route: `GET /private` → `HttpLambdaIntegration`.
  - CORS: `allowOrigins` = site origins, `allowMethods: GET`, `allowHeaders: Authorization`. CORS preflight is answered by API Gateway itself, without the authorizer.
  - Default stage throttling (for example a 5 rps rate and a burst of 10) and access logging to a 14-day log group.
  - Output `ApiUrl`.
- Dependency: `esbuild` as an `infra` dev dependency. `NodejsFunction` needs it to bundle TypeScript plus `zod` for the Lambda runtime, which can't load `.ts` handlers. Without it, CDK falls back to Docker bundling, which isn't available in CI. Record this as D-024.
- Assertion tests:
  - every `AWS::ApiGatewayV2::Route` has `AuthorizationType: JWT` and an `AuthorizerId` (break-on-purpose test: remove the default authorizer and it goes red)
  - the authorizer's issuer is this pool and its audience is this client
  - the Lambda is arm64 / Node 24, and every log group has 14-day retention
  - the Lambda role's only inline policy statements are logging (no wildcard actions)
  - tags on every taggable resource
- CI smoke: read `PrivateAreaStack.ApiUrl` from `cdk-outputs.json`, then `curl -s -o /dev/null -w '%{http_code}' "$api/private"` must equal `401`. Retry like the existing loop.

### PR 3: Sign-in and private page (`slice-2/sign-in`)

- **SiteStack:** new optional prop `runtimeConfig?: Record<string, string>`. When it's set, add `Source.jsonData('config.json', runtimeConfig)` alongside `Source.asset(out)`. `bin/app.ts` passes `{ apiUrl, authDomain, userPoolClientId }` from `PrivateAreaStack`. Test: the deployment includes a second source when the prop is set. The values aren't secret (all three are visible to any browser), and nothing private enters the bucket (D-006 holds).
- `apps/web/src/lib/auth/`, pure where possible, each with unit tests:
  - `config.ts`: a zod `runtimeConfigSchema` and `loadRuntimeConfig()` (fetches `/config.json`; a missing file means "not configured", which is the case for local dev unless `apps/web/public/config.json` is created; add that path to `.gitignore`)
  - `pkce.ts`: verifier, S256 challenge, and state via Web Crypto (no dependency)
  - `urls.ts`: `buildAuthorizeUrl`, `buildLogoutUrl`, `callbackUrl(origin)`
  - `tokens.ts`: `exchangeCode()` POSTs to `<authDomain>/oauth2/token` and zod-parses the response; `saveSession`/`readSession`/`clearSession` in `sessionStorage`. Only the access and ID tokens and the expiry are stored. The refresh token is dropped, so a session lasts about an hour and then signs in again: less to protect, and the sign-in is one click.
- Pages (`'use client'` components inside static route files):
  - `app/private/page.tsx`: no session shows a "Sign in" button (saves the verifier and state, then redirects to managed login). With a session, it calls `GET <apiUrl>/private` and renders the content. A 401 clears the session and shows "Sign in" again. A "Sign out" button clears storage and redirects to the logout URL. `metadata.robots: noindex`.
  - `app/auth/callback/page.tsx`: checks `state`, exchanges the code, saves the session, and redirects to `/private/`. Errors render a message with a retry link.
  - The header nav stays public-only. A small "Private" link goes in the footer.
- Tests: unit tests for the auth lib (URL params, PKCE shape, state mismatch rejected, token schema rejects bad responses, expired sessions treated as absent) and a render test for the signed-out `/private/` state, using the existing `renderToStaticMarkup` pattern.
- CI smoke: add `/private/` and `/config.json` to the path loop.
- If this runs long, split it: 3a is SiteStack `config.json` plus `lib/auth`; 3b is the pages.

### Docs (folded into the PRs they relate to)

- DECISIONS additions:
  - **D-022 — Cognito managed login with authorization code + PKCE, TOTP MFA required, owner user in CDK** (PR 1). Why: the hosted page handles first-login password change and MFA enrollment, the static site needs no auth dependency, and `CfnUserPoolUser` keeps the one user in IaC. Tradeoff: sign-in leaves `quathomas.com` for an `amazoncognito.com` page, and the feature plan is Essentials. Revisit: a custom auth domain if the redirect matters.
  - **D-023 — Browser config comes from a deploy-time `config.json`, and the API is called on its `execute-api` URL with CORS** (PR 3, with the CORS half noted in PR 2). Why: the web build runs before deploy, so it can't know stack outputs. Routing through CloudFront would hit the distribution's 403/404 error mapping. Revisit: in Slice 4, when streaming goes through CloudFront.
  - **D-024 — Lambdas bundle with `NodejsFunction` and `esbuild`** (PR 2). Why: Lambda can't run `.ts` directly (unlike the CDK app, D-018), and local esbuild avoids Docker in CI.
  - **D-025 — Smoke tests stay curl in the deploy job; Playwright waits for a browser flow worth testing** (PR 2). This departs from the CLAUDE.md testing table, so CLAUDE.md gets a note.
  - Tokens live in `sessionStorage` without a refresh token (inside D-022). Tradeoff: XSS could read a token that lasts up to an hour. The site has no third-party scripts or user content.
- CLAUDE.md: add `services/private-api/` to the layout example, `OWNER_EMAIL` and `AUTH_DOMAIN_PREFIX` to the synth note, and the Playwright note from D-025.
- SLICES.md: "Progress and the PR breakdown are in `docs/SLICE_2_PLAN.md`."

## IAM and cost impact

- **IAM (new):**
  - The Lambda execution role, created by CDK, with only write access to its own log group.
  - A Lambda resource-based permission letting this HTTP API invoke the function (`HttpLambdaIntegration`).
  - Cognito and the JWT authorizer need no IAM.
  - No change to the deploy role or the bootstrap roles.
  - Each item is explained in its PR description.
- **Cost:**
  - Cognito Essentials is within the MAU free tier for one user, and TOTP and the default email sender are free. **Verify current Cognito pricing in PR 1.**
  - HTTP API: $1.00 per million requests. Lambda is free tier at this volume. Log groups are pennies at 14-day retention.
  - Nothing is billed hourly while idle, so no new recurring cost.
  - No SMS and no SES.

## Verification

- Locally for each PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter infra synth` all pass, with `OWNER_EMAIL` and `AUTH_DOMAIN_PREFIX` in `infra/.env`.
- Prove the key tests red once and record it in Notes:
  - setting `selfSignUpEnabled: true` fails the self-signup test (PR 1)
  - removing the default authorizer fails the "every route has JWT" test (PR 2)
- `pnpm --filter infra exec cdk diff` (read-only) before each merge shows no unexpected replacement of SiteStack resources.
- After PR 1 deploys: the owner gets the temporary-password email, signs in at the managed login URL, sets a password, and enrolls TOTP.
- After PR 2 deploys: the CI smoke step reports 401 from `<ApiUrl>/private` with no token. A manual `curl -H 'Authorization: Bearer garbage'` also returns 401.
- After PR 3 deploys:
  - On `https://quathomas.com/private/`, the owner signs in with password + TOTP and sees the private content with their identity.
  - Signing out returns the page to "Sign in".
  - A fresh incognito window shows only the "Sign in" button and no content.
