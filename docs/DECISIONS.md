# Decisions

Lightweight decision log. Add an entry whenever you make a choice someone could reasonably question. Mark a decision **Superseded** instead of deleting it.

Format: **ID — Decision** · Status · Date, followed by why, the tradeoff, and when to revisit.

---

**D-001 — Host everything on AWS** · Accepted · 2026-09-23
- **Why:** Build AWS depth before the December conference; I already use Azure at work.
- **Tradeoff:** Slower than Vercel and more setup (IAM, DNS, certificates).

**D-002 — Serverless-first (S3, CloudFront, Lambda, DynamoDB)** · Accepted · 2026-09-23
- **Why:** Near-zero idle cost, and these are the core services worth learning.
- **Revisit:** When an app needs long-running compute. Then use Fargate, but only with approval since it brings load balancer and NAT costs.

**D-003 — AWS CDK in TypeScript instead of Terraform** · Accepted · 2026-09-23
- **Why:** Same language as the app, testable with assertions, AWS-native, and coding agents handle it well.
- **Tradeoff:** AWS-only.
- **Revisit:** A later monthly project in Terraform or OpenTofu to get the multi-cloud skill.

**D-004 — Next.js static export instead of Amplify or SSR** · Accepted · 2026-09-23
- **Why:** Amplify doesn't support Next.js streaming and hides the underlying services. Static files on S3 + CloudFront are simple and cheap.
- **Tradeoff:** No SSR, ISR, or middleware. Dynamic features go through Lambda APIs.

**D-005 — Bedrock for LLM access** · **Proposed** · 2026-09-23
- **Why:** AWS-native, authenticated with IAM (no API key to manage), more AWS learning, and Bedrock usage counts toward earning free-tier credits.
- **Tradeoff:** New models can arrive later than on the Anthropic API, and model access must be enabled per region.
- **Mitigation:** Put the model behind a small `LlmClient` interface so switching providers is a config change.

**D-006 — Private content only through the authenticated API** · Accepted · 2026-09-23
- **Why:** A static export can't gate pages, so anything in the public bucket is effectively public.

**D-007 — Cognito for auth, self-signup disabled** · Accepted · 2026-09-23
- **Why:** AWS-native, and the JWTs work with API Gateway authorizers. Only I need to sign in.

**D-008 — Cost guardrails from day one** · Accepted · 2026-09-23
- **What:** Paid-plan account; Budgets alerts at $10 and $25; no idle-billed resources without approval; Lambda concurrency cap and token limits on the assistant.

**D-009 — Monorepo with pnpm workspaces** · Accepted · 2026-09-23
- **Why:** One place for web, services, infra, and docs, which also gives the coding agent full context.

**D-010 — Context-stuffing before retrieval** · Accepted · 2026-09-23
- **Why:** A handful of write-ups fits in the context window. Retrieval adds complexity without improving results at this size.
- **Revisit:** When the corpus outgrows the context window, costs rise, or evals show degraded answers.

**D-011 — Rate limiting in DynamoDB instead of AWS WAF** · Accepted · 2026-09-23
- **Why:** WAF adds a fixed monthly cost, while a DynamoDB counter with TTL is essentially free at this scale.
- **Revisit:** If there's real abuse or bot traffic.

**D-012 — GitHub Actions with OIDC; only CI deploys to prod** · Accepted · 2026-09-23
- **Why:** No long-lived AWS keys, and every deploy is reproducible and reviewed.
