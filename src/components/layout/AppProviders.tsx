"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";

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

  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    let active = true;

    if (!isLoaded) return;

    if (!hasSessionCookie && !isSignedIn) {
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
  }, [hasSessionCookie, isLoaded, isSignedIn, logout, setAuth, setWishlist]);

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
