# Slice 1: Content site — plan

## Progress checklist

**Status (2026-10-27):** Plan merged (#12). PR 1 is open for review (branch `slice-1/layout`). **Next: merge PR 1, then start PR 2.**

- [x] **PR 1: Layout and pages** — PR open, not merged
  - [x] shadcn/ui init (`components.json`, `cn` helper, theme tokens) plus only the primitives used
  - [x] Site header and footer in `layout.tsx`, with a metadata title template
  - [x] Home, About, and `not-found` pages with marked placeholder copy
  - [x] Render tests replace the "Hello" test
  - [x] CI smoke test also checks `/about/`
- [ ] **PR 2: MDX pipeline**
  - [ ] `projectFrontmatterSchema` in `packages/shared`, with unit tests
  - [ ] `apps/web/src/lib/projects.ts` loader, with sort and draft-filter tests
  - [ ] `@next/mdx` config, `mdx-components.tsx`, and typography styles
  - [ ] `/projects/` index and `/projects/[slug]/` pages; Home lists the latest 3
  - [ ] `content/projects/portfolio-site.mdx` stub; a test proves every write-up parses
  - [ ] CI smoke test also checks `/projects/` and `/projects/portfolio-site/`
- [ ] **PR 3: Content-only write-up**
  - [ ] An MDX-only change (no code) merges and shows up on the live site
- [ ] **Docs** (see "Docs" section below)
  - [x] D-021 (shadcn/ui as the stock template)
  - [ ] D-020 (MDX approach), added in PR 2
  - [ ] CLAUDE.md: shadcn `components/ui/` and the `content/projects` frontmatter rule
  - [x] SLICES.md points to this plan
- [ ] **Verification** (see "Verification" section below)

**Notes from work so far**

- Slice 0.5 is done (#10): the site serves `https://quathomas.com` and `www`.
- PR 1 departures:
  - shadcn's generated `cn` imports a third-party `cn` npm package. `src/lib/utils.ts` uses `clsx` + `tailwind-merge` instead (D-021).
  - `apps/web/tsconfig.json` gained an `@/*` path alias (shadcn requires one), and `apps/web/vitest.config.ts` mirrors it so tests resolve it.
  - `next/link` drops the trailing slash when rendered outside the Next build, so tests match `/projects/?`. The built HTML has the slash.
- Owner choices: shadcn/ui + `@tailwindcss/typography` as the stock template, and placeholder Home/About copy that the owner replaces later.

**Instructions for agents**

- Read this file and `CLAUDE.md` first. Work on the first unchecked PR only.
- Start each PR on a new branch (`slice-1/<topic>`) from an up-to-date `main`. Never commit to `main`.
- **Check off items in this checklist as you complete them**, in the same branch as the work, and update the status line. Mark a PR merged only after it actually merges.
- Record any departure from the plan under "Notes from work so far".
- Items marked "Owner" are done by the repo owner. Ask them to confirm before checking these off.

## Context

Slice 0 and 0.5 left a "Hello" page deployed by CI to `https://quathomas.com`. Slice 1 (docs/SLICES.md) turns it into the content site: a stock-template layout, Home, About, and Projects pages, and MDX project write-ups. The first write-up is a stub about this project.

**Done when:** every page renders on the live site and a new MDX file shows up after a push.

What's already in place:

- `apps/web` is Next 16.3 with `output: 'export'`, `trailingSlash: true`, and Tailwind v4. `apps/web/src/app/page.test.tsx` shows the render-test pattern (`renderToStaticMarkup`).
- SiteStack's CloudFront Function rewrites `/path/` to `/path/index.html`, and 403/404 map to `/404.html` (`infra/lib/site-stack.ts`). New routes need **no infra change**.
- `apps/web/AGENTS.md`: this Next version differs from training data. Read `apps/web/node_modules/next/dist/docs/` before writing Next code, especially `01-app/02-guides/mdx.md` (dynamic imports, frontmatter, Turbopack plugin strings, typography).

## PRs (each about 300 lines or fewer, excluding the lockfile and generated shadcn code)

### PR 1: Layout and pages (`slice-1/layout`)

- `shadcn init` for Tailwind v4: `components.json`, `src/lib/utils.ts` (`cn`), and theme tokens in `globals.css`. Add only the primitives the pages use, probably `button` and `card`. List each dependency and its reason in the PR (`clsx`, `tailwind-merge`, `class-variance-authority`, and whatever the added components pull in).
- `src/components/site-header.tsx` (site name and links to Home, Projects, and About) and `src/components/site-footer.tsx`, wired into `layout.tsx`. Set the metadata title template to `%s · Qua Thomas`.
- Pages:
  - `app/page.tsx`: intro placeholder and a link to Projects
  - `app/about/page.tsx`: placeholder bio
  - `app/not-found.tsx`: so `out/404.html` uses the site layout
- Mark placeholder copy with `{/* PLACEHOLDER: owner replaces */}` so it's easy to find with grep.
- ESLint: the existing route-file override (`{page,layout,not-found}.tsx`) already allows default exports there. Components use named exports. Generated shadcn files may need lint fixes to meet the strict config; keep their behavior unchanged.
- Tests: render tests for Home (h1 and the Projects link), About, and the header nav links.
- CI smoke test: after the existing root check, also curl `/about/`.

### PR 2: MDX pipeline (`slice-1/mdx-projects`)

- **Check this risk first:** importing `.mdx` from outside `apps/web`. Next infers the Turbopack root from the repo-root lockfile, which should allow it. If it doesn't, set `turbopack.root` and record that in Notes.
- `content/projects/portfolio-site.mdx`: the stub write-up. Its YAML frontmatter has `title`, `summary`, `date` (ISO), `tags`, and an optional `draft`. Plain YAML keeps the raw files readable for the assistant later (Slice 3, D-010).
- `packages/shared/src/project-frontmatter.ts`: a zod `projectFrontmatterSchema` and its inferred type, exported from `index.ts`. Unit tests cover the valid, missing-field, and bad-date cases. It lives in `shared` because Slice 3 reads the same files.
- `apps/web/src/lib/projects.ts`:
  - `listProjectSlugs()` reads `content/projects/*.mdx` with `node:fs` at build time
  - `getProject(slug)` dynamically imports the `.mdx` module and zod-parses its `frontmatter` export
  - `getAllProjects()` drops drafts and sorts newest first
  - The sort and filter helpers are pure, split out, and unit-tested
- Rendering follows the Next MDX guide's "dynamic imports" pattern:
  - `@next/mdx` in `next.config.ts`, with `pageExtensions` unchanged (MDX lives only in `content/`)
  - `remark-frontmatter` and `remark-mdx-frontmatter`, passed as **strings** because Turbopack requires it
  - `src/mdx-components.tsx` (the required file convention)
  - `@tailwindcss/typography` (`prose`) for write-up styling
  - Deps: `@next/mdx`, `@mdx-js/loader`, `@mdx-js/react`, `@types/mdx`, `remark-frontmatter`, `remark-mdx-frontmatter`, `@tailwindcss/typography`
- Routes:
  - `app/projects/page.tsx` lists projects as cards (title, date, summary, tags)
  - `app/projects/[slug]/page.tsx` has `generateStaticParams` from `listProjectSlugs()`, `dynamicParams = false`, and `generateMetadata`
  - Home shows the latest 3 projects
- Tests: schema tests (shared), sort and draft-filter tests, and a test that every file in `content/projects` parses. That last one turns CI red when a write-up has bad frontmatter.
- CI smoke test: also curl `/projects/` and `/projects/portfolio-site/`.
- If this runs long, split it: 2a is the schema, loader, and tests; 2b is the MDX config and routes.

### PR 3: Content-only write-up (`slice-1/first-writeup`)

- Flesh out `portfolio-site.mdx` with what Slice 0 and 0.5 actually built. It can still read as a draft.
- The PR touches only `content/` (and this checklist). After it merges, the updated page and its card on `/projects/` show up on the live site. This proves the done-when.
- Optional: replace the placeholder Home and About copy if the owner has provided it.

### Docs (folded into the PRs they relate to)

- DECISIONS additions:
  - **D-020 — MDX through `@next/mdx` with YAML frontmatter, validated by a zod schema in `packages/shared`** (PR 2). Why: it's the supported Next path, costs nothing at runtime on a static export, and keeps the raw files readable for the assistant. Tradeoff: frontmatter needs two remark plugins, and Turbopack only accepts plugins with serializable options. Revisit: if the content outgrows a folder of files and needs a content layer.
  - **D-021 — shadcn/ui is the "stock template", time-boxed to one afternoon** (PR 1). Why: components are copied into the repo instead of added as a dependency, and shadcn/ui is already in the CLAUDE.md stack. Tradeoff: the look is generic, which SPEC accepts.
- CLAUDE.md: add `apps/web/src/components/ui/` (shadcn) to the layout, and note that `content/projects/*.mdx` needs valid frontmatter (a test enforces it).

## IAM and cost impact

- **IAM:** none. No new AWS resources and no changes to roles or policies.
- **Cost:** none to speak of. A few more objects in the existing bucket, and invalidations stay within the free 1,000 paths a month.

## Verification

- Locally for each PR: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter infra synth` all pass. `apps/web/out` contains `about/index.html`, `projects/index.html`, `projects/portfolio-site/index.html`, and `404.html`.
- Break the frontmatter on purpose (remove `title`) and confirm the content test goes red.
- After each merge, the CI smoke test returns 200 for every listed path. An unknown path such as `/projects/nope/` shows the styled 404 on `https://quathomas.com`.
- After PR 3 merges, the updated write-up is live with no code change.
