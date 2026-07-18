"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/http/client";
import type { WorkspaceEntry } from "@/types/knowledge";

export function useWorkspaceEntry(entryId: string) {
  return useQuery({
    queryKey: ["knowledge-entry", entryId],
    queryFn: () => apiClient<WorkspaceEntry>(`/api/knowledge/${entryId}`),
    enabled: Boolean(entryId),
  });
}
