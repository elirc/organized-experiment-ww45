# Tier 3 Senior Missions

### Mission 18: Reverse-Engineer the Architecture Decisions
**Tier:** Senior
**Time Estimate:** 60 minutes
**Goal:** Infer why the app is split into routes, services, repositories, and validation.
**The Concept:** Architecture is a knowledge workflow: intake desk, policy review, shelf update, audit trail.
**Design Intent Before You Read the Code:** Boundaries should isolate risk. If rules are duplicated randomly, security and workflow bugs grow.
**Find It In The Code:** `src/app/api/knowledge/route.ts:18-28`, `src/services/knowledgeEntryService.ts:83-118`, `src/repositories/knowledgeEntryRepository.ts:266-301`, `src/repositories/auditLogRepository.ts:16-20`.

```ts
return db.$transaction(async (transaction) => {
  const tags = await upsertTagsByNames(transaction, input.tags); // same transaction as entry
  const entry = await createKnowledgeEntry(transaction, { ... }); // write domain record
  await createAuditLog(transaction, { action: "knowledgeEntry.created", ... }); // write audit record
});
```

**The Aha Moment:** The service is the transaction and policy boundary.
**Socratic Checkpoint:** Why not write directly in the route? Why not put permissions only in SQL? Why is audit logging in the transaction? Which layer maps DTOs? Which boundary is most fragile?
How to self-grade: strong answers mention blast radius and rollback behavior.
**Connects To:** Mission 19 and Mission 24.

### Mission 19: Find the Bugs Before They Happen
**Tier:** Senior
**Time Estimate:** 50 minutes
**Goal:** Predict likely regressions from current architecture.
**The Concept:** A senior reads code like a draft knowledge entry: what claims are unverified?
**Design Intent Before You Read the Code:** Identify places where a future change could break permissions, stale cache, or ranking.
**Find It In The Code:** `src/repositories/knowledgeEntryRepository.ts:116-127`, `src/hooks/useEntryMutations.ts:23-87`, `src/lib/auth/permissions.ts:78-90`, `src/repositories/knowledgeEntryRepository.ts:244-253`.

```ts
...(input.actorRole === "ADMIN" ? {} : { authorId: input.actorId }), // remove this and drafts leak
```

**The Aha Moment:** Load-bearing lines are often short.
**Socratic Checkpoint:** Which line prevents draft leakage? Which lines refresh search after mutation? Which matrix controls status transitions? Which SQL expression controls ranking? Which test would fail first?
How to self-grade: strong answers connect a source line to a user-visible symptom.
**Connects To:** Mission 20 and Mission 23.

### Mission 20: The Bug Injection Challenge
**Tier:** Senior
**Time Estimate:** 45 minutes
**Goal:** Design tests for five realistic bugs without modifying production code.
**The Concept:** Inject the idea, not the bug: describe the symptom and prove the system rejects it.
**Design Intent Before You Read the Code:** Tests should lock down business risks, not implementation trivia.
**Find It In The Code:** `src/tests/services/knowledge-entry-status.test.ts:24-49`, `src/tests/repositories/workspace-scope.test.ts:23-44`, `src/tests/api/knowledge-curation-route.test.ts:22-42`.

```ts
await expect(changeEntryStatus(..., EntryStatus.DRAFT)).rejects.toBeInstanceOf(ConflictError);
// The test names the forbidden user-visible workflow, not a private helper detail.
```

**The Aha Moment:** A good regression test tells the future maintainer what user promise was protected.
**Socratic Checkpoint:** What test catches leaked drafts? What test catches bad status transitions? What test catches non-admin curation? What test catches malformed entry input? What test catches draft curation?
How to self-grade: strong answers name test file locations and expected failure type.
**Connects To:** Mission 23.

### Mission 21: Performance X-Ray
**Tier:** Senior
**Time Estimate:** 60 minutes
**Goal:** Identify performance pressure points in search.
**The Concept:** Ranking every shelf for every keystroke makes the catalog desk do avoidable work.
**Design Intent Before You Read the Code:** UI should avoid excessive requests, and SQL should avoid repeated heavy computation when indexed alternatives exist.
**Find It In The Code:** `src/components/knowledge/search-dashboard.tsx:44-50`, `src/hooks/useKnowledgeSearch.ts:30-33`, `src/repositories/knowledgeEntryRepository.ts:198-253`, `prisma/schema.prisma:79-81`.

```ts
onChange={(event) => setQuery(event.target.value)} // every character changes the query key
```

**The Aha Moment:** Performance bugs often begin at a harmless-looking input handler.
**Socratic Checkpoint:** Where could debounce go? What SQL repeats work? Which indexes exist? What query needs a GIN index? What metric would you watch?
How to self-grade: strong answers propose one UI fix and one database/indexing fix.
**Connects To:** Mission 22 and Mission 23.

### Mission 22: The Security Audit
**Tier:** Senior
**Time Estimate:** 60 minutes
**Goal:** Audit trust boundaries around auth, roles, ownership, and curation.
**The Concept:** The knowledge hub has public shelves, staff-only desks, and admin-only display controls.
**Design Intent Before You Read the Code:** Security must be enforced on the server, not only through hidden UI.
**Find It In The Code:** `src/app/api/auth/login/route.ts:16-22`, `src/lib/auth/session.ts:41-63`, `src/lib/auth/apiAuth.ts:19-43`, `src/lib/auth/permissions.ts:42-90`, `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.

```ts
const session = await requireApiRole(request, "ADMIN"); // server-side curation gate
```

**The Aha Moment:** UI visibility is presentation; API role checks are security.
**Socratic Checkpoint:** Where is the cookie made HTTP-only? Where is session expiration checked? Where is admin curation enforced? Where is editor ownership enforced? Where is logout weaker than other auth code?
How to self-grade: strong answers identify `src/app/api/auth/logout/route.ts:7-12` as a cleanup target.
**Connects To:** Mission 23 and Mission 24.

### Mission 23: Write the Test That Doesn't Exist
**Tier:** Senior
**Time Estimate:** 60 minutes
**Goal:** Specify one missing high-value test.
**The Concept:** Tests are published runbooks for future maintainers.
**Design Intent Before You Read the Code:** Add tests where product promises could silently regress.
**Find It In The Code:** `src/services/knowledgeEntryService.ts:197-231`, `src/tests/api/knowledge-curation-route.test.ts:22-42`, `src/tests/services/knowledge-entry-status.test.ts:24-49`.

```ts
// Target: draft curation should reject before ranking metadata changes.
if (currentEntry.status !== EntryStatus.PUBLISHED) throw new ConflictError("Only published entries can be curated");
```

**The Aha Moment:** The best next test protects an important rule with no direct coverage.
**Socratic Checkpoint:** What rule lacks direct test coverage? What should be mocked? What error should be expected? What user promise does this protect? Where should the test live?
How to self-grade: strong answers produce a runnable Vitest test outline.
**Connects To:** Mission 24.

### Mission 24: The Git History Tells a Story
**Tier:** Senior
**Time Estimate:** 40 minutes
**Goal:** Practice inferring architecture evolution from commit messages.
**The Concept:** Git history is the audit log of the codebase itself.
**Design Intent Before You Read the Code:** No `.git` directory is present in this workspace, so use realistic messages and verify against current files.
**Find It In The Code:** `src/app/api/auth/login/route.ts:6-28`, `src/repositories/knowledgeEntryRepository.ts:158-264`, `src/components/knowledge/workspace-dashboard.tsx:275-348`, `src/tests/repositories/workspace-scope.test.ts:23-44`.

```text
Commit: Add admin curation controls
Read it as: UI controls, API guard, service rule, repository update, cache invalidation, and tests should all exist.
```

**The Aha Moment:** A commit message is a claim; the codebase either supports it across layers or it does not.
**Socratic Checkpoint:** What files would "Add login" touch? What files would "Add ranked search" touch? What files would "Add curation" touch? What tests should accompany "Lock down workspace scope"? What architectural drift would history reveal?
How to self-grade: strong answers name at least four files per hypothetical commit.
**Connects To:** Continued ownership work.

