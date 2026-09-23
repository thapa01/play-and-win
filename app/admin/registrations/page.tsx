"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Registration = {
  id: string;
  tournament_id: string;
  user_id: string;
  status: string;
  created_at: string;
};

type Tournament = {
  id: string;
  title: string;
  game: string;
  entry_fee: number;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
  email: string;
};

type RegistrationRow = {
  registration: Registration;
  tournament: Tournament | null;
  profile: Profile | null;
};

export default function AdminRegistrationsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [rows, setRows] = useState<RegistrationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRegistrations() {
    setLoading(true);
    setError("");

    const {
      data: registrations,
      error: registrationError,
    } = await supabase
      .from("tournament_registrations")
      .select("id, tournament_id, user_id, status, created_at")
      .order("created_at", { ascending: false });

    if (registrationError) {
      setError(registrationError.message);
      setLoading(false);
      return;
    }

    if (!registrations || registrations.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const tournamentIds = [
      ...new Set(registrations.map((item) => item.tournament_id)),
    ];

    const userIds = [
      ...new Set(registrations.map((item) => item.user_id)),
    ];

    const [
      { data: tournaments, error: tournamentError },
      { data: profiles, error: profileError },
    ] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, title, game, entry_fee")
        .in("id", tournamentIds),

      supabase
        .from("profiles")
        .select("id, full_name, username, email")
        .in("id", userIds),
    ]);

    if (tournamentError) {
      setError(tournamentError.message);
      setLoading(false);
      return;
    }

    if (profileError) {
      setError(profileError.message);
      setLoading(false);
      return;
    }

    const combined: RegistrationRow[] = registrations.map(
      (registration) => ({
        registration: registration as Registration,
        tournament:
          (tournaments || []).find(
            (tournament) =>
              tournament.id === registration.tournament_id
          ) as Tournament | null,
        profile:
          (profiles || []).find(
            (profile) =>
              profile.id === registration.user_id
          ) as Profile | null,
      })
    );

    setRows(combined);
    setLoading(false);
  }

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) {
        router.push("/login");
        return;
      }
  
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
  
      if (!profile || profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }
  
      loadRegistrations();
    }
  
    checkAdmin();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Admin Dashboard
          </Link>

          <h1 className="text-3xl font-black text-slate-950">
            Registrations
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            View all tournament participants and registrations.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* CONTENT */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading registrations...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-xl font-bold text-slate-900">
                No registrations yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Registered players will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Player
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Tournament
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Game
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Entry Fee
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Registered
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.registration.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-900">
                            {row.profile?.full_name ||
                              "Unknown Player"}
                          </p>

                          <p className="text-sm text-slate-500">
                            @{row.profile?.username || "unknown"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {row.profile?.email || "No email"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-900">
                            {row.tournament?.title ||
                              "Unknown Tournament"}
                          </p>
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                            {row.tournament?.game || "-"}
                          </span>
                        </td>

                        <td className="px-5 py-5 font-bold text-slate-900">
                          {row.tournament?.entry_fee === 0
                            ? "FREE"
                            : `NPR ${row.tournament?.entry_fee}`}
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              row.registration.status ===
                              "registered"
                                ? "bg-green-100 text-green-700"
                                : row.registration.status ===
                                  "cancelled"
                                ? "bg-red-100 text-red-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {row.registration.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {formatDate(
                            row.registration.created_at
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS */}
              <div className="space-y-4 p-4 md:hidden">
                {rows.map((row) => (
                  <div
                    key={row.registration.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {row.profile?.full_name ||
                            "Unknown Player"}
                        </h2>

                        <p className="text-sm text-slate-500">
                          @{row.profile?.username || "unknown"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                          row.registration.status ===
                          "registered"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {row.registration.status}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm">
                      <p>
                        <span className="text-slate-400">
                          Tournament:{" "}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {row.tournament?.title || "-"}
                        </span>
                      </p>

                      <p>
                        <span className="text-slate-400">
                          Game:{" "}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {row.tournament?.game || "-"}
                        </span>
                      </p>

                      <p>
                        <span className="text-slate-400">
                          Entry Fee:{" "}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {row.tournament?.entry_fee === 0
                            ? "FREE"
                            : `NPR ${row.tournament?.entry_fee}`}
                        </span>
                      </p>

                      <p>
                        <span className="text-slate-400">
                          Registered:{" "}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {formatDate(
                            row.registration.created_at
                          )}
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}