# PR Review Checklist

> The goal is to understand the code, not just approve it. If you can't explain it, don't merge it.

## Before you read the diff (1 min)
- [ ] **Predict:** Which files should this touch, and roughly how?
- [ ] **Recall the spec:** What are the acceptance criteria, and did I write the key test cases?

## Review in risk order
1. **Blast radius:** read these line by line.
   - [ ] IAM: every permission justified, no unexplained `*`
   - [ ] `cdk diff`: nothing unexpectedly replaced or deleted
   - [ ] No secrets, no public exposure, no new idle-billed resources
2. **Correctness at the edges**
   - [ ] Input validated (zod), errors handled, timeouts set
   - [ ] Empty, malformed, and failure cases handled, including bad LLM output
3. **Tests**
   - [ ] They test behavior, not implementation details
   - [ ] Break the code on purpose; a test goes red
4. **Design fit**
   - [ ] Follows AGENTS.md and DECISIONS.md
   - [ ] No sneaky new dependency, abstraction, or pattern
5. **Style:** leave it to lint

## Before you merge
- [ ] **Explain-back:** I can explain this diff in 2 sentences without looking.
- [ ] **Interrogate:** asked "Why this over X?", "What breaks if Y fails?", or "What would you remove?"
- [ ] **Run it:** hit the endpoint, check the logs, look at the real output.
- [ ] **Small enough?** If not, ask for a smaller or simpler version.
- [ ] **PR note:** What I learned / what I pushed back on: ___

## Red flags: stop and slow down
- Approving faster than I could explain
- Can't say why an IAM permission exists
- Pasting errors into the agent before forming my own hypothesis
- PRs keep growing
