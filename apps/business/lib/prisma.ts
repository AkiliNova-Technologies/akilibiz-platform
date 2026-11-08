import "server-only";

import { PrismaClient } from "@prisma/client";

/**
 * Server-only database client. A Prisma connection is not a Supabase user session:
 * privileged database roles may bypass RLS. NEVER pass a browser business ID directly
 * into a Prisma operation without checking the authenticated user's active membership.
 *
 * During the transition, all business-facing reads/writes continue through the existing
 * Supabase user-scoped clients and audited RPCs. Do not expose this client to route
 * handlers, server actions or UI components without a reviewed authorization service.
 */
const globalPrisma = globalThis as unknown as { akilibizPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for server-side Prisma operations.");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    throw new Error("Prisma database client requires the Node.js runtime.");
  }
  if (!globalPrisma.akilibizPrisma) {
    globalPrisma.akilibizPrisma = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return globalPrisma.akilibizPrisma;
}
