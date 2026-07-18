# Junior Engineer Guide

## Setup And Run

The project provides npm scripts for dev, build, lint, test, Prisma generation, migration, and seed in `package.json:5-16`. The required environment variables are `DATABASE_URL`, `APP_URL`, `SESSION_COOKIE_NAME`, and `SESSION_TTL_DAYS` in `.env.example:1-4`. The README setup says to copy `.env.example`, install dependencies, run Prisma migrations, seed demo data, and start `npm run dev` in `README.md:22-28`.

Commands:

```bash
npm install
copy .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Demo accounts are listed in `README.md:30-34`.

## Folder Orientation

- `src/app`: page routes and API route handlers; examples are `src/app/page.tsx:6-20` and `src/app/api/knowledge/search/route.ts:18-36`.
- `src/components`: UI and dashboard components; examples are `src/components/ui/button.tsx:5-26`, `src/components/layout/app-header.tsx:8-36`, and `src/components/knowledge/workspace-dashboard.tsx:354-466`.
- `src/hooks`: React Query hooks; examples are `src/hooks/useKnowledgeSearch.ts:14-33` and `src/hooks/useEntryMutations.ts:14-87`.
- `src/services`: business rules; examples are `src/services/authService.ts:18-50` and `src/services/knowledgeEntryService.ts:39-231`.
- `src/repositories`: database access; examples are `src/repositories/sessionRepository.ts:3-32` and `src/repositories/knowledgeEntryRepository.ts:34-425`.
- `src/lib`: shared auth, validation, errors, HTTP, env, db, utilities; examples are `src/lib/auth/permissions.ts:20-90`, `src/lib/validation/knowledgeEntrySchemas.ts:23-71`, and `src/lib/http/responses.ts:6-47`.
- `src/types`: shared TypeScript shapes; `src/types/knowledge.ts:3-44` defines client-facing knowledge and session types.
- `prisma`: database schema and seed data; `prisma/schema.prisma:18-119` defines models and `prisma/seed.ts:6-179` seeds demo users and entries.

## One Level Deeper

Frontend:

- `src/app` mixes server pages and route handlers: pages redirect before rendering (`src/app/page.tsx:7-11`), while API handlers return JSON (`src/app/api/me/route.ts:6-16`).
- `src/components/knowledge` contains the two main product screens: search (`src/components/knowledge/search-dashboard.tsx:14-174`) and workspace (`src/components/knowledge/workspace-dashboard.tsx:73-466`).
- `src/hooks` hides HTTP details from components; hooks build URLs and call `apiClient()` (`src/hooks/useKnowledgeSearch.ts:14-33`, `src/hooks/useWorkspaceEntries.ts:14-22`).

Backend:

- `src/app/api` is the HTTP boundary; it parses requests and calls services (`src/app/api/knowledge/route.ts:18-28`).
- `src/services` owns rules and transactions (`src/services/knowledgeEntryService.ts:83-118`, `src/services/knowledgeEntryService.ts:197-231`).
- `src/repositories` owns database shape and SQL (`src/repositories/knowledgeEntryRepository.ts:158-264`).

## Frontend Entry Point Walkthrough

Source: `src/app/layout.tsx:23-35`.

```tsx
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Every route renders inside this HTML shell.
  return (
    <html lang="en" className={`${fraunces.variable} ${manrope.variable}`}>
      <body>
        {/* React Query is available to all client components below this point. */}
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
```

Source: `src/components/providers/app-providers.tsx:7-24`.

```tsx
export function AppProviders({ children }: { children: React.ReactNode }) {
  // useState creates one stable QueryClient instead of recreating the cache every render.
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Devtools are mounted for cache inspection during development. */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## Backend Entry Point Walkthrough

Source: `src/app/api/knowledge/search/route.ts:18-36`.

```ts
export async function GET(request: NextRequest) {
  try {
    // Anonymous users cannot exercise the ranking query.
    await requireApiSession(request);

    // Query params are converted into a typed, defaulted contract.
    const parsedQuery = searchEntriesQuerySchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? "",
      tags: request.nextUrl.searchParams.getAll("tags"),
      featuredOnly: request.nextUrl.searchParams.get("featuredOnly") ?? false,
      page: request.nextUrl.searchParams.get("page") ?? 1,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? 10,
    });

    // Business logic is delegated to the service.
    const result = await searchKnowledgeBase(parsedQuery);
    return apiOk(result);
  } catch (error) {
    // All failures are normalized into the API error shape.
    return apiError(error);
  }
}
```

## TypeScript Orientation

- Props as contracts: `AppHeader` requires `SessionSummary` in `src/components/layout/app-header.tsx:6-8`.
- Union-like literals: `Button` variants are restricted to `"primary" | "secondary" | "ghost" | "danger"` in `src/components/ui/button.tsx:5-7`.
- Prisma enums flow into frontend code: `EntryStatus` and `UserRole` are imported in `src/components/knowledge/workspace-dashboard.tsx:3`.
- Zod schemas become inferred TypeScript types in `src/lib/validation/knowledgeEntrySchemas.ts:67-71`.
- Shared API response shapes live in `src/types/knowledge.ts:3-44`.

## Three React Component Anatomies

Simple component, source `src/components/ui/badge.tsx:3-23`.

```tsx
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "accent" | "success" | "warning" }) {
  // tone is constrained, so callers cannot invent arbitrary visual states.
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
      tone === "neutral" && "bg-stone-200 text-stone-800",
      tone === "accent" && "bg-amber-200 text-amber-900",
      tone === "success" && "bg-emerald-200 text-emerald-900",
      tone === "warning" && "bg-rose-200 text-rose-900",
    )}>
      {children}
    </span>
  );
}
```

Search screen, source `src/components/knowledge/search-dashboard.tsx:14-33`.

```tsx
export function SearchDashboard({ session }: { session: SessionSummary }) {
  // These are local controls, like the filters on a knowledge library catalog.
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  // Tags populate the sidebar.
  const tagsQuery = useTags();

  // Search results are server state keyed by current filters.
  const searchQuery = useKnowledgeSearch({ q: query, tags: selectedTags, featuredOnly, page: 1, pageSize: 12 });
```

Complex workspace panel, source `src/components/knowledge/workspace-dashboard.tsx:97-127`.

```tsx
<form
  onSubmit={async (event) => {
    event.preventDefault(); // Keep the browser from doing a full page reload.
    setMessage(null);

    const payload = {
      // Form state becomes the SaveKnowledgeEntryInput payload.
      title: formState.title,
      slug: formState.slug,
      summary: formState.summary,
      content: formState.content,
      // The UI accepts comma-separated tags but the API receives an array.
      tags: formState.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };

    try {
      if (hasPersistedEntry && entryId) {
        // Existing entries PATCH /api/knowledge/[entryId].
        const updated = await updateMutation.mutateAsync(payload);
        onEntrySelected(updated.id);
      } else {
        // New entries POST /api/knowledge.
        const created = await createMutation.mutateAsync(payload);
        onEntrySelected(created.id);
      }
    } catch (mutationError) {
      setMessage(mutationError instanceof Error ? mutationError.message : "Unable to save entry");
    }
  }}
>
```

## Three Backend Route Anatomies

Simple read route, source `src/app/api/tags/route.ts:4-10`.

```ts
export async function GET() {
  try {
    // The route does not know Prisma; it asks the service for public tag summaries.
    const tags = await listAvailableTags();
    return apiOk(tags);
  } catch (error) {
    return apiError(error);
  }
}
```

Protected create route, source `src/app/api/knowledge/route.ts:18-28`.

```ts
export async function POST(request: NextRequest) {
  try {
    // EDITOR is the minimum role for creating drafts.
    const session = await requireApiRole(request, "EDITOR");
    // Zod validates and normalizes before the service sees input.
    const body = saveKnowledgeEntrySchema.parse(await request.json());
    // The service owns uniqueness, tags, transaction, and audit logging.
    const entry = await createDraftEntry(session.user, body);
    return apiOk(entry, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
```

Admin-only route, source `src/app/api/knowledge/[entryId]/curation/route.ts:24-36`.

```ts
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // UI hiding is not security; the API still requires ADMIN.
    const session = await requireApiRole(request, "ADMIN");
    const { entryId } = await context.params;
    const body = curateEntrySchema.parse(await request.json());
    const entry = await curateEntry(session.user, entryId, body);
    return apiOk(entry);
  } catch (error) {
    return apiError(error);
  }
}
```

## Domain Glossary

- Knowledge entry: the article/runbook record modeled by `KnowledgeEntry` in `prisma/schema.prisma:58-82`.
- Published entry: an entry with `EntryStatus.PUBLISHED` from `prisma/schema.prisma:24-28`, returned publicly by `findPublishedEntryBySlug` in `src/repositories/knowledgeEntryRepository.ts:34-54`.
- Draft: an unpublished workspace entry with `EntryStatus.DRAFT` from `prisma/schema.prisma:24-28`.
- Archived entry: an entry with `EntryStatus.ARCHIVED`, restorable only by admins through transition rules in `src/lib/auth/permissions.ts:71-90`.
- Tag: a searchable/category label modeled in `prisma/schema.prisma:84-92` and attached through `KnowledgeEntryTag` in `prisma/schema.prisma:94-102`.
- Featured: a curation flag stored on `KnowledgeEntry.isFeatured` in `prisma/schema.prisma:66-68` and used in ranking in `src/repositories/knowledgeEntryRepository.ts:244-248`.
- Manual boost: an admin-controlled integer stored in `prisma/schema.prisma:66` and capped by validation in `src/lib/validation/knowledgeEntrySchemas.ts:60-64`.
- Audit log: a mutation record modeled in `prisma/schema.prisma:104-119` and written in service transactions such as `src/services/knowledgeEntryService.ts:105-115`.

## Junior Socratic Checkpoint

1. Why does `src/app/page.tsx:7-11` redirect before rendering the search dashboard?
2. What does `AppProviders` make possible for `src/hooks/useKnowledgeSearch.ts:30-33`?
3. Why does `src/lib/validation/knowledgeEntrySchemas.ts:45-54` normalize slug before service code runs?
4. Why is `requireApiRole(request, "EDITOR")` used in `src/app/api/knowledge/route.ts:20`?
5. What would break if `src/hooks/useEntryMutations.ts:23-87` did not invalidate queries?
6. Why does the repository include author data and tags in `src/repositories/knowledgeEntryRepository.ts:34-54`?
7. How does `src/lib/http/responses.ts:10-47` keep error responses consistent?

How to self-grade:

- Strong answers cite the file and line range named in the question.
- Strong answers distinguish server state from local UI state.
- Strong answers describe at least one trust boundary: login, API guard, schema validation, permission rule, or repository ownership filter.
- Strong answers use the app's domain: entries, tags, workspace, search ranking, publishing, curation.

