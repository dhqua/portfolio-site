# Slice 0: Walking skeleton — plan

## Progress checklist

**Status (2026-10-01):** Step 0, PR 1, and PR 2 are done. PR 3 is open for review (branch `slice-0/infra-site-stack`). **Next: merge PR 3, then PR 4.**

- [x] **Step 0**
  - [x] Node 24 + `corepack enable` (pnpm 12.6.0)
  - [x] Branch protection on `main` (ruleset `main-trunk`, admin bypass allowed, squash-only)
  - [x] `aws sso login` (owner confirmed 2026-10-01)
- [x] **PR 1: Monorepo tooling** — merged (#1)
- [x] **PR 2: `apps/web` "Hello" page** — merged (#2)
- [ ] **PR 3: `infra`: SiteStack + Budgets** — PR open, not merged
  - [x] `infra` package, `bin/app.ts` config parsing and tags, `synth` script, `'infra'` in Vitest projects
  - [x] SiteStack: private S3, CloudFront + OAC, rewrite function, BucketDeployment, Budgets, `DistributionUrl` output
  - [x] Assertion tests; removing `blockPublicAccess` turns a test red
  - [x] Domain hook moved to Slice 0.5 (see notes)
- [ ] **PR 4: `infra`: GitHubOidcStack**
  - [ ] Owner runs `cdk bootstrap` + `cdk deploy GitHubOidcStack` locally
  - [ ] Owner sets repo variables `AWS_DEPLOY_ROLE_ARN` and `BUDGET_ALERT_EMAIL`
- [ ] **PR 5: CI/CD** (branch protection already exists; only add the required `ci` check)
- [ ] **Docs** (see "Docs" section below)
  - [ ] DECISIONS additions (D-015, D-017, D-018 added in PR 3; D-016 comes with PR 4)
  - [x] SPEC open question "Public or private repo?" resolved as public
  - [x] CLAUDE.md: `pnpm build` / `pnpm format` commands, "imports this file" line fixed
  - [ ] CLAUDE.md: one-time bootstrap note
- [ ] **Verification** (see "Verification" section below)

**Notes from work so far**

- Trunk-based development was added (D-013): no direct commits to `main`; branch `slice-0/<topic>` from `main` and squash-merge by PR.
- D-013 and D-014 are taken (trunk-based; toolchain pins), so this plan's D-013/14/15 become **D-015/16/17**.
- TypeScript is pinned to 6.0 (typescript-eslint limit), pnpm is 12.6, and Vitest uses `vitest.config.ts` `test.projects` instead of `vitest.workspace.ts`. PR 3 must add `'infra'` to those projects and give `infra` a `synth` script.
- PR 3 departures:
  - **Domain hook deferred to Slice 0.5**, along with the `SITE_DOMAIN` env var. A hosted-zone lookup needs a real account and context, and untested dead code isn't worth the lines.
  - The CDK app runs with plain `node bin/app.ts` (Node 24 type stripping, no `tsx`). That needs `.ts` extensions on relative imports, so `tsconfig.base.json` gains `allowImportingTsExtensions` and `erasableSyntaxOnly`, and `packages/shared` imports were updated (D-018).
  - `infra/tsconfig.json` turns off `exactOptionalPropertyTypes`, because `aws-cdk-lib`'s types fail under it (D-018).
  - CloudFront maps both 403 and 404 to `/404.html` (S3 returns 403 for missing keys under OAC). The rewrite function also handles `/about` as well as `/about/`.
  - `CfnBudget` isn't reached by `Tags.of()`, so the stack copies its tags into `ResourceTags`. The app passes the tags as stack props for this reason.
  - `synth` requires `BUDGET_ALERT_EMAIL` to be set, including locally.
  - `infra/cdk.json` sets no CDK feature flags (`cdk synth` warns about 83 of them). Decide whether to adopt the recommended set before the first deploy in PR 5, because changing flags later can replace resources.

**Instructions for agents**

- Read this file and `CLAUDE.md` first. Work on the first unchecked PR only.
- Start each PR on a new branch from an up-to-date `main`. Never commit to `main`.
- **Check off items in this checklist as you complete them**, in the same branch as the work, and update the status line. Mark a PR merged only after it actually merges.
- Record any departure from the plan under "Notes from work so far".
- Items marked "Owner" are done by the repo owner. Ask them to confirm before checking these off.

## Context

The repo is empty apart from docs. Slice 0 (docs/SLICES.md) builds the skeleton that every later slice depends on: a pnpm monorepo with strict TS, lint, and tests, a CDK stack that serves a "Hello" page from private S3 through CloudFront, $10 and $25 Budgets alerts, and GitHub Actions deploying `main` through an OIDC role.

What we agreed:

- **No domain yet.** Ship on the default `https://xxxx.cloudfront.net` URL. The domain props stay optional in CDK, and adding Route 53 and ACM becomes a small follow-up PR ("Slice 0.5") once you register a domain.
- **Deploy role** can only assume the `cdk-hnb659fds-*` bootstrap roles, and only for pushes to `main` on `dhqua/portfolio-site`.
- **Node:** `brew install node@24` + `corepack enable`. The repo pins versions through `.node-version` and `packageManager`.

**Revised done-when:** a push to `main` goes live at the CloudFront URL, a failing check blocks merge, and a CDK assertion test proves the bucket is private. The custom-domain part moves to Slice 0.5.

## Step 0: You do this locally (no PR)

1. `brew install node@24 && brew link --overwrite node@24`. This replaces the Node v8 in `/usr/local/bin`. Then run `corepack enable`.
2. `aws sso login --profile AdministratorAccess-345226917840` so the credentials work for the bootstrap in PR 4.

## PRs (each about 300 lines or fewer, excluding the lockfile)

### PR 1: Monorepo tooling

- Root `package.json`: `packageManager: pnpm@<latest 10.x>`, `engines.node: >=24`, and the scripts `dev`, `build`, `lint`, `typecheck`, `test`, `format`, `synth`.
- `pnpm-workspace.yaml` (`apps/*`, `services/*`, `packages/*`, `infra`) and `.node-version` (`24`).
- `tsconfig.base.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `verbatimModuleSyntax`.
- ESLint flat config (`typescript-eslint` strict-type-checked, `no-explicit-any` set to error, a rule enforcing named exports) and Prettier.
- `vitest.workspace.ts`.
- `packages/shared`: a placeholder `parse-env.ts` (a zod env parser that infra reuses) with a unit test.
- Deps, with the reasons written in the PR: typescript, eslint, typescript-eslint, prettier, vitest, zod.

### PR 2: `apps/web` "Hello" page

- Next.js App Router with `output: 'export'`, `images.unoptimized`, `trailingSlash: true` (S3 serves `/about/index.html` cleanly), and Tailwind.
- One page: "Hello". shadcn/ui and MDX wait until Slice 1.
- `pnpm build` writes to `apps/web/out`. Include one trivial Vitest render test, or skip it to keep the PR small. Lint and typecheck still cover the code.

### PR 3: `infra`: SiteStack + Budgets

- `infra/bin/app.ts` parses config with zod: `ENV` (default `prod`), `BUDGET_ALERT_EMAIL`, and optional `SITE_DOMAIN`. It applies `Tags.of(app)` for `project=portfolio-site` and `env`. Account and region come from `CDK_DEFAULT_ACCOUNT` and `us-east-1`, with nothing hardcoded.
- `infra/lib/site-stack.ts`:
  - **S3:** `BlockPublicAccess.BLOCK_ALL`, S3-managed encryption, `enforceSSL`, `RemovalPolicy.RETAIN`. The content can be rebuilt, but RETAIN avoids the autoDelete custom-resource Lambda. This gets a DECISIONS entry.
  - **CloudFront:** `S3BucketOrigin.withOriginAccessControl`, redirect to HTTPS, `defaultRootObject: index.html`, a 404 error response mapped to `/404.html`, and a CloudFront Function that rewrites `/path/` to `/path/index.html`.
  - **`BucketDeployment`** from `apps/web/out`, with a distribution invalidation and an explicit log group at 14-day retention.
  - **Budgets:** two `CfnBudget` monthly cost budgets at $10 and $25 that email `BUDGET_ALERT_EMAIL` at 80% actual and 100% forecast.
  - **Domain hook:** when `SITE_DOMAIN` is set, look up the hosted zone and add an ACM cert and alias records. This stays unused until Slice 0.5. If it pushes the PR over 300 lines, it moves to 0.5 entirely.
  - **Output:** `DistributionUrl`.
- `infra/test/site-stack.test.ts` uses CDK assertions to check:
  - the bucket blocks all public access and is encrypted
  - the bucket policy grants `s3:GetObject` only to `cloudfront.amazonaws.com` with `AWS:SourceArn` set to this distribution
  - an OAC exists
  - every log group has 14-day retention
  - both budgets exist at 10 and 25
  - every resource carries the `project` and `env` tags
- If this runs long, split it: 3a is the site and its tests, 3b is Budgets.

### PR 4: `infra`: GitHubOidcStack (the bootstrap, deployed manually once)

- Creates the GitHub OIDC provider (`token.actions.githubusercontent.com`) and a `portfolio-site-deploy` role.
  - Trust: `aud = sts.amazonaws.com`, `sub = repo:dhqua/portfolio-site:ref:refs/heads/main`.
  - Policy: `sts:AssumeRole` on `arn:aws:iam::<acct>:role/cdk-hnb659fds-*-<acct>-us-east-1`. The wildcard gets a comment explaining that it scopes to the CDK bootstrap roles only.
- Assertion tests cover the trust conditions and confirm the policy contains no action other than `sts:AssumeRole`.
- **You run this once, locally, with the SSO profile.** It's the only local deploy, and it's needed because CI can't create its own role:
  ```
  pnpm --filter infra exec cdk bootstrap aws://<acct>/us-east-1
  pnpm --filter infra exec cdk deploy GitHubOidcStack
  ```
- Then set GitHub repo variables: `AWS_DEPLOY_ROLE_ARN` (from the stack output) and `BUDGET_ALERT_EMAIL`. These are variables, not secrets, since neither value is secret.

### PR 5: CI/CD

- `.github/workflows/ci.yml` runs on PRs and on pushes to main: setup-node from `.node-version`, a pnpm cache, then `install --frozen-lockfile`, lint, typecheck, test, web build, and synth.
- `.github/workflows/deploy.yml` runs on push to `main` after CI passes, with `permissions: id-token: write, contents: read` and `concurrency: deploy-prod`. It runs `aws-actions/configure-aws-credentials`, then `cdk deploy SiteStack --require-approval never`, then a curl check that the CloudFront URL returns 200.
- Branch protection on `main` requires a PR and the `ci` check to pass, and blocks force-push. The repo is public, so this is free. You enable it in Settings, or I run it through `gh api` once you approve.

### Docs (folded into the PRs they relate to)

- DECISIONS additions:
  - D-013: CloudFront URL until the domain exists
  - D-014: the deploy role assumes CDK bootstrap roles, and the bootstrap stack is deployed manually
  - D-015: the site bucket uses RETAIN
  - D-005 stays Proposed
- SPEC open question "Public or private repo?" is resolved as public.
- CLAUDE.md commands: add `pnpm build` and `pnpm format`, and note the one-time bootstrap. Also fix its "imports this file" line.

## IAM and cost impact

- **IAM:** one OIDC provider and one deploy role, scoped to the main branch and CDK bootstrap roles. CDK bootstrap roles are standard. The BucketDeployment Lambda role is created by CDK with grants.
- **Cost:** S3 and CloudFront cost pennies at low traffic, the Lambda is charged per invoke, and the budgets fall within AWS Budgets' free allowance. Nothing is billed hourly while idle. The later Slice 0.5 adds a Route 53 hosted zone at **$0.50/mo**, plus the domain registration fee.

## Verification

- Locally for each PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter infra synth` all pass.
- The PR 3 tests fail if `blockPublicAccess` is removed. We break it on purpose once to prove this. (Done 2026-10-01: the "blocks all public access" test fails.)
- After PR 5: a PR with a deliberate lint error shows a red check and can't be merged. A merge to `main` deploys, and the CloudFront URL shows "Hello".
- The Budgets console shows both budgets. Confirm the email subscription if AWS asks you to.
