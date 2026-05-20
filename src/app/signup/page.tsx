"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import type { UserProfile } from "@/lib/types";
import { useShopStore } from "@/store/useShopStore";

export default function SignupPage() {
  const router = useRouter();
  const setAuth = useShopStore((state) => state.setAuth);
  const setWishlist = useShopStore((state) => state.setWishlist);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [teamsError, setTeamsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadTeams() {
      setTeamsLoading(true);
      setTeamsError(null);

      try {
        const res = await fetch("/api/teams");
        const json = (await res.json()) as {
          teams?: Array<{ id: string; name: string }>;
          error?: string;
        };

        if (!res.ok) {
          throw new Error(json.error || "Failed to load teams");
        }

        const nextTeams = json.teams || [];

        if (active) {
          setTeams(nextTeams);
          setFavoriteTeam((current) => current || nextTeams[0]?.name || "");
        }
      } catch (error) {
        if (active) {
          setTeams([]);
          setTeamsError(error instanceof Error ? error.message : "Failed to load teams");
        }
      } finally {
        if (active) {
          setTeamsLoading(false);
        }
      }
    }

    void loadTeams();

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedPhone = phone.trim();

    if (!/^\+[1-9]\d{6,14}$/.test(normalizedPhone)) {
      toast.error("Enter phone with country code, e.g. +919876543210");
      return;
    }

    if (!favoriteTeam) {
      toast.error("Please select your favorite team");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          phone: normalizedPhone,
          favoriteTeam,
          newsletter,
        }),
      });

      const json = (await res.json()) as { user?: UserProfile; error?: string };

      if (!res.ok || !json.user) {
        toast.error(json.error || "Sign up failed");
        return;
      }

      setAuth({ user: json.user, token: "session" });
      setWishlist([]);
      toast.success("Account created successfully");
      router.replace("/dashboard");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10 md:px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full space-y-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-6 shadow-[0_20px_80px_rgba(6,182,212,0.14)]"
      >
        <div>
          <h1 className="text-3xl text-zinc-100">Create account</h1>
          <p className="mt-1 text-sm text-zinc-400">Join ASHER STORE and track your orders.</p>
        </div>

        <input
          type="text"
          required
          minLength={2}
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
        />

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
          placeholder="Password (min 8 chars)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
        />

        <input
          type="tel"
          required
          minLength={8}
          maxLength={16}
          pattern="^\+[1-9]\d{6,14}$"
          title="Use international format with country code, e.g. +919876543210"
          placeholder="Phone (+country code), e.g. +919876543210"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2"
        />

        <div className="space-y-2">
          <label htmlFor="favoriteTeam" className="text-sm text-zinc-300">
            Favorite team
          </label>
          <div className="relative">
            <select
              id="favoriteTeam"
              required
              value={favoriteTeam}
              onChange={(e) => setFavoriteTeam(e.target.value)}
              disabled={teamsLoading || !teams.length}
              className="w-full appearance-none rounded-lg border border-cyan-400/30 bg-zinc-950 px-3 py-2 text-zinc-100 outline-none transition focus:border-cyan-300"
            >
              {!teams.length ? <option value="">No teams available</option> : null}
              {teams.map((team) => (
                <option key={team.id} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-zinc-500">
              v
            </span>
          </div>
          {teamsLoading ? <p className="text-xs text-zinc-500">Loading teams...</p> : null}
          {teamsError ? <p className="text-xs text-rose-300">{teamsError}</p> : null}
        </div>

        <label className="flex items-center gap-3 rounded-lg border border-white/10 bg-zinc-950/70 px-3 py-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 accent-cyan-400"
          />
          Subscribe to newsletter updates
        </label>

        <button
          type="submit"
          disabled={loading || teamsLoading || !teams.length}
          className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-70"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p className="text-sm text-zinc-400">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan-300 hover:text-cyan-200">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
