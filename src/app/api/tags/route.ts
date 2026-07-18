import { apiError, apiOk } from "@/lib/http/responses";
import { listAvailableTags } from "@/services/tagService";

export async function GET() {
  try {
    const tags = await listAvailableTags();
    return apiOk(tags);
  } catch (error) {
    return apiError(error);
  }
}
