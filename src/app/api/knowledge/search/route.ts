/**
 * What this file does:
 * Exposes the authenticated ranked-search endpoint for published knowledge entries.
 * What calls it:
 * src/hooks/useKnowledgeSearch.ts through the search dashboard in src/components/knowledge/search-dashboard.tsx.
 * What it calls:
 * src/lib/auth/apiAuth.ts, src/lib/validation/knowledgeEntrySchemas.ts, and src/services/knowledgeEntryService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Letting the route invent ranking rules instead of delegating to the service and repository layers.
 */
import { NextRequest } from "next/server";

import { requireApiSession } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";
import { searchEntriesQuerySchema } from "@/lib/validation/knowledgeEntrySchemas";
import { searchKnowledgeBase } from "@/services/knowledgeEntryService";

export async function GET(request: NextRequest) {
  try {
    // Auth runs before search work so anonymous requests do not exercise the ranking query at all.
    await requireApiSession(request);

    const parsedQuery = searchEntriesQuerySchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? "",
      tags: request.nextUrl.searchParams.getAll("tags"),
      featuredOnly: request.nextUrl.searchParams.get("featuredOnly") ?? false,
      page: request.nextUrl.searchParams.get("page") ?? 1,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? 10,
    });

    const result = await searchKnowledgeBase(parsedQuery);

    return apiOk(result);
  } catch (error) {
    return apiError(error);
  }
}
