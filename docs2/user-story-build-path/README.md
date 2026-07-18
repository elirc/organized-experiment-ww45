# User Story Build Path

Use these stories as real tickets. Start at Story 1 and move in order. A story is done when every acceptance criterion is satisfied, the touched files match the plan, and you can explain the route/hook/service/repository impact with source references.

Difficulty progression:

- Stories 1-3 are easy UI changes touching one or two files.
- Stories 4-5 add UI that reads existing data.
- Stories 6-7 add a new endpoint or state path.
- Stories 8-9 are full-stack changes touching persistence, API, and UI.
- Story 10 is expert-level design with architectural implications.

When stuck, ask an assistant this:

```text
I'm working on Story X. I'm stuck on Y. Here is what I've tried: Z. Don't give me the solution -- ask me questions that help me figure it out.
```

Ground your questions in the repo. For example, mention `src/components/knowledge/search-dashboard.tsx:14-174` for search UI or `src/services/knowledgeEntryService.ts:39-231` for business rules.

