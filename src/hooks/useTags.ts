"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/http/client";

type TagSummary = {
  id: string;
  name: string;
  slug: string;
};

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient<TagSummary[]>("/api/tags"),
  });
}
