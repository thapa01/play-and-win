"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  Gift,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tournament = {
  id: string;
  title: string;
  game: string;
  description: string | null;
  tournament_type: "free" | "paid";
  entry_fee: number;
  prize_pool: number;
  max_players: number;
  registered_players: number;
  start_date: string;
  status: "upcoming" | "live" | "completed" | "cancelled";
  image: string | null;
};

const filters = [
  "ALL",
  "PUBG",
  "FREE FIRE",
  "eFOOTBALL",
  "MOBILE LEGENDS",
];

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function loadTournaments() {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["upcoming", "live"])
        .order("start_date", {
          ascending: true,
        });

      if (error) {
        console.error("Tournament fetch error:", error);
        setError(true);
        setLoading(false);
        return;
      }

      setTournaments(data || []);
      setLoading(false);
    }

    loadTournaments();
  }, []);

  const filteredTournaments =
    selectedFilter === "ALL"
      ? tournaments
      : tournaments.filter(
          (tournament) =>
            tournament.game.toUpperCase() === selectedFilter
        );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Home
          </Link>

          <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
            Compete & Win
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Tournaments
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Choose your game, join a tournament and compete against players
            for exciting rewards.
          </p>
        </div>
      </section>

      {/* Filters */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-5 sm:px-6">
          {filters.map((filter) => {
            const isActive = selectedFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setSelectedFilter(filter)}
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                  isActive
                    ? "bg-yellow-400 text-slate-950 shadow-sm"
                    : "border border-slate-200 bg-white text-slate-600 hover:border-yellow-400 hover:text-slate-950"
                }`}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </section>

      {/* Tournament List */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
              {selectedFilter === "ALL"
                ? "Upcoming"
                : selectedFilter}
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              Open Tournaments
            </h2>
          </div>

          {/* Loading */}
          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-yellow-400" />

              <p className="mt-4 text-sm font-semibold text-slate-500">
                Loading tournaments...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
              Unable to load tournaments right now. Please try again later.
            </div>
          ) : filteredTournaments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-950">
                No {selectedFilter === "ALL" ? "" : selectedFilter + " "}
                tournaments available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                New tournaments will appear here when they are created.
              </p>

              {selectedFilter !== "ALL" && (
                <button
                  type="button"
                  onClick={() => setSelectedFilter("ALL")}
                  className="mt-5 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-yellow-500"
                >
                  View All Tournaments
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {filteredTournaments.map((tournament) => {
                const tournamentSlug = tournament.title
                  .toLowerCase()
                  .replace(/[^a-z0-9]+/g, "-")
                  .replace(/(^-|-$)/g, "");

                const date = new Date(
                  tournament.start_date
                ).toLocaleString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });

                const image =
                  tournament.image ||
                  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85";

                const type =
                  tournament.tournament_type === "paid"
                    ? "PAID"
                    : "FREE";

                return (
                  <div
                    key={tournament.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                  >
                    {/* Image */}
                    <div
                      className="relative h-52 bg-cover bg-center"
                      style={{
                        backgroundImage: `linear-gradient(to top, rgba(0,0,0,.85), rgba(0,0,0,.05)), url('${image}')`,
                      }}
                    >
                      <span className="absolute left-4 top-4 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-slate-950">
                        {tournament.game}
                      </span>

                      <span className="absolute right-4 top-4 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900">
                        {type}
                      </span>

                      <h3 className="absolute bottom-5 left-5 right-5 text-2xl font-black text-white">
                        {tournament.title}
                      </h3>
                    </div>

                    {/* Details */}
                    <div className="p-5">
                      <div className="space-y-3 text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <CalendarDays
                            size={17}
                            className="text-slate-400"
                          />
                          {date}
                        </div>

                        <div className="flex items-center gap-2">
                          <Users
                            size={17}
                            className="text-slate-400"
                          />
                          {tournament.registered_players} /{" "}
                          {tournament.max_players}
                        </div>

                        <div className="flex items-center gap-2">
                          <Gift
                            size={17}
                            className="text-slate-400"
                          />

                          Prize Pool:

                          <strong className="text-slate-900">
                            NPR{" "}
                            {Number(
                              tournament.prize_pool
                            ).toLocaleString()}
                          </strong>
                        </div>
                      </div>

                      <Link
                        href={`/tournaments/${tournamentSlug}`}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-bold text-slate-950 transition hover:bg-yellow-500"
                      >
                        View Tournament
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}