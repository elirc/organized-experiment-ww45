import { redirect } from "next/navigation";

import { SearchDashboard } from "@/components/knowledge/search-dashboard";
import { getServerSession } from "@/lib/auth/session";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <SearchDashboard
      session={{
        user: session.user,
        expiresAt: session.expiresAt.toISOString(),
      }}
    />
  );
}
