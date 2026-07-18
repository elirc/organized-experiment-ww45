/**
 * What this file does:
 * Defines the Zod boundary for login credentials before auth logic runs.
 * What calls it:
 * src/app/api/auth/login/route.ts parses request JSON with loginSchema.
 * What it calls:
 * This file is schema-only and does not depend on services or repositories.
 * One thing a junior engineer would likely get wrong when writing something similar:
 * Treating validation as a frontend-only concern and letting malformed payloads reach the password verification code.
 */
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  // ⚠️ SENIOR NOTE: The password boundary is intentionally broader than a UI rule so auth endpoints stay resilient if multiple clients exist later.
  password: z.string().min(8).max(128),
});

export type LoginInput = z.infer<typeof loginSchema>;
