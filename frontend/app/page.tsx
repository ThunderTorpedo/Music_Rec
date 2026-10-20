"use client";

import { useEffect, useState } from "react";

const API = "http://127.0.0.1:8000";

type Track = {
  track_id: string;
  title: string;
  artist: string;
};

type Rec = Track & {
  score: number;
  reason: string;
};

export default function Home() {
  // User & Controls State
  const [users, setUsers] = useState<string[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [k, setK] = useState<number>(10);

  // Core Data State
  const [history, setHistory] = useState<Track[]>([]);
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Similar Tracks State (GET /similar/{track_id})
  const [similar, setSimilar] = useState<Rec[]>([]);
  const [similarSource, setSimilarSource] = useState<Track | null>(null);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(false);

  // Catalog Search State (GET /search?q=...&limit=...)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [searching, setSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  // 1. Load Sample Users on Mount: GET /sample-users
  useEffect(() => {
    fetch(`${API}/sample-users?n=25`)
      .then((r) => {
        if (!r.ok) throw new Error("API error");
        return r.json();
      })
      .then((u: string[]) => {
        setUsers(u);
        if (u.length > 0) {
          setUserId(u[0]);
          loadUser(u[0], 10);
        }
      })
      .catch(() =>
        setError(
          "Can't reach FastAPI at http://127.0.0.1:8000. Make sure uvicorn is running and you opened Next.js on http://localhost:3000."
        )
      );
  }, []);

  // 2. Fetch User History + Hybrid Recommendations: GET /history/{user_id} & GET /recommend/{user_id}
  async function loadUser(id: string, topK: number = k) {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const encoded = encodeURIComponent(id);
      const [hRes, rRes] = await Promise.all([
        fetch(`${API}/history/${encoded}?k=${topK}`),
        fetch(`${API}/recommend/${encoded}?k=${topK}`),
      ]);

      if (!hRes.ok || !rRes.ok) {
        throw new Error(`User "${id}" not found (404).`);
      }

      const [h, r] = await Promise.all([hRes.json(), rRes.json()]);
      setHistory(h);
      setRecs(r);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  // 3. Fetch Audio-Similar Tracks: GET /similar/{track_id}
  async function showSimilar(t: Track) {
    setLoadingSimilar(true);
    setSimilarSource(t);
    setError("");
    try {
      const encoded = encodeURIComponent(t.track_id);
      const res = await fetch(`${API}/similar/${encoded}?k=8`);
      if (!res.ok) throw new Error("Failed to fetch similar tracks");
      const s: Rec[] = await res.json();
      setSimilar(s);
    } catch {
      setError(`Could not load similar songs for "${t.title}".`);
    } finally {
      setLoadingSimilar(false);
    }
  }

  // 4. Search Catalog by Title or Artist: GET /search?q=...&limit=...
  async function handleSearch(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    setHasSearched(true);
    setError("");
    try {
      const res = await fetch(
        `${API}/search?q=${encodeURIComponent(q)}&limit=12`
      );
      if (!res.ok) throw new Error("Search failed");
      const data: Track[] = await res.json();
      setSearchResults(data);
    } catch {
      setError("Search request failed.");
    } finally {
      setSearching(false);
    }
  }

  function shuffleUser() {
    if (users.length === 0) return;
    const randomUser = users[Math.floor(Math.random() * users.length)];
    setUserId(randomUser);
    loadUser(randomUser, k);
  }

  // Normalize hybrid z-scores into a 40%–100% bar width
  function getScoreWidth(score: number, list: Rec[]) {
    if (!list.length) return 75;
    const scores = list.map((x) => x.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    if (max === min) return 85;
    return Math.round(40 + ((score - min) / (max - min)) * 60);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xl">
              ♫
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">
                Music Recommender
              </h1>
              <p className="text-xs text-zinc-400">
                Hybrid ALS + Spotify Audio Features • FastAPI + Next.js
              </p>
            </div>
          </div>

          {/* Search Bar (GET /search) */}
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 w-full md:w-96"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search songs or artists (/search)..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setSearchResults([]);
                    setHasSearched(false);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 px-4 py-2 rounded-xl text-sm font-medium transition shrink-0"
            >
              {searching ? "..." : "Search"}
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="text-xs underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Catalog Search Results Drawer (GET /search) */}
        {hasSearched && (
          <section className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Catalog Search Results{" "}
                  <span className="text-zinc-400 font-normal">
                    ({searchResults.length} matches for &ldquo;{searchQuery}&rdquo;)
                  </span>
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  GET /search?q={searchQuery}&limit=12
                </p>
              </div>
              <button
                onClick={() => {
                  setHasSearched(false);
                  setSearchResults([]);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1 rounded-lg border border-zinc-800"
              >
                Close Search ✕
              </button>
            </div>

            {searchResults.length === 0 ? (
              <p className="text-sm text-zinc-400 py-4">
                No tracks found matching &ldquo;{searchQuery}&rdquo;. Try another artist or song title.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {searchResults.map((t) => (
                  <div
                    key={t.track_id}
                    className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-3.5 flex items-center justify-between gap-3 hover:border-zinc-700 transition"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-zinc-100 truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate">
                        {t.artist}
                      </div>
                    </div>
                    <button
                      onClick={() => showSimilar(t)}
                      className="text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg shrink-0 transition"
                    >
                      Similar →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* User Controls Bar (GET /sample-users) */}
        <section className="bg-zinc-900/60 border border-zinc-800/90 rounded-2xl p-5">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Select Listener Profile (`GET /sample-users`)
              </label>
              <div className="flex gap-2">
                <select
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                  value={userId}
                  onChange={(e) => {
                    setUserId(e.target.value);
                    loadUser(e.target.value, k);
                  }}
                >
                  {users.map((u, i) => (
                    <option key={u} value={u}>
                      User #{i + 1} — {u}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={shuffleUser}
                  className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 px-3.5 py-2.5 rounded-xl text-xs font-medium shrink-0 transition"
                >
                  Shuffle User
                </button>
              </div>
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Number of Tracks (`k`)
              </label>
              <select
                value={k}
                onChange={(e) => {
                  const nextK = Number(e.target.value);
                  setK(nextK);
                  loadUser(userId, nextK);
                }}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                <option value={5}>Top 5</option>
                <option value={10}>Top 10</option>
                <option value={15}>Top 15</option>
                <option value={20}>Top 20</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <button
                onClick={() => loadUser(userId, k)}
                disabled={loading || !userId}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-zinc-950 font-semibold rounded-xl px-5 py-2.5 text-sm transition shadow-sm"
              >
                {loading ? "Loading..." : "Refresh Recommendations"}
              </button>
            </div>
          </div>
        </section>

        {/* Similar Tracks Drawer (GET /similar/{track_id}) */}
        {similarSource && (
          <section className="bg-zinc-900/95 border border-emerald-500/40 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  Audio Feature Cosine Similarity • GET /similar/{similarSource.track_id}
                </span>
                <h2 className="text-lg font-bold text-zinc-100 mt-0.5">
                  Similar to &ldquo;{similarSource.title}&rdquo;{" "}
                  <span className="text-zinc-400 font-normal">
                    — {similarSource.artist}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => {
                  setSimilarSource(null);
                  setSimilar([]);
                }}
                className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-zinc-800"
              >
                Close ✕
              </button>
            </div>

            {loadingSimilar ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 bg-zinc-800/50 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {similar.map((t) => (
                  <div
                    key={t.track_id}
                    className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-3.5 flex flex-col justify-between gap-3 hover:border-emerald-500/40 transition"
                  >
                    <div>
                      <div className="text-sm font-semibold text-zinc-100 truncate">
                        {t.title}
                      </div>
                      <div className="text-xs text-zinc-400 truncate mt-0.5">
                        {t.artist}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1.5">
                        {t.reason}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                      <span className="text-xs font-mono text-emerald-400">
                        {(t.score * 100).toFixed(1)}% match
                      </span>
                      <button
                        onClick={() => showSimilar(t)}
                        className="text-xs text-zinc-300 hover:text-white underline"
                      >
                        Explore similar →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Main 2-Column Grid: History vs Hybrid Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Listening History (GET /history/{user_id}) */}
          <section className="lg:col-span-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Top Listening History
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  GET /history/{userId.slice(0, 14)}...?k={k}
                </p>
              </div>
              <span className="text-xs bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-full">
                {history.length} tracks
              </span>
            </div>

            {loading ? (
              <div className="space-y-2.5">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-16 bg-zinc-800/40 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : (
              <ul className="space-y-2.5">
                {history.map((t, idx) => (
                  <li
                    key={t.track_id}
                    className="bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-800/70 rounded-xl p-3.5 flex items-center justify-between gap-3 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-100 truncate">
                          {t.title}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">
                          {t.artist}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => showSimilar(t)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white shrink-0 transition"
                    >
                      Similar songs
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Right Column: Hybrid Recommendations (GET /recommend/{user_id}) */}
          <section className="lg:col-span-7 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-zinc-100">
                  Personalized Hybrid Recommendations
                </h2>
                <p className="text-xs text-zinc-500 font-mono">
                  GET /recommend/{userId.slice(0, 14)}...?k={k}
                </p>
              </div>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full font-medium">
                ALS + Audio Content
              </span>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-20 bg-zinc-800/40 animate-pulse rounded-xl"
                  />
                ))}
              </div>
            ) : (
              <ul className="space-y-3">
                {recs.map((t, idx) => {
                  const barWidth = getScoreWidth(t.score, recs);
                  return (
                    <li
                      key={t.track_id}
                      className="bg-zinc-950/90 hover:bg-zinc-900/90 border border-zinc-800/80 rounded-xl p-4 transition"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-zinc-100 truncate">
                              {t.title}
                            </div>
                            <div className="text-xs text-zinc-400 truncate">
                              {t.artist}
                            </div>
                            <div className="inline-block mt-2 text-xs bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
                              {t.reason}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className="flex items-center gap-2" title="Hybrid Z-Score">
                            <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono text-zinc-400">
                              {t.score.toFixed(2)}
                            </span>
                          </div>

                          <button
                            onClick={() => showSimilar(t)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800/80 text-zinc-200 hover:bg-zinc-700 transition"
                          >
                            Similar songs →
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}