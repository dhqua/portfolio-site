# CLAUDE.md

Instructions for AI coding agents working in this repo. `CLAUDE.md` imports this file

## Read first
- `docs/SPEC.md`: what we're building and why
- `docs/SLICES.md`: build order and the current slice
- `docs/DECISIONS.md`: why things are the way they are (don't re-litigate these without flagging it)

## Stack
- TypeScript (strict) everywhere, Node.js 24 LTS, pnpm workspaces
- **Web:** Next.js App Router with `output: 'export'` (static), Tailwind, shadcn/ui, MDX content
- **Services:** AWS Lambda (Node.js, arm64), one folder per function
- **Infra:** AWS CDK v2 (TypeScript), region `us-east-1`
- **AWS services:** S3 + CloudFront (OAC), Route 53, ACM, Lambda (function URLs with response streaming), API Gateway HTTP API, Cognito, DynamoDB (on-demand), Bedrock, SSM Parameter Store, AWS Budgets
- **Tests:** Vitest, `aws-sdk-client-mock`, CDK assertions, Playwright (smoke test only)
- **CI/CD:** GitHub Actions, deploying through an OIDC-assumed IAM role

## Repo layout
```
apps/web/            Next.js site
services/<name>/     Lambda handlers
packages/shared/     shared types and zod schemas
infra/               CDK app and stacks
content/projects/    MDX write-ups (also the assistant's knowledge base)
evals/               assistant eval set and runner
docs/                SPEC.md, SLICES.md, DECISIONS.md
```

## Commands
Slice 0 creates these scripts. Keep this list accurate.
```
pnpm install
pnpm dev                    # run the site locally
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter infra synth
pnpm eval                   # run assistant evals
```
Only CI deploys to production. Don't run `cdk deploy` against prod locally.

## Workflow
1. Work on one slice or task at a time. Start by restating the goal, the acceptance criteria, and a short plan.
2. Stop and ask before anything that changes IAM permissions, deletes data, or adds recurring cost.
3. Write tests first or alongside the code. A task is not done until lint, typecheck, test, and synth all pass locally.
4. Keep diffs small: one concern per PR, about 300 changed lines or fewer (excluding lockfiles and generated code).
5. Don't add a dependency without stating why. Prefer the standard library and existing dependencies.
6. Append notable decisions to `docs/DECISIONS.md`. Update this file when commands or layout change.

## Code conventions
- No `any`. Use `unknown` and parse with zod at every boundary: HTTP bodies, env vars, and LLM output used as data.
- Keep handlers thin: parse input, call a pure function, format the response. Business logic lives in pure, unit-tested functions.
- Read config from env vars and validate it at startup. Never hardcode ARNs, account IDs, domains, or model IDs.
- Log structured JSON. Never log secrets, tokens, or full user prompts.
- Use named exports and kebab-case file names.

## Infrastructure rules
- Everything goes through CDK. No console-created resources.
- **Least privilege:** use CDK `grant*` methods. Any wildcard action or resource needs a comment justifying it, and every IAM change gets explained in the PR description.
- **Cost guard:** do not create NAT Gateways, load balancers, RDS, EC2, or anything else billed hourly while idle without my explicit approval.
- S3 buckets block public access, are encrypted, and are served only through CloudFront OAC.
- Set 14-day retention on every log group, and set `removalPolicy` deliberately on stateful resources.
- Tag all resources with `project` and `env`.
- Private content never goes in the public site bucket (D-006).

## Testing
| Layer | What | Tool |
|---|---|---|
| Unit | Pure logic: prompt building, retrieval, rate limiting | Vitest |
| Integration | Lambda handlers with mocked AWS SDK | Vitest + aws-sdk-client-mock |
| Infra | Security properties: private buckets, OAC, log retention, IAM scope | CDK assertions |
| Smoke | Deployed site loads; private API returns 401 without a token | Playwright, post-deploy |
| AI | Answer quality on the eval set; run whenever prompts or retrieval change | `pnpm eval` |

## Definition of done
- Acceptance criteria met and tests added.
- All checks green.
- Docs updated.
- PR description covers what changed, why, how it was tested, and the IAM and cost impact.
