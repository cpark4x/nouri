"use client";

import { useSession } from "next-auth/react";
import { SignOutButton } from "@/components/auth/sign-out-button";

export function AppHeader() {
  const { data: session } = useSession();

  const userName = session?.user?.name ?? "User";
  const initial = userName.charAt(0).toUpperCase();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <span className="text-lg font-bold tracking-tight text-gray-900">
        Nouri
      </span>

      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
          {session?.user?.image ? (
            <img
              src={session.user.image}
              alt={userName}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            initial
          )}
        </div>
        <SignOutButton />
      </div>
    </header>
  );
}
