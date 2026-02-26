"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut()} type="button">
      Sign Out
    </button>
  );
}