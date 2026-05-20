"use client";

import { useState } from "react";

export function SizePredictor() {
  const [heightCm, setHeightCm] = useState("172");
  const [weightKg, setWeightKg] = useState("70");
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function predict() {
    const h = Number(heightCm);
    const w = Number(weightKg);

    if (!Number.isFinite(h) || !Number.isFinite(w)) {
      setError("Please enter valid numbers for height and weight.");
      setSize(null);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heightCm: h, weightKg: w })
      });

      const json = (await res.json()) as { size?: string; error?: string };

      if (!res.ok || !json.size) {
        setError(json.error || "Could not calculate size. Try again.");
        setSize(null);
        return;
      }

      setSize(json.size);
    } catch {
      setError("Network error while calculating size.");
      setSize(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/5 p-5">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Fit Assistant</p>
      <h3 className="mt-2 text-xl font-semibold text-zinc-100">Find your jersey size</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-zinc-400">
          Height (cm)
          <input
            type="number"
            value={heightCm}
            min={130}
            max={220}
            onChange={(e) => setHeightCm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-zinc-100"
          />
        </label>
        <label className="space-y-1 text-sm text-zinc-400">
          Weight (kg)
          <input
            type="number"
            value={weightKg}
            min={35}
            max={170}
            onChange={(e) => setWeightKg(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-zinc-100"
          />
        </label>
      </div>
      <button
        onClick={predict}
        disabled={loading}
        className="mt-4 rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-300"
      >
        {loading ? "Calculating..." : "Recommend Size"}
      </button>
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
      {size ? <p className="mt-3 text-sm text-zinc-200">Recommended size: {size}</p> : null}
    </div>
  );
}
