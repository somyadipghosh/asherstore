"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import type { UserProfile } from "@/lib/types";
import { useShopStore } from "@/store/useShopStore";

const OAUTH_INTENDED_EMAIL_KEY = "oauth-intended-email";
const GOOGLE_ACCOUNT_CHOOSER_URL = "https://accounts.google.com/AccountChooser";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useShopStore((state) => state.setAuth);
  const setWishlist = useShopStore((state) => state.setWishlist);
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let active = true;

    async function finishOAuth() {
      try {
        const oauthUserId = searchParams.get("userId");
        const oauthSecret = searchParams.get("secret");
        const next = searchParams.get("next");
        const intendedEmailParam = searchParams.get("intendedEmail");
        const intendedEmail = (intendedEmailParam || sessionStorage.getItem(OAUTH_INTENDED_EMAIL_KEY) || "")
          .trim()
          .toLowerCase();

        if (!oauthUserId || !oauthSecret) {
          throw new Error("Missing OAuth callback credentials. Please try again.");
        }

        if (!intendedEmail) {
          throw new Error("Missing intended email. Go back to login, enter your Gmail, and try again.");
        }

        // Finalize OAuth on the server using the callback credentials.
        // This avoids browser third-party cookie/session issues with Appwrite domains.
        const res = await fetch("/api/auth/oauth-sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: oauthUserId,
            secret: oauthSecret,
          }),
        });

        const json = (await res.json()) as { user?: UserProfile; error?: string };

        if (!active) return;

        if (!res.ok || !json.user) {
          setErrorMsg(json.error || "Google sign-in failed");
          setStatus("error");
          return;
        }

        if (json.user.email.trim().toLowerCase() !== intendedEmail) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);

          setErrorMsg(
            `Google signed you in as ${json.user.email}, but you entered ${intendedEmail}. Choose the correct Google account and try again.`
          );
          setStatus("error");
          return;
        }

        sessionStorage.removeItem(OAUTH_INTENDED_EMAIL_KEY);

        setAuth({ user: json.user, token: "session" });

        try {
          const wishlistRes = await fetch("/api/profile/wishlist", { cache: "no-store" });
          const wishlistJson = (await wishlistRes.json()) as { productIds?: string[] };
          setWishlist(wishlistRes.ok ? wishlistJson.productIds || [] : []);
        } catch {
          setWishlist([]);
        }

        const safeNext = next && next.startsWith("/") ? next : "/dashboard";
        router.replace(safeNext);
      } catch (err) {
        if (active) {
          sessionStorage.removeItem(OAUTH_INTENDED_EMAIL_KEY);
          const msg = err instanceof Error ? err.message : String(err);
          setErrorMsg(msg);
          setStatus("error");
        }
      }
    }

    void finishOAuth();

    return () => {
      active = false;
    };
  }, [router, searchParams, setAuth, setWishlist]);

  if (status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-zinc-300">
          Google sign-in failed. Please try again.
        </p>
        {errorMsg ? (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-xs text-red-300">
            {errorMsg}
          </p>
        ) : null}
        <a
          href="/login"
          className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-zinc-100"
        >
          Back to Login
        </a>
        <a
          href={GOOGLE_ACCOUNT_CHOOSER_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-zinc-400 underline underline-offset-2 hover:text-zinc-200"
        >
          Open Google account chooser
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      <p className="text-sm text-zinc-400">Signing you in with Google...</p>
    </div>
  );
}
