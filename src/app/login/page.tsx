"use client";

import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center justify-center px-4 py-10 md:px-6">
      <SignIn routing="hash" fallbackRedirectUrl="/dashboard" />
    </div>
  );
}
