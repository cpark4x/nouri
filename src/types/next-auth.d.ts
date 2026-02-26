import "next-auth";
import "next-auth/jwt";

/**
 * Augment next-auth's built-in types so that the custom fields injected
 * by the session/jwt callbacks in src/lib/auth.ts are statically typed
 * everywhere — no `(session as any)` casts required.
 */
declare module "next-auth" {
  interface Session {
    userId?: string | null;
    familyId?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string | null;
    familyId?: string | null;
  }
}
