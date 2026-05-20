"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

import { useShopStore } from "@/store/useShopStore";

export function AppProviders({
  children,
  hasSessionCookie,
}: {
  children: React.ReactNode;
  hasSessionCookie: boolean;
}) {
  const setAuth = useShopStore((state) => state.setAuth);
  const setWishlist = useShopStore((state) => state.setWishlist);
  const logout = useShopStore((state) => state.logout);

  // Block any font loads from assets.appwrite.io. That CDN does not send
  // Access-Control-Allow-Origin for custom domains, causing CORS errors.
  // We proxy those fonts through /api/fonts/appwrite/... instead.
  //
  // Two attack vectors are covered:
  //  1. Inline <style> with @font-face — cssRules are accessible; we delete
  //     the offending rules directly.
  //  2. <link rel="stylesheet"> pointing to assets.appwrite.io — cross-origin
  //     CSS blocks cssRules access, so we remove the <link> element itself
  //     before the browser can fetch the fonts referenced inside it.
  useEffect(() => {
    const BLOCKED_HOST = "assets.appwrite.io";

    function purgeAppwriteLinks() {
      document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((el) => {
        try {
          if (new URL(el.href).hostname === BLOCKED_HOST) {
            el.remove();
          }
        } catch {
          // Ignore invalid hrefs.
        }
      });
    }

    function purgeAppwriteFontFaceRules() {
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          const rules = Array.from(sheet.cssRules);
          for (let i = rules.length - 1; i >= 0; i--) {
            const rule = rules[i];
            if (
              rule instanceof CSSFontFaceRule &&
              rule.style.getPropertyValue("src").includes(BLOCKED_HOST)
            ) {
              sheet.deleteRule(i);
            }
          }
        } catch {
          // Cross-origin stylesheets block cssRules access — handled via link removal above.
        }
      }
    }

    function cleanup() {
      purgeAppwriteLinks();
      purgeAppwriteFontFaceRules();
    }

    cleanup();

    const observer = new MutationObserver(cleanup);
    observer.observe(document.head, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;

    if (!hasSessionCookie) {
      logout();
      return () => {
        active = false;
      };
    }

    async function bootstrapAuth() {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        if (!res.ok) {
          if (active) logout();
          return;
        }

        const json = (await res.json()) as {
          user?: {
            id: string;
            name: string;
            email: string;
            role: "user" | "admin";
            favoriteTeam?: string;
            favoriteTeams: string[];
            phone?: string;
            newsletter?: boolean;
          };
        };

        if (active && json.user) {
          setAuth({ user: json.user, token: "session" });

          try {
            const wishlistRes = await fetch("/api/profile/wishlist", { cache: "no-store" });
            const wishlistJson = (await wishlistRes.json()) as { productIds?: string[] };

            if (active && wishlistRes.ok) {
              setWishlist(wishlistJson.productIds || []);
            } else if (active) {
              setWishlist([]);
            }
          } catch {
            if (active) {
              setWishlist([]);
            }
          }
        } else if (active) {
          logout();
        }
      } catch {
        if (active) logout();
      }
    }

    void bootstrapAuth();

    return () => {
      active = false;
    };
  }, [hasSessionCookie, logout, setAuth, setWishlist]);

  return (
    <>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#111827",
            color: "#e5e7eb",
            border: "1px solid #334155"
          }
        }}
      />
    </>
  );
}
