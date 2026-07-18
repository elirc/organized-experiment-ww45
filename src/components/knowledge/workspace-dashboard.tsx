"use client";

import type { EntryStatus, UserRole } from "@prisma/client";
import { useState } from "react";

import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  useChangeEntryStatusMutation,
  useCreateEntryMutation,
  useCurateEntryMutation,
  useUpdateEntryMutation,
} from "@/hooks/useEntryMutations";
import { useWorkspaceEntries } from "@/hooks/useWorkspaceEntries";
import { useWorkspaceEntry } from "@/hooks/useWorkspaceEntry";
import type { SessionSummary, WorkspaceEntry } from "@/types/knowledge";

type EntrySelection = string | "new" | null;

type EntryFormState = {
  title: string;
  slug: string;
  summary: string;
  content: string;
  tags: string;
};

const emptyFormState: EntryFormState = {
  title: "",
  slug: "",
  summary: "",
  content: "",
  tags: "",
};

function statusTone(status: EntryStatus) {
  if (status === "PUBLISHED") {
    return "success" as const;
  }

  if (status === "ARCHIVED") {
    return "warning" as const;
  }

  return "neutral" as const;
}

function buildFormState(entry?: WorkspaceEntry | null): EntryFormState {
  if (!entry) {
    return emptyFormState;
  }

  return {
    title: entry.title,
    slug: entry.slug,
    summary: entry.summary,
    content: entry.content,
    tags: entry.tags.join(", "),
  };
}

function buildCurationState(entry?: WorkspaceEntry | null) {
  return {
    isFeatured: entry?.isFeatured ?? false,
    manualBoost: entry?.manualBoost ?? 0,
    curationNotes: entry?.curationNotes ?? "",
  };
}

function WorkspaceEditorPanel({
  entry,
  entryId,
  userRole,
  onEntrySelected,
}: {
  entry: WorkspaceEntry | null;
  entryId: string | null;
  userRole: UserRole;
  onEntrySelected: (nextEntryId: EntrySelection) => void;
}) {
  const [formState, setFormState] = useState(() => buildFormState(entry));
  const [curationState, setCurationState] = useState(() => buildCurationState(entry));
  const [message, setMessage] = useState<string | null>(null);

  const createMutation = useCreateEntryMutation();
  const updateMutation = useUpdateEntryMutation(entryId ?? "");
  const statusMutation = useChangeEntryStatusMutation(entryId ?? "");
  const curateMutation = useCurateEntryMutation(entryId ?? "");

  const hasPersistedEntry = Boolean(entryId && entry);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <form
        className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]"
        onSubmit={async (event) => {
          event.preventDefault();
          setMessage(null);

          const payload = {
            title: formState.title,
            slug: formState.slug,
            summary: formState.summary,
            content: formState.content,
            tags: formState.tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),
          };

          try {
            if (hasPersistedEntry && entryId) {
              const updated = await updateMutation.mutateAsync(payload);
              onEntrySelected(updated.id);
              setMessage("Entry updated.");
            } else {
              const created = await createMutation.mutateAsync(payload);
              onEntrySelected(created.id);
              setMessage("Draft created.");
            }
          } catch (mutationError) {
            setMessage(mutationError instanceof Error ? mutationError.message : "Unable to save entry");
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Title</span>
            <Input
              value={formState.title}
              onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
              placeholder="Knowledge article title"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-stone-700">Slug</span>
            <Input
              value={formState.slug}
              onChange={(event) => setFormState((current) => ({ ...current, slug: event.target.value }))}
              placeholder="generated-from-title"
            />
          </label>
        </div>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-stone-700">Summary</span>
          <Textarea
            rows={4}
            value={formState.summary}
            onChange={(event) => setFormState((current) => ({ ...current, summary: event.target.value }))}
          />
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-stone-700">Content</span>
          <Textarea
            rows={16}
            value={formState.content}
            onChange={(event) => setFormState((current) => ({ ...current, content: event.target.value }))}
          />
        </label>

        <label className="mt-4 block space-y-2">
          <span className="text-sm font-medium text-stone-700">Tags</span>
          <Input
            value={formState.tags}
            onChange={(event) => setFormState((current) => ({ ...current, tags: event.target.value }))}
            placeholder="Operations, Security, Onboarding"
          />
        </label>

        {message ? <p className="mt-4 text-sm text-stone-600">{message}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
            {hasPersistedEntry ? "Save changes" : "Create draft"}
          </Button>

          {hasPersistedEntry && entry ? (
            <>
              {entry.status !== "PUBLISHED" ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={statusMutation.isPending}
                  onClick={async () => {
                    try {
                      await statusMutation.mutateAsync("PUBLISHED");
                      setMessage("Entry published.");
                    } catch (mutationError) {
                      setMessage(
                        mutationError instanceof Error ? mutationError.message : "Unable to publish entry",
                      );
                    }
                  }}
                >
                  Publish
                </Button>
              ) : null}

              {entry.status !== "ARCHIVED" ? (
                <Button
                  type="button"
                  variant="danger"
                  disabled={statusMutation.isPending}
                  onClick={async () => {
                    try {
                      await statusMutation.mutateAsync("ARCHIVED");
                      setMessage("Entry archived.");
                    } catch (mutationError) {
                      setMessage(
                        mutationError instanceof Error ? mutationError.message : "Unable to archive entry",
                      );
                    }
                  }}
                >
                  Archive
                </Button>
              ) : null}

              {userRole === "ADMIN" && entry.status === "ARCHIVED" ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={statusMutation.isPending}
                  onClick={async () => {
                    try {
                      await statusMutation.mutateAsync("DRAFT");
                      setMessage("Archived entry moved back to draft.");
                    } catch (mutationError) {
                      setMessage(
                        mutationError instanceof Error ? mutationError.message : "Unable to restore entry",
                      );
                    }
                  }}
                >
                  Restore to draft
                </Button>
              ) : null}
            </>
          ) : null}
        </div>
      </form>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]">
          <p className="font-semibold text-stone-950">Entry metadata</p>
          {entry ? (
            <div className="mt-4 space-y-3 text-sm text-stone-600">
              <p>
                Author: <span className="font-semibold text-stone-900">{entry.authorName}</span>
              </p>
              <p>
                Updated:{" "}
                <span className="font-semibold text-stone-900">
                  {new Date(entry.updatedAt).toLocaleString()}
                </span>
              </p>
              <p>
                Published:{" "}
                <span className="font-semibold text-stone-900">
                  {entry.publishedAt ? new Date(entry.publishedAt).toLocaleString() : "Not published"}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-600">Create a new draft or select an entry to edit.</p>
          )}
        </div>

        {userRole === "ADMIN" ? (
          <form
            className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]"
            onSubmit={async (event) => {
              event.preventDefault();
              setMessage(null);

              if (!entryId) {
                setMessage("Select an entry before curating.");
                return;
              }

              try {
                await curateMutation.mutateAsync({
                  isFeatured: curationState.isFeatured,
                  manualBoost: curationState.manualBoost,
                  curationNotes: curationState.curationNotes,
                });
                setMessage("Curation updated.");
              } catch (mutationError) {
                setMessage(
                  mutationError instanceof Error ? mutationError.message : "Unable to update curation",
                );
              }
            }}
          >
            <p className="font-semibold text-stone-950">Admin curation</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              These controls only apply to published entries and directly influence ranked search ordering.
            </p>

            <label className="mt-4 flex items-center justify-between rounded-2xl border border-stone-300 px-4 py-3">
              <span className="text-sm font-medium text-stone-700">Featured placement</span>
              <input
                type="checkbox"
                checked={curationState.isFeatured}
                onChange={(event) =>
                  setCurationState((current) => ({ ...current, isFeatured: event.target.checked }))
                }
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-stone-700">Manual boost</span>
              <Input
                type="number"
                min={0}
                max={25}
                value={curationState.manualBoost}
                onChange={(event) =>
                  setCurationState((current) => ({
                    ...current,
                    manualBoost: Number(event.target.value),
                  }))
                }
              />
            </label>

            <label className="mt-4 block space-y-2">
              <span className="text-sm font-medium text-stone-700">Curation notes</span>
              <Textarea
                rows={5}
                value={curationState.curationNotes}
                onChange={(event) =>
                  setCurationState((current) => ({ ...current, curationNotes: event.target.value }))
                }
              />
            </label>

            <Button type="submit" className="mt-6" disabled={curateMutation.isPending || !entryId}>
              Save curation
            </Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export function WorkspaceDashboard({ session }: { session: SessionSummary }) {
  const [selectedStatuses, setSelectedStatuses] = useState<EntryStatus[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<EntrySelection>(null);

  const entriesQuery = useWorkspaceEntries(selectedStatuses);
  const effectiveEntryId =
    selectedEntryId === "new"
      ? null
      : selectedEntryId ?? entriesQuery.data?.items[0]?.id ?? null;
  const selectedEntryQuery = useWorkspaceEntry(effectiveEntryId ?? "");
  const selectedEntry = effectiveEntryId ? selectedEntryQuery.data ?? null : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_45%,_#fafaf9_100%)]">
      <AppHeader session={session} />

      <main className="mx-auto grid max-w-7xl gap-8 px-6 py-8 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[2rem] border border-stone-200 bg-white p-5 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-stone-950">Workspace entries</p>
              <p className="text-sm text-stone-600">
                {entriesQuery.data?.totalCount ?? 0} entries visible to {session.user.role.toLowerCase()}.
              </p>
            </div>
            <Button variant="secondary" onClick={() => setSelectedEntryId("new")}>
              New
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["DRAFT", "PUBLISHED", "ARCHIVED"] as EntryStatus[]).map((status) => {
              const isSelected = selectedStatuses.includes(status);

              return (
                <button
                  key={status}
                  type="button"
                  className={`rounded-full border px-3 py-2 text-sm transition ${
                    isSelected
                      ? "border-stone-950 bg-stone-950 text-white"
                      : "border-stone-300 bg-stone-50 text-stone-700"
                  }`}
                  onClick={() =>
                    setSelectedStatuses((current) =>
                      current.includes(status)
                        ? current.filter((item) => item !== status)
                        : [...current, status],
                    )
                  }
                >
                  {status}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            {entriesQuery.data?.items.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedEntryId(entry.id)}
                className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                  effectiveEntryId === entry.id
                    ? "border-stone-950 bg-stone-950 text-white"
                    : "border-stone-200 bg-stone-50 hover:border-stone-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{entry.title}</p>
                  <Badge tone={statusTone(entry.status)}>{entry.status}</Badge>
                </div>
                <p className={`mt-2 text-sm ${effectiveEntryId === entry.id ? "text-stone-200" : "text-stone-600"}`}>
                  {entry.summary}
                </p>
              </button>
            ))}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="rounded-[2rem] border border-stone-200 bg-white p-6 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
                  Editorial workspace
                </p>
                <h1 className="mt-3 font-serif text-4xl text-stone-950">
                  Draft, publish, archive, and curate knowledge without hiding the rules.
                </h1>
              </div>

              {selectedEntry ? <Badge tone={statusTone(selectedEntry.status)}>{selectedEntry.status}</Badge> : null}
            </div>

            <p className="mt-4 max-w-3xl text-base leading-7 text-stone-600">
              Editors can manage their own entries. Admins can additionally curate published content by featuring it and applying manual ranking boosts.
            </p>
          </div>

          <WorkspaceEditorPanel
            key={effectiveEntryId ?? "new"}
            entry={selectedEntry}
            entryId={effectiveEntryId}
            userRole={session.user.role}
            onEntrySelected={setSelectedEntryId}
          />
        </section>
      </main>
    </div>
  );
}
