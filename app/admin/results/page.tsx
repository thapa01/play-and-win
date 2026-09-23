"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tournament = {
  id: string;
  title: string;
  game: string;
  start_date: string;
  status: string;
};

export default function AdminResultsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profileError || profile?.role !== "admin") {
        router.push("/dashboard");
        return;
      }

      const { data, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, title, game, start_date, status")
        .order("start_date", { ascending: false });

      if (tournamentError) {
        throw tournamentError;
      }

      setTournaments((data as Tournament[]) || []);
    } catch (err) {
      console.error("Tournament results load error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load tournaments."
      );
    } finally {
      setLoading(false);
    }
  }

  function openTournament(tournamentId: string) {
    router.push(`/admin/results/${tournamentId}`);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString();
  }

  function getStatusClasses(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";

      case "live":
        return "bg-red-100 text-red-700";

      case "cancelled":
        return "bg-slate-200 text-slate-600";

      default:
        return "bg-yellow-100 text-yellow-700";
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading tournaments...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin")}
            className="mb-5 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-slate-900 shadow-sm">
              <Trophy className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                Tournament Results
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Select a tournament to enter player results.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Tournament List */}
        {tournaments.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Trophy className="mx-auto h-10 w-10 text-slate-300" />

            <h2 className="mt-4 text-lg font-bold text-slate-900">
              No tournaments found
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Create a tournament before entering results.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tournaments.map((tournament) => (
              <button
                key={tournament.id}
                type="button"
                onClick={() => openTournament(tournament.id)}
                className="group w-full cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-400 hover:shadow-md"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  {/* Tournament information */}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 transition group-hover:text-slate-700">
                      {tournament.title}
                    </h2>

                    <p className="mt-1 text-sm font-medium text-slate-500">
                      {tournament.game}
                    </p>

                    <p className="mt-1 text-sm text-slate-400">
                      {formatDate(tournament.start_date)}
                    </p>
                  </div>

                  {/* Status + action */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${getStatusClasses(
                        tournament.status
                      )}`}
                    >
                      {tournament.status}
                    </span>

                    <span className="hidden text-sm font-bold text-slate-400 transition group-hover:text-slate-900 sm:block">
                      Enter Results →
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}