"use client";

import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/http/client";
import type { SearchEntriesQuery } from "@/lib/validation/knowledgeEntrySchemas";
import type { SearchResultEntry } from "@/types/knowledge";

type SearchResponse = {
  items: SearchResultEntry[];
  totalCount: number;
};

export function useKnowledgeSearch(filters: SearchEntriesQuery) {
  const searchParams = new URLSearchParams();

  if (filters.q) {
    searchParams.set("q", filters.q);
  }

  if (filters.featuredOnly) {
    searchParams.set("featuredOnly", "true");
  }

  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", String(filters.pageSize));

  filters.tags.forEach((tag) => searchParams.append("tags", tag));

  return useQuery({
    queryKey: ["knowledge-search", filters],
    queryFn: () => apiClient<SearchResponse>(`/api/knowledge/search?${searchParams.toString()}`),
  });
}
