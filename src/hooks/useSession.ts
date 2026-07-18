"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/http/client";
import type { SessionSummary } from "@/types/knowledge";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiClient<SessionSummary>("/api/me"),
    retry: false,
  });
}
