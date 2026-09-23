import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  Gift,
  Users,
  Trophy,
  ShieldCheck,
  Clock3,
  Gamepad2,
  CheckCircle2,
  LockKeyhole,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function createSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

type PageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function TournamentDetailPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .in("status", ["upcoming", "live"]);

  if (error || !tournaments) {
    notFound();
  }

  const tournament = tournaments.find(
    (item) => createSlug(item.title) === slug
  );

  if (!tournament) {
    notFound();
  }

  const isPaid = Number(tournament.entry_fee) > 0;

  const isFull =
    tournament.registered_players >= tournament.max_players;

  const isLive = tournament.status === "live";

  const isUpcoming = tournament.status === "upcoming";

  const formattedDate = new Date(
    tournament.start_date
  ).toLocaleString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedShortDate = new Date(
    tournament.start_date
  ).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const progress =
    tournament.max_players > 0
      ? Math.min(
          100,
          Math.round(
            (tournament.registered_players /
              tournament.max_players) *
              100
          )
        )
      : 0;

  const remainingPlayers = Math.max(
    0,
    tournament.max_players -
      tournament.registered_players
  );

  return (
    <main className="min-h-screen bg-slate-50">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6">

          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={17} />
            Back to Tournaments
          </Link>

        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 sm:py-10">

        {/* =====================================================
            HERO
        ===================================================== */}

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

          <div className="relative min-h-[380px] overflow-hidden bg-slate-950">

            {tournament.image ? (
              <img
                src={tournament.image}
                alt={tournament.title}
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-yellow-500/30" />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />

            <div className="relative flex min-h-[380px] items-end p-6 sm:p-10 lg:p-12">

              <div className="max-w-4xl text-white">

                <div className="flex flex-wrap items-center gap-3">

                  <span className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-slate-950">
                    <Gamepad2 size={14} />
                    {tournament.game}
                  </span>

                  <span
                    className={`rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-wider ${
                      isLive
                        ? "bg-red-500 text-white"
                        : "bg-white/15 text-white backdrop-blur"
                    }`}
                  >
                    {tournament.status}
                  </span>

                  <span className="rounded-full bg-white/15 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-white backdrop-blur">
                    {isPaid
                      ? "Paid Tournament"
                      : "Free Tournament"}
                  </span>

                </div>

                <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  {tournament.title}
                </h1>

                <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
                  {tournament.description ||
                    "Join the tournament, compete with other players, and fight for the top spot."}
                </p>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-white/80">

                  <div className="flex items-center gap-2">
                    <CalendarDays size={17} />
                    {formattedShortDate}
                  </div>

                  <div className="flex items-center gap-2">
                    <Users size={17} />
                    {tournament.registered_players} registered
                  </div>

                </div>

              </div>

            </div>
          </div>

          {/* =====================================================
              STATS
          ===================================================== */}

          <div className="grid border-b border-slate-200 sm:grid-cols-2 lg:grid-cols-4">

            {/* Prize */}

            <div className="border-b border-slate-200 p-6 sm:border-r lg:border-b-0">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                  <Trophy size={21} />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Prize Pool
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-950">
                    NPR{" "}
                    {Number(
                      tournament.prize_pool
                    ).toLocaleString()}
                  </p>
                </div>

              </div>

            </div>

            {/* Entry */}

            <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <Gift size={21} />
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Entry Fee
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-950">
                    {isPaid
                      ? `NPR ${Number(
                          tournament.entry_fee
                        ).toLocaleString()}`
                      : "FREE"}
                  </p>

                </div>

              </div>

            </div>

            {/* Players */}

            <div className="border-b border-slate-200 p-6 sm:border-r lg:border-b-0">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Users size={21} />
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Players
                  </p>

                  <p className="mt-1 text-xl font-black text-slate-950">
                    {tournament.registered_players} /{" "}
                    {tournament.max_players}
                  </p>

                </div>

              </div>

            </div>

            {/* Start */}

            <div className="p-6">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                  <Clock3 size={21} />
                </div>

                <div>

                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Starts
                  </p>

                  <p className="mt-1 text-sm font-black text-slate-950">
                    {formattedShortDate}
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* =====================================================
              MAIN CONTENT
          ===================================================== */}

          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1fr_380px]">

            {/* LEFT */}

            <div>

              <h2 className="text-2xl font-black text-slate-950">
                Tournament Details
              </h2>

              {/* Start Date */}

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6">

                <div className="flex items-start gap-4">

                  <CalendarDays
                    size={22}
                    className="mt-1 shrink-0 text-yellow-600"
                  />

                  <div>

                    <p className="text-sm font-semibold text-slate-500">
                      Tournament Start
                    </p>

                    <p className="mt-1 font-bold text-slate-950">
                      {formattedDate}
                    </p>

                  </div>

                </div>

              </div>

              {/* Registration Progress */}

              <div className="mt-8">

                <div className="flex items-center justify-between">

                  <h3 className="font-black text-slate-950">
                    Registration Progress
                  </h3>

                  <span className="text-sm font-bold text-slate-500">
                    {progress}%
                  </span>

                </div>

                <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">

                  <div
                    className="h-full rounded-full bg-yellow-400 transition-all"
                    style={{
                      width: `${progress}%`,
                    }}
                  />

                </div>

                <div className="mt-2 flex justify-between text-sm text-slate-500">

                  <span>
                    {tournament.registered_players} players registered
                  </span>

                  <span>
                    {remainingPlayers} spots left
                  </span>

                </div>

              </div>

              {/* Secure Access */}

              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-6">

                <div className="flex items-start gap-4">

                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                    <LockKeyhole size={21} />
                  </div>

                  <div>

                    <h3 className="font-black text-slate-950">
                      Secure Game Access
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Room ID and password are protected.
                      Only eligible registered players can
                      access the game room details when the
                      tournament access becomes available.
                    </p>

                  </div>

                </div>

              </div>

              {/* What Happens */}

              <div className="mt-8">

                <h3 className="text-xl font-black text-slate-950">
                  What Happens After Registration?
                </h3>

                <div className="mt-5 space-y-4">

                  <div className="flex items-start gap-3">

                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-sm leading-6 text-slate-600">
                      Your tournament registration is confirmed.
                    </p>

                  </div>

                  <div className="flex items-start gap-3">

                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-sm leading-6 text-slate-600">
                      Your entry fee is deducted from your wallet
                      for paid tournaments.
                    </p>

                  </div>

                  <div className="flex items-start gap-3">

                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-sm leading-6 text-slate-600">
                      Game room information becomes available
                      only to eligible players.
                    </p>

                  </div>

                  <div className="flex items-start gap-3">

                    <CheckCircle2
                      size={20}
                      className="mt-0.5 shrink-0 text-green-600"
                    />

                    <p className="text-sm leading-6 text-slate-600">
                      Tournament results and eligible rewards
                      are handled after the match.
                    </p>

                  </div>

                </div>

              </div>

            </div>

            {/* =====================================================
                REGISTRATION CARD
            ===================================================== */}

            <div className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">

              <p className="text-sm font-bold uppercase tracking-wider text-yellow-600">
                {isLive
                  ? "Tournament Live"
                  : isFull
                  ? "Tournament Full"
                  : "Ready to Compete?"}
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {isLive
                  ? "Match In Progress"
                  : isFull
                  ? "No Spots Available"
                  : "Enter the Arena"}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">

                {isLive
                  ? "This tournament has already started. Registration is no longer available."
                  : isFull
                  ? "All available player slots have been filled for this tournament."
                  : "Register now and secure your place in this tournament."}

              </p>

              {/* Price Summary */}

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">

                <div className="flex items-center justify-between">

                  <span className="text-sm text-slate-500">
                    Entry Fee
                  </span>

                  <span className="font-black text-slate-950">
                    {isPaid
                      ? `NPR ${Number(
                          tournament.entry_fee
                        ).toLocaleString()}`
                      : "FREE"}
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="text-sm text-slate-500">
                    Prize Pool
                  </span>

                  <span className="font-black text-slate-950">
                    NPR{" "}
                    {Number(
                      tournament.prize_pool
                    ).toLocaleString()}
                  </span>

                </div>

                <div className="mt-3 flex items-center justify-between">

                  <span className="text-sm text-slate-500">
                    Available Spots
                  </span>

                  <span className="font-black text-slate-950">
                    {remainingPlayers}
                  </span>

                </div>

              </div>

              {/* Action */}

              {isLive ? (

                <button
                  disabled
                  className="mt-6 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-red-100 px-5 py-4 font-bold text-red-600"
                >
                  <Clock3 size={18} />
                  Tournament In Progress
                </button>

              ) : isFull ? (

                <button
                  disabled
                  className="mt-6 w-full cursor-not-allowed rounded-xl bg-slate-200 px-5 py-4 font-bold text-slate-500"
                >
                  Tournament Full
                </button>

              ) : (

                <Link
                  href={`/tournaments/${slug}/register`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
                >
                  Register Now
                  <ArrowLeft
                    size={18}
                    className="rotate-180"
                  />
                </Link>

              )}

              {/* Security */}

              <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">

                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <p className="text-xs leading-5 text-slate-500">
                  Your tournament registration and wallet
                  transaction are processed securely.
                </p>

              </div>

              <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                By registering, you agree to follow the
                tournament rules and platform guidelines.
              </p>

            </div>

          </div>

        </div>

      </div>
    </main>
  );
}