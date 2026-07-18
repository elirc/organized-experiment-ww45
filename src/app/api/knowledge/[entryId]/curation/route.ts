/**
 * What this file does:
 * Exposes the admin-only curation mutation for featured placement and manual search boosts.
 * What calls it:
 * src/hooks/useEntryMutations.ts from the admin section of src/components/knowledge/workspace-dashboard.tsx.
 * What it calls:
 * src/lib/auth/apiAuth.ts, src/lib/validation/knowledgeEntrySchemas.ts, and src/services/knowledgeEntryService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Hiding admin-only behavior in the UI and forgetting to enforce it at the server boundary.
 */
import { NextRequest } from "next/server";

import { requireApiRole } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";
import { curateEntrySchema } from "@/lib/validation/knowledgeEntrySchemas";
import { curateEntry } from "@/services/knowledgeEntryService";

type RouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // ⚠️ SENIOR NOTE: The admin guard must happen here even if the client hides the curation form, because UI visibility is not a permission boundary.
    const session = await requireApiRole(request, "ADMIN");
    const { entryId } = await context.params;
    const body = curateEntrySchema.parse(await request.json());

    const entry = await curateEntry(session.user, entryId, body);

    return apiOk(entry);
  } catch (error) {
    return apiError(error);
  }
}
