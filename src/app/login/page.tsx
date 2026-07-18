import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getServerSession } from "@/lib/auth/session";

export default async function LoginPage() {
  const session = await getServerSession();

  if (session) {
    redirect("/");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.25),_transparent_30%),linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <LoginForm />
      </div>
    </main>
  );
}
