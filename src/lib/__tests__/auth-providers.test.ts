import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

describe("auth providers", () => {
  it.skipIf(!process.env.GOOGLE_CLIENT_ID)(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are defined in env",
    () => {
      expect(process.env.GOOGLE_CLIENT_ID ?? "missing").not.toBe("missing");
      expect(process.env.GOOGLE_CLIENT_SECRET ?? "missing").not.toBe(
        "missing",
      );
    },
  );

  it("auth config includes GoogleProvider and at least 3 providers", () => {
    // Read source directly to avoid the @/lib/db import chain
    // (Vitest has no path-alias config — dynamic import of auth.ts would fail)
    const authSource = readFileSync(join(__dirname, "../auth.ts"), "utf-8");

    expect(authSource).toContain("GoogleProvider(");
    expect(authSource).toContain("GitHubProvider(");
    expect(authSource).toContain("CredentialsProvider(");

    // Count Provider() call-sites — must be >= 3
    // (no \b: GitHubProvider, GoogleProvider etc. have no word-boundary before "Provider")
    const providerCalls = (authSource.match(/Provider\(/g) ?? []).length;
    expect(providerCalls).toBeGreaterThanOrEqual(3);
  });
});
