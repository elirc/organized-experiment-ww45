import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationError } from "@/lib/errors";

const requireApiRoleMock = vi.fn();
const curateEntryMock = vi.fn();

vi.mock("@/lib/auth/apiAuth", () => ({
  requireApiRole: requireApiRoleMock,
}));

vi.mock("@/services/knowledgeEntryService", () => ({
  curateEntry: curateEntryMock,
}));

describe("POST /api/knowledge/[entryId]/curation", () => {
  beforeEach(() => {
    requireApiRoleMock.mockReset();
    curateEntryMock.mockReset();
  });

  it("returns 403 when a non-admin hits the curation endpoint", async () => {
    // Why this test matters:
    // Admin-only curation is a direct ranking-control surface. If this endpoint stops returning 403 for editors,
    // they can silently reorder public search results in production.
    requireApiRoleMock.mockRejectedValue(new AuthorizationError());

    const { POST } = await import("@/app/api/knowledge/[entryId]/curation/route");
    const response = await POST(
      new Request("http://localhost:3000/api/knowledge/entry-1/curation", {
        method: "POST",
        body: JSON.stringify({
          isFeatured: true,
          manualBoost: 4,
          curationNotes: "promote this entry",
        }),
      }) as never,
      { params: Promise.resolve({ entryId: "entry-1" }) },
    );

    expect(response.status).toBe(403);
  });
});
