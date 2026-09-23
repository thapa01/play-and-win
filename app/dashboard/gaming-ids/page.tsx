"use client";

import { useEffect, useState } from "react";
import {
  Gamepad2,
  Trophy,
  Save,
  Pencil,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  UserRound,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Game =
  | "PUBG"
  | "FREE FIRE"
  | "MOBILE LEGENDS"
  | "EFOOTBALL";

type GameProfile = {
  id: string;
  user_id: string;
  game: Game;
  gaming_id: string;
  in_game_name: string;
};

const games: {
  name: Game;
  label: string;
  short: string;
  description: string;
  idLabel: string;
}[] = [
  {
    name: "PUBG",
    label: "PUBG Mobile",
    short: "PUBG",
    description: "Your PUBG Mobile gaming profile",
    idLabel: "PUBG ID",
  },
  {
    name: "FREE FIRE",
    label: "Free Fire",
    short: "FREE FIRE",
    description: "Your Free Fire gaming profile",
    idLabel: "Free Fire UID",
  },
  {
    name: "MOBILE LEGENDS",
    label: "Mobile Legends",
    short: "MLBB",
    description: "Your Mobile Legends gaming profile",
    idLabel: "Player ID",
  },
  {
    name: "EFOOTBALL",
    label: "eFootball",
    short: "eFOOTBALL",
    description: "Your eFootball gaming profile",
    idLabel: "User ID",
  },
];

export default function GamingIdsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, GameProfile>>({});
  const [formData, setFormData] = useState<
    Record<string, { gaming_id: string; in_game_name: string }>
  >({});
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingGame, setSavingGame] = useState<Game | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadGamingProfiles();
  }, []);

  async function loadGamingProfiles() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to manage your gaming IDs.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data, error: profileError } = await supabase
      .from("player_game_profiles")
      .select("id,user_id,game,gaming_id,in_game_name")
      .eq("user_id", user.id);

    if (profileError) {
      console.error(profileError);
      setError("Unable to load your gaming profiles.");
      setLoading(false);
      return;
    }

    const profileMap: Record<string, GameProfile> = {};
    const formMap: Record<
      string,
      { gaming_id: string; in_game_name: string }
    > = {};

    for (const profile of data ?? []) {
      profileMap[profile.game] = profile as GameProfile;

      formMap[profile.game] = {
        gaming_id: profile.gaming_id,
        in_game_name: profile.in_game_name,
      };
    }

    setProfiles(profileMap);
    setFormData(formMap);
    setLoading(false);
  }

  function handleChange(
    game: Game,
    field: "gaming_id" | "in_game_name",
    value: string
  ) {
    setFormData((current) => ({
      ...current,
      [game]: {
        gaming_id: current[game]?.gaming_id ?? "",
        in_game_name: current[game]?.in_game_name ?? "",
        [field]: value,
      },
    }));

    setMessage("");
    setError("");
  }

  async function saveGamingProfile(game: Game) {
    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    const values = formData[game];

    if (!values?.gaming_id?.trim()) {
      setError(`${game} Gaming ID is required.`);
      return;
    }

    if (!values?.in_game_name?.trim()) {
      setError(`${game} in-game name is required.`);
      return;
    }

    setSavingGame(game);
    setMessage("");
    setError("");

    const { data, error: saveError } = await supabase
      .from("player_game_profiles")
      .upsert(
        {
          user_id: userId,
          game,
          gaming_id: values.gaming_id.trim(),
          in_game_name: values.in_game_name.trim(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,game",
        }
      )
      .select()
      .single();

    if (saveError) {
      console.error(saveError);
      setError(
        saveError.message || "Unable to save your gaming profile."
      );
      setSavingGame(null);
      return;
    }

    setProfiles((current) => ({
      ...current,
      [game]: data as GameProfile,
    }));

    setEditingGame(null);
    setMessage(`${game} gaming profile saved successfully.`);
    setSavingGame(null);
  }

  function startEditing(game: Game) {
    const profile = profiles[game];

    if (profile) {
      setFormData((current) => ({
        ...current,
        [game]: {
          gaming_id: profile.gaming_id,
          in_game_name: profile.in_game_name,
        },
      }));
    }

    setEditingGame(game);
    setMessage("");
    setError("");
  }

  function isEditing(game: Game) {
    return editingGame === game || !profiles[game];
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="group">
              <div className="text-xl font-black tracking-tight text-slate-950">
                PLAY <span className="text-yellow-500">&amp;</span> WIN
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Gaming Platform
              </div>
            </Link>
          </div>
        </header>

        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
            Loading gaming profiles...
          </div>
        </div>
      </main>
    );
  }

  const completedProfiles = Object.keys(profiles).length;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="shrink-0">
            <div className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              PLAY <span className="text-yellow-500">&amp;</span> WIN
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Gaming Platform
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex">
            <Link
              href="/dashboard"
              className="text-sm font-medium text-slate-600 transition hover:text-yellow-600"
            >
              Home
            </Link>

            <Link
              href="/dashboard/tournaments"
              className="text-sm font-medium text-slate-600 transition hover:text-yellow-600"
            >
              Tournaments
            </Link>

            <Link
              href="/dashboard/gaming-ids"
              className="text-sm font-semibold text-yellow-600"
            >
              Gaming IDs
            </Link>

            <Link
              href="/dashboard/squads"
              className="text-sm font-medium text-slate-600 transition hover:text-yellow-600"
            >
              My Squads
            </Link>
          </nav>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
        </div>
      </header>

      {/* PAGE */}
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* PAGE INTRO */}
        <section className="mb-8">
          <p className="text-sm font-bold uppercase tracking-wider text-yellow-600">
            PLAYER DASHBOARD
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Gaming IDs
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
                Save your gaming information once and use it across your
                Play &amp; Win tournaments.
              </p>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm font-semibold text-yellow-700">
              <Gamepad2 className="h-4 w-4" />
              {completedProfiles}/4 Complete
            </div>
          </div>
        </section>

        {/* MESSAGES */}
        {message && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* INFO CARDS */}
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <Gamepad2 className="h-5 w-5" />
            </div>

            <h3 className="font-bold text-slate-950">
              One profile per game
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Add your correct gaming ID and in-game name.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <UserRound className="h-5 w-5" />
            </div>

            <h3 className="font-bold text-slate-950">
              Ready for tournaments
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-500">
              Your profile can be used when registering for a game.
            </p>
          </div>

          <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-5 shadow-sm">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <Sparkles className="h-5 w-5" />
            </div>

            <h3 className="font-bold text-slate-950">
              Keep it accurate
            </h3>

            <p className="mt-1 text-sm leading-5 text-slate-600">
              Incorrect gaming details can affect tournament access.
            </p>
          </div>
        </section>

        {/* SECTION HEADER */}
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-yellow-600">
              Your Games
            </p>

            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Gaming Profiles
            </h2>
          </div>

          <div className="hidden text-sm font-medium text-slate-500 sm:block">
            {completedProfiles}/4 profiles completed
          </div>
        </div>

        {/* GAME CARDS */}
        <div className="grid gap-6 lg:grid-cols-2">
          {games.map((game) => {
            const profile = profiles[game.name];

            const values = formData[game.name] ?? {
              gaming_id: "",
              in_game_name: "",
            };

            const editing = isEditing(game.name);
            const saving = savingGame === game.name;

            return (
              <section
                key={game.name}
                className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-yellow-300 hover:shadow-md"
              >
                {/* CARD HEADER */}
                <div className="border-b border-slate-100 bg-slate-50 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                        <Gamepad2 className="h-7 w-7" />
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-yellow-600">
                          {game.short}
                        </p>

                        <h3 className="mt-1 text-xl font-black text-slate-950">
                          {game.label}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {game.description}
                        </p>
                      </div>
                    </div>

                    {profile && !editing && (
                      <button
                        type="button"
                        onClick={() => startEditing(game.name)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-slate-950"
                      >
                        <Pencil className="h-4 w-4" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>

                {/* CARD BODY */}
                <div className="space-y-5 p-6">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      {game.idLabel}
                    </label>

                    <input
                      type="text"
                      value={values.gaming_id}
                      onChange={(e) =>
                        handleChange(
                          game.name,
                          "gaming_id",
                          e.target.value
                        )
                      }
                      disabled={!editing || saving}
                      placeholder={`Enter your ${game.idLabel}`}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-800">
                      In-game Name
                    </label>

                    <input
                      type="text"
                      value={values.in_game_name}
                      onChange={(e) =>
                        handleChange(
                          game.name,
                          "in_game_name",
                          e.target.value
                        )
                      }
                      disabled={!editing || saving}
                      placeholder="Enter your in-game name"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-70"
                    />
                  </div>

                  {editing ? (
                    <button
                      type="button"
                      onClick={() => saveGamingProfile(game.name)}
                      disabled={saving}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Gaming Profile
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl border border-yellow-200 bg-yellow-50 px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-yellow-700">
                        <CheckCircle2 className="h-4 w-4" />
                        Gaming profile saved
                      </div>

                      <Trophy className="h-4 w-4 text-yellow-600" />
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>

        {/* SECURITY NOTE */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-yellow-200 bg-yellow-50 shadow-sm">
          <div className="flex gap-4 p-5 sm:p-6">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-yellow-400">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-bold text-slate-950">
                Gaming information &amp; tournament security
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-600">
                Make sure your Gaming ID and in-game name are correct.
                Tournament administrators may use this information when
                verifying participants or assigning Room IDs and passwords.
              </p>
            </div>
          </div>
        </section>

        {/* BACK TO DASHBOARD */}
        <div className="mt-8 rounded-3xl border border-yellow-200 bg-yellow-50 p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="font-bold text-slate-950">
                Ready to play?
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Head back to your dashboard and explore available tournaments.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}