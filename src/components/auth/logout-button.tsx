"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  return (
    <Button
      variant="ghost"
      disabled={isPending}
      onClick={async () => {
        setIsPending(true);

        try {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        } finally {
          setIsPending(false);
        }
      }}
    >
      {isPending ? "Signing out..." : "Sign out"}
    </Button>
  );
}
