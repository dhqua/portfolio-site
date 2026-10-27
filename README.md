# portfolio-site

My personal site and project platform, live at **[quathomas.com](https://quathomas.com)**.

It hosts write-ups of my monthly projects and is built to host future apps, some public and some private. It will also include an "Ask about my work" assistant that answers questions grounded in those write-ups. The site is built as a serverless AWS project: all infrastructure is code, every change goes through CI, and nothing is created in the console.

## Status

The site is built in thin, deployable slices ([docs/SLICES.md](docs/SLICES.md)).

| Slice | What                                                         | Status  |
| ----- | ------------------------------------------------------------ | ------- |
| 0     | Walking skeleton: monorepo, CI/CD, S3 + CloudFront           | Done    |
| 0.5   | Custom domain over HTTPS                                     | Done    |
| 1     | Content site: Home, About, Projects (MDX)                    | Next    |
| 2     | Private area behind sign-in                                  | Planned |
| 3–6   | AI assistant: grounded answers, streaming, guardrails, evals | Planned |
| 7     | Architecture diagram and final write-up                      | Planned |

## Architecture

```
          Browser
             │  HTTPS (TLS 1.2+)
             ▼
   Route 53 ──► CloudFront ──(Origin Access Control)──► S3 (private)
             │                                          static Next.js export
             │
             └─► (later) API Gateway + Lambda ──► Bedrock, DynamoDB
                          Cognito JWT auth for private routes
```

- **Static site:** Next.js App Router with `output: 'export'`. It's served from a private S3 bucket that only CloudFront can read, through Origin Access Control. The bucket blocks all public access and enforces encryption and TLS.
- **Domain and TLS:** Route 53 DNS and a DNS-validated ACM certificate, with a minimum of TLS 1.2. HTTP redirects to HTTPS.
- **Dynamic features (planned):** Lambda behind API Gateway and Lambda function URLs, Cognito for sign-in, Bedrock for the assistant, and DynamoDB for rate limiting.
- **Cost guardrails:** AWS Budgets alerts are defined in code. Nothing is billed hourly while idle: no NAT gateways, load balancers, or always-on servers.

The reasoning behind each choice is in [docs/DECISIONS.md](docs/DECISIONS.md).

## Tech stack

| Area     | Tools                                                          |
| -------- | -------------------------------------------------------------- |
| Language | TypeScript (strict) on Node.js 24, pnpm workspaces             |
| Web      | Next.js (static export), React, Tailwind CSS                   |
| Infra    | AWS CDK v2: S3, CloudFront, Route 53, ACM, AWS Budgets         |
| Testing  | Vitest, CDK assertions, Playwright (planned smoke tests)       |
| CI/CD    | GitHub Actions, deploying to AWS through OIDC (no stored keys) |

## Repository layout

```
apps/web/          Next.js site
packages/shared/   Shared types and zod schemas
infra/             CDK app, stacks, and assertion tests
docs/              Spec, slice plan, and decision log
```

Planned: `services/` (Lambda handlers), `content/projects/` (MDX write-ups), and `evals/` (assistant eval set).

## Local development

Prerequisites: Node.js 24 and Corepack (`corepack enable`), which provides the pinned pnpm version.

```sh
pnpm install
pnpm dev          # run the site locally
pnpm build        # build every workspace package
pnpm lint         # ESLint + Prettier check
pnpm format       # Prettier write
pnpm typecheck
pnpm test
```

To synthesize the CloudFormation templates locally, copy `infra/.env.example` to `infra/.env` (gitignored) and fill it in, then run:

```sh
pnpm --filter infra synth
```

## How changes ship

- **Trunk-based:** all work happens on short-lived branches and is squash-merged into `main` by pull request.
- **CI checks:** every pull request runs lint, typecheck, unit and infrastructure tests, the web build, and `cdk synth`. A failing check blocks merge.
- **Automatic deploys:** each merge to `main` deploys automatically. GitHub Actions gets short-lived AWS credentials through OpenID Connect, deploys with CDK, then smoke-tests the live site.
- **Infrastructure tests:** CDK assertion tests guard the security properties, including a private bucket, Origin Access Control, log retention, a tightly scoped deploy role, and tags on every resource.

## Documentation

- [docs/SPEC.md](docs/SPEC.md): goals, scope, and acceptance criteria
- [docs/SLICES.md](docs/SLICES.md): build order and roadmap
- [docs/DECISIONS.md](docs/DECISIONS.md): architecture decision log
- [CLAUDE.md](CLAUDE.md): conventions for AI coding agents working in this repo

## License

[MIT](LICENSE)
