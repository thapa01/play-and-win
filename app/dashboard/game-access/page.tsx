"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  Gamepad2,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type GameAccess = {
  id: string;
  tournament_id: string;
  game: string;
  room_id: string | null;
  room_password: string | null;
  status: "locked" | "available" | "expired";
  available_from: string | null;
  expires_at: string | null;
  created_at: string;
};

type Tournament = {
  id: string;
  title: string;
  start_date: string;
  max_players?: number;
  registered_players?: number;
};

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function CopyButton({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition hover:border-slate-950 hover:text-slate-950"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {copied ? "Copied" : label}
    </button>
  );
}

export default function GameAccessPage() {
  const [access, setAccess] = useState<GameAccess[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadGameAccess() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Only fetch this user's game access.
      const { data: accessData, error: accessError } =
        await supabase
          .from("game_access")
          .select(
            `
              id,
              tournament_id,
              game,
              room_id,
              room_password,
              status,
              available_from,
              expires_at,
              created_at
            `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (accessError) {
        console.error("Game access error:", accessError);
        setError("Unable to load your game access.");
        setLoading(false);
        return;
      }

      const accessRows = (accessData ?? []) as GameAccess[];

      setAccess(accessRows);

      const tournamentIds = accessRows.map(
        (item) => item.tournament_id
      );

      if (tournamentIds.length > 0) {
        const { data: tournamentData, error: tournamentError } =
          await supabase
            .from("tournaments")
            .select(
              "id, title, start_date, max_players, registered_players"
            )
            .in("id", tournamentIds);

        if (tournamentError) {
          console.error(
            "Tournament information error:",
            tournamentError
          );
        }

        setTournaments((tournamentData ?? []) as Tournament[]);
      }

      setLoading(false);
    }

    loadGameAccess();
  }, []);

  function getAccessState(item: GameAccess) {
    const now = new Date();

    const availableFrom = item.available_from
      ? new Date(item.available_from)
      : null;

    const expiresAt = item.expires_at
      ? new Date(item.expires_at)
      : null;

    if (expiresAt && now >= expiresAt) {
      return "expired";
    }

    if (availableFrom && now < availableFrom) {
      return "locked";
    }

    if (
      item.status === "available" &&
      (!expiresAt || now < expiresAt)
    ) {
      return "available";
    }

    if (item.status === "locked") {
      return "locked";
    }

    return "expired";
  }

  function getTournament(item: GameAccess) {
    return tournaments.find(
      (tournament) => tournament.id === item.tournament_id
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-5">
            <div className="h-5 w-40 rounded bg-slate-200" />

            <div className="h-12 w-72 rounded bg-slate-200" />

            <div className="h-64 rounded-3xl bg-white shadow-sm" />
            <div className="h-64 rounded-3xl bg-white shadow-sm" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
                Secure Player Area
              </p>

              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Game Access
              </h1>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Access your authorized tournament rooms securely.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs font-black text-green-700">
              <ShieldCheck size={16} />
              Protected Access
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Empty */}
        {access.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
              <LockKeyhole size={34} />
            </div>

            <h2 className="mt-6 text-2xl font-black text-slate-950">
              No game access yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Your tournament room details will appear here after
              you register and the admin releases access.
            </p>

            <Link
              href="/tournaments"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              Browse Tournaments
              <ChevronRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {access.map((item) => {
              const tournament = getTournament(item);
              const accessState = getAccessState(item);

              const isAvailable = accessState === "available";
              const isLocked = accessState === "locked";
              const isExpired = accessState === "expired";

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* Header */}
                  <div className="p-6 sm:p-7">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-yellow-400">
                          <Gamepad2 size={26} />
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-600">
                            {item.game}
                          </p>

                          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                            {tournament?.title || "Tournament"}
                          </h2>

                          {tournament?.start_date && (
                            <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                              <Clock3 size={15} />

                              <span>
                                Starts{" "}
                                {formatDate(tournament.start_date)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Access status */}
                      <span
                        className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${
                          isAvailable
                            ? "bg-green-100 text-green-700"
                            : isExpired
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {isAvailable
                          ? "✓ Access Available"
                          : isExpired
                          ? "Access Expired"
                          : "🔒 Locked"}
                      </span>
                    </div>

                    {/* Available */}
                    {isAvailable && (
                      <div className="mt-7">
                        <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                          <div className="flex gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                              <ShieldCheck size={20} />
                            </div>

                            <div>
                              <p className="font-black text-green-800">
                                Your game room is ready
                              </p>

                              <p className="mt-1 text-sm leading-5 text-green-700">
                                These credentials are private to your
                                account. Do not share them with other
                                players.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Credentials */}
                        <div className="mt-5 grid gap-4 sm:grid-cols-2">
                          {/* Room ID */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <Gamepad2
                                  size={17}
                                  className="text-slate-500"
                                />

                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                  Room ID
                                </p>
                              </div>

                              {item.room_id && (
                                <CopyButton
                                  value={item.room_id}
                                  label="Copy"
                                />
                              )}
                            </div>

                            <p className="mt-3 break-all text-xl font-black tracking-wide text-slate-950">
                              {item.room_id || "Not provided"}
                            </p>
                          </div>

                          {/* Password */}
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <KeyRound
                                  size={17}
                                  className="text-slate-500"
                                />

                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                  Room Password
                                </p>
                              </div>

                              {item.room_password && (
                                <CopyButton
                                  value={item.room_password}
                                  label="Copy"
                                />
                              )}
                            </div>

                            <p className="mt-3 break-all text-xl font-black tracking-wide text-slate-950">
                              {item.room_password || "Not provided"}
                            </p>
                          </div>
                        </div>

                        {/* Security warning */}
                        <div className="mt-5 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                          <LockKeyhole
                            size={18}
                            className="mt-0.5 shrink-0 text-slate-500"
                          />

                          <p className="text-xs leading-5 text-slate-500">
                            Room credentials are intended only for
                            the registered player associated with this
                            account. Keep them private.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Locked */}
                    {isLocked && (
                      <div className="mt-7 rounded-2xl bg-slate-50 p-7 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                          <LockKeyhole size={28} />
                        </div>

                        <h3 className="mt-5 font-black text-slate-950">
                          Room details are locked
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                          The tournament room credentials have not
                          been released yet.
                        </p>

                        {item.available_from && (
                          <div className="mx-auto mt-5 w-fit rounded-xl border border-slate-200 bg-white px-4 py-3">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                              Access available from
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-700">
                              {formatDate(item.available_from)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expired */}
                    {isExpired && (
                      <div className="mt-7 rounded-2xl border border-red-200 bg-red-50 p-7 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 text-red-600">
                          <Clock3 size={28} />
                        </div>

                        <h3 className="mt-5 font-black text-red-800">
                          Game access has expired
                        </h3>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-red-700">
                          The room credentials are no longer available
                          through this access record.
                        </p>

                        {item.expires_at && (
                          <p className="mt-4 text-xs font-semibold text-red-600">
                            Expired on {formatDate(item.expires_at)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Expiration */}
                    {item.expires_at && !isExpired && (
                      <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
                        <Clock3 size={14} />

                        <span>
                          Access expires{" "}
                          <span className="font-bold text-slate-600">
                            {formatDate(item.expires_at)}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <ShieldCheck size={15} />

                      <span>
                        Secure access for registered players
                      </span>
                    </div>

                    <Link
                      href="/dashboard/my-tournaments"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                    >
                      My Tournaments
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}