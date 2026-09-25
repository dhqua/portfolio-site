# Slices

Each slice is thin, end to end, deployed, tested, and demoable. Finish one before starting the next. Park new ideas under "Later".

**Total estimate:** about 15 working days, targeting v1 live by mid-October.

---

## Prerequisite: AWS account setup (about 1 hour, done by me, not the agent)
- Create the account on the **Paid plan** (the Free plan auto-closes at 6 months).
- Turn on MFA for root; create an admin user through IAM Identity Center.
- Register the domain.

## Slice 0: Walking skeleton (days 1–3)
- Repo, pnpm workspaces, strict TypeScript, lint, format, Vitest, and CI.
- CDK stack: S3 + CloudFront (OAC) + Route 53 + ACM, with a "Hello" page.
- GitHub Actions deploys `main` through an OIDC role.
- AWS Budgets alerts at $10 and $25, defined in CDK.

**Done when:** a push to `main` goes live at `https://<domain>`, a failing check blocks merge, and a CDK assertion test proves the bucket is private.

## Slice 1: Content site (days 4–5)
- Stock template layout; Home, About, and Projects pages.
- MDX project pages. The first entry is this project's write-up (a stub for now).

**Done when:** all pages render on the live site and a new MDX file shows up after a push.

## Slice 2: Private area (days 6–7)
- Cognito user pool with self-signup disabled and one user (me).
- Sign-in page, plus an HTTP API with a JWT authorizer that returns private content.

**Done when:** I see private content after signing in, and an automated test gets 401 with no token.

## Slice 3: Assistant v0, private only (days 8–9)
- A Lambda calls the LLM with a system prompt plus every write-up in context (the corpus is small).
- A basic chat UI inside the private area, with no streaming yet.
- A reserved concurrency cap and max-token limits from day one.

**Done when:** I can ask a question and get a grounded answer, and handler tests pass with a mocked LLM client.

## Slice 4: Streaming (days 10–11)
- A Lambda function URL with response streaming, served through CloudFront.
- The UI renders tokens as they arrive.

**Done when:** answers visibly stream, and the first token arrives in about 3 seconds or less.

## Slice 5: Guardrails, then go public (days 12–13)
- A per-IP daily limit stored in DynamoDB with TTL.
- Input length validation, plus "I don't know" behavior for uncovered questions.
- Move the assistant to the public site.

**Done when:** a test shows the 21st request returns 429, and out-of-scope questions get declined.

## Slice 6: Evals and citations (days 14–15)
- Answers cite their source write-up.
- `evals/` holds 15 questions with expected answers, and `pnpm eval` runs in CI when prompts change.
- Add retrieval only if the evals or corpus size call for it (D-010).

**Done when:** the eval pass rate is at least 80%.

## Slice 7: Ship it (day 16)
- Architecture diagram and README.
- Final project write-up: what I built, decisions, costs, and lessons.
- Confirm actual cost in Cost Explorer.

**Done when:** it's shared publicly (LinkedIn or similar).

---

## Later (parking lot)
-
