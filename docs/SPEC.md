# Personal Site + Project Platform — v1 Spec

**Status:** Draft · **Owner:** Qua · **Target:** v1 live by mid-October 2026

## Goal
A personal site on AWS that:
1. Showcases my monthly projects.
2. Can host future apps, some public and some private.
3. Includes one real AI feature: an "Ask about my work" assistant grounded in my project write-ups.

## Why
- Hands-on AWS depth before the December AWS conference.
- Portfolio proof for Sales Engineering / Solutions Architect roles: specs, tests, IaC, and architecture decisions, not just a UI.
- A reusable platform for the next 11 monthly projects.

## Users
- **Public visitor:** recruiter, hiring manager, peer.
- **Me (admin):** the only account that can reach private areas.

## v1 in scope
- Pages: Home, About, Projects index, and one page per project write-up (MDX).
- Custom domain over HTTPS.
- Sign-in (me only) to reach a private area.
- The assistant: streams answers grounded in my write-ups, cites which write-up it used, and says "I don't know" when a question isn't covered.
- Abuse and cost controls on the assistant.
- CI/CD with tests; all infrastructure as code.

## Out of scope for v1
- CMS or admin UI (content is MDX in the repo).
- Comments, newsletter, analytics beyond CloudWatch.
- Public sign-up or multiple users.
- Custom visual design (use a stock template; time-box styling to one afternoon).
- Actually hosting a second app (the platform must allow it, not include it).
- Vector database (start simple; see D-010).

## Acceptance criteria
1. `https://<domain>` serves the site over HTTPS. All infrastructure deploys from `main` through CI with no console clicks.
2. Private content is unreachable without sign-in. An automated test calls the private API with no token and gets 401.
3. The assistant starts streaming within about 3 seconds, answers from write-ups with a citation, and declines questions the write-ups don't cover. It passes at least 80% of a 15-question eval set.
4. Abuse controls work: a per-IP daily limit (starting at 20 questions), a Lambda concurrency cap, and max token limits. An automated test confirms the over-limit request gets 429. AWS Budgets alerts fire at $10 and $25.
5. CI blocks merge unless lint, typecheck, tests, `cdk synth`, and CDK assertion tests all pass.
6. Monthly AWS cost at low traffic is $10 or less, confirmed in Cost Explorer after the first full month.

## Non-functional requirements
- **Security:** least-privilege IAM; no long-lived AWS keys (CI uses GitHub OIDC); secrets in SSM Parameter Store or Secrets Manager; S3 is private and reachable only through CloudFront.
- **Maintainability:** TypeScript strict everywhere, one repo, small PRs.
- **Observability:** structured JSON logs with 14-day retention.

## Risks
| Risk | Mitigation |
|---|---|
| Design scope creep | Stock template, one-afternoon time-box |
| LLM cost abuse | Acceptance criterion 4 controls, plus Budgets |
| A static site can't gate pages | Private content is served only through the authenticated API (D-006) |
| Tutorial hell | Walking skeleton live by day 3; learn just-in-time |

## Open questions
- Domain name?
- Bedrock or Anthropic API (D-005)?
- Public or private GitHub repo?
