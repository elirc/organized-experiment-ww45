import { describe, expect, it } from "vitest";

import { saveKnowledgeEntrySchema } from "@/lib/validation/knowledgeEntrySchemas";

describe("saveKnowledgeEntrySchema", () => {
  it("rejects a malformed knowledge entry payload", () => {
    // Why this test matters:
    // The API must reject bad content before it reaches the service layer; otherwise weak drafts can create broken
    // slugs, empty search documents, and inconsistent records that are painful to clean up later.
    const parse = () =>
      saveKnowledgeEntrySchema.parse({
        title: "Bad",
        slug: "x",
        summary: "too short",
        content: "tiny",
        tags: [],
      });

    expect(parse).toThrow();
  });
});
