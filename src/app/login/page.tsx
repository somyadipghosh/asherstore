"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import toast from "react-hot-toast";

import { account } from "@/lib/appwrite";
import { OAuthProvider } from "appwrite";
import type { UserProfile } from "@/lib/types";
import { useShopStore } from "@/store/useShopStore";

const OAUTH_INTENDED_EMAIL_KEY = "oauth-intended-email";

function fireAndForgetSessionCleanup() {
  void fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
  void account.deleteSession("current").catch(() => null);
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useShopStore((state) => state.setAuth);
  const clearAuth = useShopStore((state) => state.logout);
  const setWishlist = useShopStore((state) => state.setWishlist);
  const user = useShopStore((state) => state.user);

  const nextPath = useMemo(() => {
    const next = searchParams.get("next");
    if (!next || !next.startsWith("/")) return "/dashboard";
    return next;
  }, [searchParams]);

  const oauthErrorMessage = useMemo(() => {
    const rawError = searchParams.get("error");
    if (!rawError) return "";

    if (rawError === "google_failed") {
      return "Google sign-in failed. Please try again.";
    }

    try {
      const parsed = JSON.parse(rawError) as {
        message?: unknown;
        type?: unknown;
      };

      if (parsed.type === "user_already_exists") {
        return "This email is already registered with password login. Please sign in using email and password.";
      }

      if (typeof parsed.message === "string" && parsed.message.trim()) {
        return parsed.message;
      }
    } catch {
      // Ignore parse errors and use a generic fallback below.
    }

    return "Google sign-in failed. Please try again.";
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect already-authenticated users straight to dashboard
  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    }
  }, [user, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = (await res.json()) as { user?: UserProfile; error?: string };

      if (!res.ok || !json.user) {
        toast.error(json.error || "Login failed");
        return;
      }

      setAuth({ user: json.user, token: "session" });

      try {
        const wishlistRes = await fetch("/api/profile/wishlist", { cache: "no-store" });
        const wishlistJson = (await wishlistRes.json()) as { productIds?: string[] };
        setWishlist(wishlistRes.ok ? wishlistJson.productIds || [] : []);
      } catch {
        setWishlist([]);
      }

      toast.success("Welcome back");
      router.replace(nextPath);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function startGoogleLogin() {
    setGoogleLoading(true);
    try {
      const emailHint = email.trim().toLowerCase();
      if (!emailHint) {
        toast.error("Enter the Gmail you want to sign in with before continuing.");
        setGoogleLoading(false);
        return;
      }

      // Ensure we do not silently reuse an old local app session.
      clearAuth();
      fireAndForgetSessionCleanup();

      const origin = window.location.origin;
      const callbackParams = new URLSearchParams({ next: nextPath });

      if (emailHint) {
        callbackParams.set("intendedEmail", emailHint);
        sessionStorage.setItem(OAUTH_INTENDED_EMAIL_KEY, emailHint);
      } else {
        sessionStorage.removeItem(OAUTH_INTENDED_EMAIL_KEY);
      }

      const successUrl = `${origin}/auth/callback?${callbackParams.toString()}`;
      const failureUrl = `${origin}/login?next=${encodeURIComponent(nextPath)}`;

      const endpoint =
        process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://nyc.cloud.appwrite.io/v1";
      const projectId =
        process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "69c69d1c0001317b3d6a";

      const oauthUrl = new URL(`${endpoint}/account/tokens/oauth2/${OAuthProvider.Google}`);
      oauthUrl.searchParams.set("project", projectId);
      oauthUrl.searchParams.set("success", successUrl);
      oauthUrl.searchParams.set("failure", failureUrl);
      oauthUrl.searchParams.set("prompt", "select_account");

      if (emailHint) {
        oauthUrl.searchParams.set("login_hint", emailHint);
      }

      // Request standard identity scopes explicitly.
      oauthUrl.searchParams.append("scopes[]", "openid");
      oauthUrl.searchParams.append("scopes[]", "email");
      oauthUrl.searchParams.append("scopes[]", "profile");

      window.location.assign(oauthUrl.toString());
    } catch {
      toast.error("Could not initiate Google login. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handleGoogleLogin() {
    await startGoogleLogin();
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10 md:px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-6"
      >
        <div>
          <h1 className="text-3xl text-zinc-100">Login</h1>
          <p className="mt-1 text-sm text-zinc-400">Access your ASHER STORE dashboard.</p>
        </div>

        {oauthErrorMessage ? (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
            {oauthErrorMessage}
          </p>
        ) : null}

        <input
          type="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
        />

        <input
          type="password"
          required
          minLength={8}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>

        <div className="relative flex items-center gap-3">
          <hr className="flex-1 border-white/10" />
          <span className="text-xs text-zinc-500">or</span>
          <hr className="flex-1 border-white/10" />
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/15 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-70"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          {googleLoading ? "Redirecting..." : "Continue with Google"}
        </button>

        <p className="text-sm text-zinc-400">
          New here?{" "}
          <Link href="/signup" className="text-cyan-300 hover:text-cyan-200">
            Create account
          </Link>
        </p>
      </form>
    </div>
  );
}
