import { NextRequest } from "next/server";

import { requireApiRole } from "@/lib/auth/apiAuth";
import { apiError, apiOk } from "@/lib/http/responses";
import { saveKnowledgeEntrySchema } from "@/lib/validation/knowledgeEntrySchemas";
import { getWorkspaceEntryById, updateDraftEntry } from "@/services/knowledgeEntryService";

type RouteContext = {
  params: Promise<{
    entryId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireApiRole(request, "EDITOR");
    const { entryId } = await context.params;

    const entry = await getWorkspaceEntryById(session.user, entryId);

    return apiOk(entry);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await requireApiRole(request, "EDITOR");
    const { entryId } = await context.params;
    const body = saveKnowledgeEntrySchema.parse(await request.json());

    const entry = await updateDraftEntry(session.user, entryId, body);

    return apiOk(entry);
  } catch (error) {
    return apiError(error);
  }
}
