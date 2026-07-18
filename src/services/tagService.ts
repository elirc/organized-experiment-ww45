import { listTags } from "@/repositories/tagRepository";

export async function listAvailableTags() {
  const tags = await listTags();

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
  }));
}
