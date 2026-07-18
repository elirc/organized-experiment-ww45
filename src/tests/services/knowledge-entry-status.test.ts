import { EntryStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "@/lib/errors";

const findEditableEntryByIdMock = vi.fn();

vi.mock("@/repositories/knowledgeEntryRepository", async () => {
  const actual = await vi.importActual<typeof import("@/repositories/knowledgeEntryRepository")>(
    "@/repositories/knowledgeEntryRepository",
  );

  return {
    ...actual,
    findEditableEntryById: findEditableEntryByIdMock,
  };
});

describe("changeEntryStatus", () => {
  beforeEach(() => {
    findEditableEntryByIdMock.mockReset();
  });

  it("rejects an invalid published-to-draft transition", async () => {
    // Why this test matters:
    // Workflow transitions are where accidental state corruption happens. If a published entry can jump back to draft
    // without the explicit archived step, downstream reporting and curation assumptions become unreliable.
    findEditableEntryByIdMock.mockResolvedValue({
      id: "entry-1",
      authorId: "editor-1",
      status: EntryStatus.PUBLISHED,
      author: { id: "editor-1", name: "Editor" },
      tags: [],
    });

    const { changeEntryStatus } = await import("@/services/knowledgeEntryService");

    await expect(
      changeEntryStatus(
        {
          id: "editor-1",
          email: "editor@example.com",
          name: "Editor",
          role: "EDITOR",
        },
        "entry-1",
        EntryStatus.DRAFT,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
