"use client";

import { useQuery } from "@tanstack/react-query";
import type { EntryStatus } from "@prisma/client";

import { apiClient } from "@/lib/http/client";
import type { WorkspaceEntry } from "@/types/knowledge";

type WorkspaceResponse = {
  items: WorkspaceEntry[];
  totalCount: number;
};

export function useWorkspaceEntries(statuses: EntryStatus[]) {
  const searchParams = new URLSearchParams();

  statuses.forEach((status) => searchParams.append("status", status));

  return useQuery({
    queryKey: ["workspace-entries", statuses],
    queryFn: () => apiClient<WorkspaceResponse>(`/api/knowledge/workspace?${searchParams.toString()}`),
  });
}
