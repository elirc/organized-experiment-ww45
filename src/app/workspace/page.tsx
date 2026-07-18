import { redirect } from "next/navigation";

import { WorkspaceDashboard } from "@/components/knowledge/workspace-dashboard";
import { getServerSession } from "@/lib/auth/session";

export default async function WorkspacePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "VIEWER") {
    redirect("/");
  }

  return (
    <WorkspaceDashboard
      session={{
        user: session.user,
        expiresAt: session.expiresAt.toISOString(),
      }}
    />
  );
}
