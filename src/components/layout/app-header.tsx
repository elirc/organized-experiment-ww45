import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import type { SessionSummary } from "@/types/knowledge";

export function AppHeader({ session }: { session: SessionSummary }) {
  return (
    <header className="sticky top-0 z-20 border-b border-stone-200/80 bg-stone-50/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <Link href="/" className="font-serif text-2xl text-stone-950">
            Knowledge Hub
          </Link>
          <p className="text-sm text-stone-600">
            Search ranked runbooks and curated operational knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="accent">{session.user.role}</Badge>
          <Link href="/">
            <Button variant="ghost">Search</Button>
          </Link>
          {session.user.role !== "VIEWER" ? (
            <Link href="/workspace">
              <Button variant="secondary">Workspace</Button>
            </Link>
          ) : null}
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
