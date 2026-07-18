import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AppHeader } from "@/components/layout/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getServerSession } from "@/lib/auth/session";
import { getPublishedEntryBySlug } from "@/services/knowledgeEntryService";

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function EntryPage({ params }: PageProps) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const { slug } = await params;
  const entry = await getPublishedEntryBySlug(slug).catch(() => null);

  if (!entry) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#fafaf9_0%,_#f5f5f4_100%)]">
      <AppHeader
        session={{
          user: session.user,
          expiresAt: session.expiresAt.toISOString(),
        }}
      />

      <main className="mx-auto max-w-5xl px-6 py-8">
        <Link href="/">
          <Button variant="ghost">Back to search</Button>
        </Link>

        <article className="mt-6 rounded-[2rem] border border-stone-200 bg-white p-8 shadow-[0_20px_90px_-48px_rgba(41,37,36,0.35)]">
          <div className="flex flex-wrap items-center gap-2">
            {entry.isFeatured ? <Badge tone="accent">Featured</Badge> : null}
            <Badge>{entry.authorName}</Badge>
            {entry.tags.map((tag) => (
              <Badge key={`${entry.id}-${tag}`}>{tag}</Badge>
            ))}
          </div>

          <h1 className="mt-5 font-serif text-5xl leading-tight text-stone-950">{entry.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-stone-600">{entry.summary}</p>

          <div className="mt-10 prose prose-stone max-w-none prose-headings:font-serif prose-headings:text-stone-950 prose-p:text-stone-700">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{entry.content}</ReactMarkdown>
          </div>
        </article>
      </main>
    </div>
  );
}
