# Mission 25: Write the Docs That Don't Exist
**Tier:** Senior
**Time Estimate:** 90 minutes
**Goal:** Turn code-reading skill into reusable workflow references.
**The Concept:** Great internal docs are operational runbooks for the codebase.
**Design Intent Before You Read the Code:** These references are for doing work, not passive reading. Keep each action tied to a source path.
**Find It In The Code:** Use `README.md:22-43`, `package.json:5-16`, `prisma/schema.prisma:18-119`, `src/app/api/knowledge/search/route.ts:18-36`, `src/services/knowledgeEntryService.ts:39-231`, `src/repositories/knowledgeEntryRepository.ts:34-425`, and `src/tests`.

```ts
// A good workflow doc says where the boundary lives.
const session = await requireApiRole(request, "EDITOR"); // route boundary
const body = saveKnowledgeEntrySchema.parse(await request.json()); // validation boundary
const entry = await createDraftEntry(session.user, body); // business boundary
```

**The Aha Moment:** Documentation becomes useful when it tells you exactly where to act.
**Socratic Checkpoint:** Which command starts the app? Which route guards the feature? Which schema validates the payload? Which service owns product rules? Which repository owns persistence?
How to self-grade: strong answers cite one exact source range per answer.
**Connects To:** Ongoing feature work and code review.

## Doc 1: Junior Onboarding Checklist

- Copy `.env.example` values from `.env.example:1-4`.
- Use npm scripts from `package.json:5-16`.
- Seed demo data with the configured seed script in `prisma.config.ts:3-7`.
- Sign in with the demo accounts listed in `README.md:30-34`.
- First PR checklist: identify route, hook, service, repository, schema, and test touched by your change.

## Doc 2: Architecture Guide for New Engineers

Navigate by boundary: pages in `src/app`, client UI in `src/components`, client data hooks in `src/hooks`, API handlers in `src/app/api`, business rules in `src/services`, database access in `src/repositories`, validation in `src/lib/validation`, auth in `src/lib/auth`, and models in `prisma/schema.prisma:18-119`.

## Doc 3: Code Review Checklist

- Guard: compare with `src/lib/auth/apiAuth.ts:19-43`.
- Validate: compare with `src/lib/validation/knowledgeEntrySchemas.ts:23-71`.
- Delegate: compare route shape in `src/app/api/knowledge/route.ts:18-28`.
- Enforce rules: compare service checks in `src/services/knowledgeEntryService.ts:121-231`.
- Scope data: compare repository filters in `src/repositories/knowledgeEntryRepository.ts:56-156`.
- Refresh UI: compare invalidation in `src/hooks/useEntryMutations.ts:23-87`.
- Test risk: compare existing tests in `src/tests`.

## Doc 4: Debugging Playbook

- Login: trace `src/components/auth/login-form.tsx:67-97` -> `src/app/api/auth/login/route.ts:6-28` -> `src/services/authService.ts:18-50`.
- Search: trace `src/components/knowledge/search-dashboard.tsx:14-174` -> `src/hooks/useKnowledgeSearch.ts:14-33` -> `src/app/api/knowledge/search/route.ts:18-36` -> `src/repositories/knowledgeEntryRepository.ts:158-264`.
- Workspace: trace `src/components/knowledge/workspace-dashboard.tsx:354-466` -> `src/hooks/useWorkspaceEntries.ts:14-22` -> `src/app/api/knowledge/workspace/route.ts:18-31` -> `src/repositories/knowledgeEntryRepository.ts:116-156`.
- Curation: trace `src/components/knowledge/workspace-dashboard.tsx:275-348` -> `src/hooks/useEntryMutations.ts:70-87` -> `src/app/api/knowledge/[entryId]/curation/route.ts:24-36` -> `src/services/knowledgeEntryService.ts:197-231`.

## Doc 5: Change Playbook

1. Branch and run setup commands from `package.json:5-16`.
2. Change schema in `prisma/schema.prisma:18-119` only when persistence changes.
3. Change validation in `src/lib/validation/knowledgeEntrySchemas.ts:23-71`.
4. Change route guard/parsing in `src/app/api`.
5. Change product rule in `src/services/knowledgeEntryService.ts:39-231`.
6. Change data operation in `src/repositories/knowledgeEntryRepository.ts:34-425`.
7. Change hook in `src/hooks`.
8. Change UI in `src/components`.
9. Add or update tests under `src/tests`.

## Doc 6: Senior Ownership Notes

Monitor ranked search performance because SQL computes text vectors in `src/repositories/knowledgeEntryRepository.ts:198-229`. Monitor draft leakage because ownership filters live in `src/repositories/knowledgeEntryRepository.ts:116-127`. Monitor curation abuse because boosts are bounded in `src/lib/validation/knowledgeEntrySchemas.ts:60-64` and service rules restrict drafts in `src/services/knowledgeEntryService.ts:208-210`.

## Doc 7: Interview Walkthrough

Practice answer: "Knowledge Hub is a role-aware internal knowledge base. The App Router gates pages (`src/app/page.tsx:6-20`), React Query hooks fetch and mutate data (`src/hooks/useKnowledgeSearch.ts:14-33`, `src/hooks/useEntryMutations.ts:14-87`), route handlers validate and authorize (`src/app/api/knowledge/search/route.ts:18-36`), services own business rules (`src/services/knowledgeEntryService.ts:39-231`), repositories own Prisma and SQL (`src/repositories/knowledgeEntryRepository.ts:34-425`), and Prisma defines users, sessions, entries, tags, and audit logs (`prisma/schema.prisma:18-119`)."

