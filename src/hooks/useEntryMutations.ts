"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EntryStatus } from "@prisma/client";

import { apiClient } from "@/lib/http/client";
import type {
  ChangeEntryStatusInput,
  CurateEntryInput,
  SaveKnowledgeEntryInput,
} from "@/lib/validation/knowledgeEntrySchemas";
import type { WorkspaceEntry } from "@/types/knowledge";

export function useCreateEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveKnowledgeEntryInput) =>
      apiClient<WorkspaceEntry>("/api/knowledge", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-search"] }),
      ]);
    },
  });
}

export function useUpdateEntryMutation(entryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveKnowledgeEntryInput) =>
      apiClient<WorkspaceEntry>(`/api/knowledge/${entryId}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-entry", entryId] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-search"] }),
      ]);
    },
  });
}

export function useChangeEntryStatusMutation(entryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: EntryStatus) =>
      apiClient<WorkspaceEntry>(`/api/knowledge/${entryId}/status`, {
        method: "POST",
        body: JSON.stringify({ status } satisfies ChangeEntryStatusInput),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-entry", entryId] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-search"] }),
      ]);
    },
  });
}

export function useCurateEntryMutation(entryId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CurateEntryInput) =>
      apiClient<WorkspaceEntry>(`/api/knowledge/${entryId}/curation`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["workspace-entries"] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-entry", entryId] }),
        queryClient.invalidateQueries({ queryKey: ["knowledge-search"] }),
      ]);
    },
  });
}
