"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const demoAccounts = [
  { role: "Viewer", email: "viewer@knowledge-hub.local" },
  { role: "Editor", email: "editor@knowledge-hub.local" },
  { role: "Admin", email: "admin@knowledge-hub.local" },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@knowledge-hub.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-stone-200 bg-white/90 p-8 shadow-[0_30px_120px_-48px_rgba(41,37,36,0.35)]">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-stone-500">
          Team knowledge, shipped carefully
        </p>
        <h1 className="mt-4 max-w-xl font-serif text-5xl leading-tight text-stone-950">
          Internal knowledge that stays searchable, curated, and permission-safe.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-stone-600">
          This build demonstrates explicit backend boundaries: session-backed auth, reviewable RBAC,
          PostgreSQL ranking, repository-scoped data access, and admin curation controls.
        </p>

        <div className="mt-8 rounded-[1.5rem] border border-stone-200 bg-stone-50 p-5">
          <p className="text-sm font-semibold text-stone-900">Demo password for every account</p>
          <p className="text-sm text-stone-600">Use <span className="font-semibold">password123</span> to sign in.</p>
        </div>
      </section>

      <section className="rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_30px_120px_-48px_rgba(41,37,36,0.35)]">
        <div className="space-y-2">
          <h2 className="font-serif text-3xl text-stone-950">Sign in</h2>
          <p className="text-sm text-stone-600">
            Pick a seeded role or enter credentials manually.
          </p>
        </div>

        <div className="mt-6 grid gap-3">
          {demoAccounts.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => {
                setEmail(account.email);
                setPassword("password123");
              }}
              className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-left transition hover:border-stone-400 hover:bg-stone-100"
            >
              <p className="font-semibold text-stone-900">{account.role}</p>
              <p className="text-sm text-stone-600">{account.email}</p>
            </button>
          ))}
        </div>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            setIsSubmitting(true);
            setError(null);

            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
              });

              const payload = await response.json();

              if (!response.ok) {
                setError(payload.error?.message ?? "Unable to sign in");
                return;
              }

              router.replace("/");
              router.refresh();
            } catch (submitError) {
              setError(submitError instanceof Error ? submitError.message : "Unable to sign in");
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Email</span>
            <Input value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-stone-700">Password</span>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </section>
    </div>
  );
}
