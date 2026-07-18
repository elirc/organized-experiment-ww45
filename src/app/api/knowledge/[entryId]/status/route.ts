/**
 * What this file does:
 * Accepts workflow transition requests for a specific knowledge entry.
 * What calls it:
 * src/hooks/useEntryMutations.ts from src/components/knowledge/workspace-dashboard.tsx.
 * What it calls:
 * src/lib/auth/apiAuth.ts, src/lib/validation/knowledgeEntrySchemas.ts, and src/services/knowledgeEntryService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Treating status updates like ordinary field edits and skipping explicit transition validation.
 */
import { NextRequest } from "next/server";

import { requireApiRole } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";
import { changeEntryStatusSchema } from "@/lib/validation/knowledgeEntrySchemas";
import { changeEntryStatus } from "@/services/knowledgeEntryService";

type RouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireApiRole(request, "EDITOR");
    const { entryId } = await context.params;
    const body = changeEntryStatusSchema.parse(await request.json());

    const entry = await changeEntryStatus(session.user, entryId, body.status);
    return apiOk(entry);
  } catch (error) {
    return apiError(error);
  }
}
