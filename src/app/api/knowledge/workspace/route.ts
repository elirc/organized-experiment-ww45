/**
 * What this file does:
 * Lists workspace-visible entries for editors and admins.
 * What calls it:
 * src/hooks/useWorkspaceEntries.ts from src/components/knowledge/workspace-dashboard.tsx.
 * What it calls:
 * src/lib/auth/apiAuth.ts, src/lib/validation/knowledgeEntrySchemas.ts, and src/services/knowledgeEntryService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Returning all drafts to every editor and trusting the UI to hide unauthorized entries.
 */
import { NextRequest } from "next/server";

import { requireApiRole } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";
import { workspaceEntriesQuerySchema } from "@/lib/validation/knowledgeEntrySchemas";
import { listWorkspaceKnowledgeEntries } from "@/services/knowledgeEntryService";

export async function GET(request: NextRequest) {
  try {
    const session = await requireApiRole(request, "EDITOR");
    const parsedQuery = workspaceEntriesQuerySchema.parse({
      status: request.nextUrl.searchParams.getAll("status"),
      page: request.nextUrl.searchParams.get("page") ?? 1,
      pageSize: request.nextUrl.searchParams.get("pageSize") ?? 12,
    });

    const result = await listWorkspaceKnowledgeEntries(session.user, parsedQuery);
    return apiOk(result);
  } catch (error) {
    return apiError(error);
  }
}
