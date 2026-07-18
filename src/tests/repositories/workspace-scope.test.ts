import { beforeEach, describe, expect, it, vi } from "vitest";

const findManyMock = vi.fn();
const countMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    knowledgeEntry: {
      findMany: findManyMock,
      count: countMock,
    },
  },
}));

describe("listWorkspaceEntries", () => {
  beforeEach(() => {
    findManyMock.mockReset();
    countMock.mockReset();
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);
  });

  it("scopes non-admin workspace queries to the actor's own entries", async () => {
    // Why this test matters:
    // Ownership filters are easy to accidentally remove during refactors. This catches the class of bug where one
    // editor suddenly sees another editor's drafts because the repository stopped adding authorId to the query.
    const { listWorkspaceEntries } = await import("@/repositories/knowledgeEntryRepository");

    await listWorkspaceEntries({
      actorId: "editor-1",
      actorRole: "EDITOR",
      statuses: [],
      page: 1,
      pageSize: 12,
    });

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          authorId: "editor-1",
        }),
      }),
    );
  });
});
