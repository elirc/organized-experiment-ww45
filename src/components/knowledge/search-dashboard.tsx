"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useKnowledgeSearch } from "@/hooks/useKnowledgeSearch";
import { useTags } from "@/hooks/useTags";
import type { SessionSummary } from "@/types/knowledge";

export function SearchDashboard({ session }: { session: SessionSummary }) {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const tagsQuery = useTags();
  const searchQuery = useKnowledgeSearch({
    q: query,
    tags: selectedTags,
    featuredOnly,
    page: 1,
    pageSize: 12,
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.28),_transparent_25%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)]">
      <AppHeader session={session} />

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-[2rem] border border-stone-200 bg-white/80 p-5 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-100 p-3 text-amber-900">
              <Search className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-stone-900">Search controls</p>
              <p className="text-sm text-stone-600">Filter ranked published entries.</p>
            </div>
          </div>

          <label className="mt-6 block space-y-2">
            <span className="text-sm font-medium text-stone-700">Query</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search runbooks, onboarding guides, policies..."
            />
          </label>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-stone-700">Tags</p>
              <button
                type="button"
                className="text-xs font-semibold text-stone-500 hover:text-stone-900"
                onClick={() => setSelectedTags([])}
              >
                Clear
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {tagsQuery.data?.map((tag) => {
                const isSelected = selectedTags.includes(tag.slug);

                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={`rounded-full border px-3 py-2 text-sm transition ${
                      isSelected
                        ? "border-stone-950 bg-stone-950 text-white"
                        : "border-stone-300 bg-white text-stone-700 hover:border-stone-400"
                    }`}
                    onClick={() =>
                      setSelectedTags((current) =>
                        current.includes(tag.slug)
                          ? current.filter((slug) => slug !== tag.slug)
                          : [...current, tag.slug],
                      )
                    }
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setFeaturedOnly((current) => !current)}
            className={`mt-6 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
              featuredOnly
                ? "border-amber-400 bg-amber-100 text-amber-950"
                : "border-stone-300 bg-white text-stone-700"
            }`}
          >
            <span className="font-medium">Featured only</span>
            <span className="text-xs uppercase tracking-[0.25em]">
              {featuredOnly ? "On" : "Off"}
            </span>
          </button>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
              Ranked knowledge discovery
            </p>
            <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight text-stone-950">
              Search quality comes from PostgreSQL ranking plus admin curation, not from frontend sorting.
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
              Results are ordered by text relevance, manual boost, featured placement, and freshness. Editors manage content in the workspace while admins tune the public discovery surface.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-stone-600">
                {searchQuery.data?.totalCount ?? 0} published entries match the current filters.
              </p>
            </div>
          </div>

          <div className="grid gap-4">
            {searchQuery.isLoading ? (
              <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/70 p-8 text-stone-500">
                Loading search results...
              </div>
            ) : null}

            {searchQuery.data?.items.map((entry) => (
              <Link
                key={entry.id}
                href={`/entries/${entry.slug}`}
                className="rounded-[2rem] border border-stone-200 bg-white/90 p-6 transition hover:-translate-y-0.5 hover:border-stone-950 hover:shadow-[0_24px_100px_-50px_rgba(28,25,23,0.5)]"
              >
                <div className="flex flex-wrap items-center gap-2">
                  {entry.isFeatured ? <Badge tone="accent">Featured</Badge> : null}
                  <Badge tone="neutral">{entry.authorName}</Badge>
                  {entry.tags.map((tag) => (
                    <Badge key={`${entry.id}-${tag}`}>{tag}</Badge>
                  ))}
                </div>

                <h2 className="mt-4 font-serif text-3xl text-stone-950">{entry.title}</h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-stone-600">{entry.summary}</p>

                <div className="mt-5 flex items-center justify-between text-sm text-stone-500">
                  <span>Updated {new Date(entry.updatedAt).toLocaleDateString()}</span>
                  <span>Score {entry.score.toFixed(2)}</span>
                </div>
              </Link>
            ))}

            {!searchQuery.isLoading && searchQuery.data?.items.length === 0 ? (
              <div className="rounded-[2rem] border border-dashed border-stone-300 bg-white/70 p-8">
                <p className="font-semibold text-stone-900">No results found</p>
                <p className="mt-2 text-sm text-stone-600">
                  Try removing a tag filter or searching for broader operational language.
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
