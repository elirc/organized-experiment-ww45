/**
 * What this file does:
 * Accepts workspace draft-creation requests and pushes them through auth, validation, and the draft service.
 * What calls it:
 * src/hooks/useEntryMutations.ts from src/components/knowledge/workspace-dashboard.tsx.
 * What it calls:
 * src/lib/auth/apiAuth.ts, src/lib/validation/knowledgeEntrySchemas.ts, and src/services/knowledgeEntryService.ts.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Creating database rows directly in the route instead of letting the service own transactions and audit logging.
 */
import { NextRequest } from "next/server";

import { requireApiRole } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";
import { saveKnowledgeEntrySchema } from "@/lib/validation/knowledgeEntrySchemas";
import { createDraftEntry } from "@/services/knowledgeEntryService";

export async function POST(request: NextRequest) {
  try {
    const session = await requireApiRole(request, "EDITOR");
    const body = saveKnowledgeEntrySchema.parse(await request.json());

    const entry = await createDraftEntry(session.user, body);

    return apiOk(entry, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
