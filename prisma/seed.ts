import { EntryStatus, PrismaClient, UserRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const [viewer, editor, admin] = await Promise.all([
    prisma.user.upsert({
      where: { email: "viewer@knowledge-hub.local" },
      update: {},
      create: {
        email: "viewer@knowledge-hub.local",
        name: "Val Viewer",
        role: UserRole.VIEWER,
        passwordHash: hashSync("password123", 10),
      },
    }),
    prisma.user.upsert({
      where: { email: "editor@knowledge-hub.local" },
      update: {},
      create: {
        email: "editor@knowledge-hub.local",
        name: "Elliot Editor",
        role: UserRole.EDITOR,
        passwordHash: hashSync("password123", 10),
      },
    }),
    prisma.user.upsert({
      where: { email: "admin@knowledge-hub.local" },
      update: {},
      create: {
        email: "admin@knowledge-hub.local",
        name: "Ada Admin",
        role: UserRole.ADMIN,
        passwordHash: hashSync("password123", 10),
      },
    }),
  ]);

  const tags = await Promise.all(
    [
      { name: "Operations", slug: "operations" },
      { name: "Security", slug: "security" },
      { name: "Onboarding", slug: "onboarding" },
      { name: "Platform", slug: "platform" },
      { name: "Customer Support", slug: "customer-support" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: { name: tag.name },
        create: tag,
      }),
    ),
  );

  const tagBySlug = Object.fromEntries(tags.map((tag) => [tag.slug, tag]));

  await prisma.knowledgeEntry.upsert({
    where: { slug: "vpn-access-runbook" },
    update: {},
    create: {
      slug: "vpn-access-runbook",
      title: "VPN Access Runbook",
      summary: "How employees request, approve, and troubleshoot VPN access.",
      content: `## Purpose

Use this runbook when a teammate cannot reach internal systems over VPN.

## First response

1. Confirm the employee is assigned to the correct identity group.
2. Check whether the request was approved by IT Security.
3. Verify the local VPN client version against the managed baseline.
`,
      status: EntryStatus.PUBLISHED,
      authorId: editor.id,
      publishedAt: new Date("2026-03-10T08:00:00.000Z"),
      isFeatured: true,
      manualBoost: 5,
      tags: {
        create: [
          { tagId: tagBySlug["operations"].id },
          { tagId: tagBySlug["security"].id },
        ],
      },
    },
  });

  await prisma.knowledgeEntry.upsert({
    where: { slug: "new-hire-week-one-checklist" },
    update: {},
    create: {
      slug: "new-hire-week-one-checklist",
      title: "New Hire Week One Checklist",
      summary: "What managers and IT need to complete during a new employee's first week.",
      content: `## Before day one

- Order hardware
- Confirm payroll profile
- Grant product analytics access

## During week one

- Walk through support tooling
- Review escalation policies
- Schedule security training
`,
      status: EntryStatus.PUBLISHED,
      authorId: editor.id,
      publishedAt: new Date("2026-02-01T09:30:00.000Z"),
      manualBoost: 2,
      tags: {
        create: [
          { tagId: tagBySlug["onboarding"].id },
          { tagId: tagBySlug["operations"].id },
        ],
      },
    },
  });

  await prisma.knowledgeEntry.upsert({
    where: { slug: "incident-bridge-template" },
    update: {},
    create: {
      slug: "incident-bridge-template",
      title: "Incident Bridge Template",
      summary: "Template language for spinning up a bridge during customer-impacting incidents.",
      content: `## When to use

Use this template for Sev1 and Sev2 incidents that affect customer workflows.

## Template

Bridge owner:
Incident commander:
Current blast radius:
Next update:
`,
      status: EntryStatus.DRAFT,
      authorId: admin.id,
      manualBoost: 1,
      tags: {
        create: [
          { tagId: tagBySlug["customer-support"].id },
          { tagId: tagBySlug["platform"].id },
        ],
      },
    },
  });

  await prisma.auditLog.createMany({
    data: [
      {
        action: "seed.users.created",
        targetType: "system",
        targetId: "seed",
        actorId: admin.id,
        metadata: { viewerId: viewer.id, editorId: editor.id, adminId: admin.id },
      },
      {
        action: "seed.entries.created",
        targetType: "system",
        targetId: "seed",
        actorId: admin.id,
        metadata: { slugs: ["vpn-access-runbook", "new-hire-week-one-checklist", "incident-bridge-template"] },
      },
    ],
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
