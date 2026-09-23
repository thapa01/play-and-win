import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Gift,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MobileLegendsPage() {
  const supabase = await createClient();

  const { data: tournaments, error } = await supabase
    .from("tournaments")
    .select("*")
    .eq("game", "MOBILE LEGENDS")
    .in("status", ["upcoming", "live"])
    .order("start_date", {
      ascending: true,
    });

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <Link
            href="/games"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={17} />
            Back to Games
          </Link>

          <div className="mt-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
              MOBILE LEGENDS
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Mobile Legends Tournaments
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Build your squad, compete against other teams and fight for
              exciting rewards.
            </p>
          </div>
        </div>
      </section>

      {/* Tournament Section */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="mb-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
              Upcoming
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              Mobile Legends Tournaments
            </h2>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
              Unable to load Mobile Legends tournaments right now.
            </div>
          ) : !tournaments || tournaments.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <h3 className="text-xl font-black text-slate-950">
                No Mobile Legends tournaments available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                New Mobile Legends tournaments will appear here when they are
                created.
              </p>

              <Link
                href="/tournaments"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-yellow-500"
              >
                View All Tournaments
                <ArrowRight size={17} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((tournament) => {
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
                        MOBILE LEGENDS
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