"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Payment = {
  id: string;
  user_id: string;
  tournament_id: string;
  amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  status: string;
  created_at: string;
};

type Tournament = {
  id: string;
  title: string;
  game: string;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
  email: string;
};

type PaymentRow = {
  payment: Payment;
  tournament: Tournament | null;
  profile: Profile | null;
};

export default function AdminPaymentsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadPayments() {
    setLoading(true);
    setError("");

    const { data: payments, error: paymentError } = await supabase
      .from("payments")
      .select(
        "id, user_id, tournament_id, amount, payment_method, transaction_id, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (paymentError) {
      setError(paymentError.message);
      setLoading(false);
      return;
    }

    if (!payments || payments.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const tournamentIds = [
      ...new Set(payments.map((payment) => payment.tournament_id)),
    ];

    const userIds = [
      ...new Set(payments.map((payment) => payment.user_id)),
    ];

    const [
      { data: tournaments, error: tournamentError },
      { data: profiles, error: profileError },
    ] = await Promise.all([
      supabase
        .from("tournaments")
        .select("id, title, game")
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

    const combined: PaymentRow[] = payments.map((payment) => ({
      payment: payment as Payment,
      tournament:
        (tournaments || []).find(
          (tournament) => tournament.id === payment.tournament_id
        ) as Tournament | null,
      profile:
        (profiles || []).find(
          (profile) => profile.id === payment.user_id
        ) as Profile | null,
    }));

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
  
      loadPayments();
    }
  
    checkAdmin();
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function statusClass(status: string) {
    if (status === "paid") {
      return "bg-green-100 text-green-700";
    }

    if (status === "pending") {
      return "bg-yellow-100 text-yellow-700";
    }

    if (status === "failed") {
      return "bg-red-100 text-red-700";
    }

    if (status === "refunded") {
      return "bg-purple-100 text-purple-700";
    }

    return "bg-slate-100 text-slate-700";
  }

  const totalPaid = rows
    .filter((row) => row.payment.status === "paid")
    .reduce((total, row) => total + Number(row.payment.amount), 0);

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

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
              <CreditCard size={24} />
            </div>

            <div>
              <h1 className="text-3xl font-black text-slate-950">
                Payments
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Review tournament payment records.
              </p>
            </div>
          </div>
        </div>

        {/* SUMMARY */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Payments
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              {rows.length}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total Paid
            </p>

            <p className="mt-2 text-3xl font-black text-slate-950">
              NPR {totalPaid.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* TABLE */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-sm text-slate-500">
              Loading payments...
            </div>
          ) : rows.length === 0 ? (
            <div className="p-10 text-center">
              <h2 className="text-xl font-bold text-slate-900">
                No payments yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Payment records will appear here.
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP */}
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
                        Amount
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Method
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Transaction ID
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Status
                      </th>

                      <th className="px-5 py-4 text-xs font-black uppercase text-slate-500">
                        Date
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((row) => (
                      <tr
                        key={row.payment.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="px-5 py-5">
                          <p className="font-bold text-slate-900">
                            {row.profile?.full_name || "Unknown Player"}
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
                            {row.tournament?.title || "Unknown Tournament"}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {row.tournament?.game || "-"}
                          </p>
                        </td>

                        <td className="px-5 py-5 font-black text-slate-900">
                          NPR {Number(row.payment.amount).toLocaleString("en-IN")}
                        </td>

                        <td className="px-5 py-5 text-sm font-semibold text-slate-700">
                          {row.payment.payment_method || "-"}
                        </td>

                        <td className="px-5 py-5">
                          <code className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-700">
                            {row.payment.transaction_id || "-"}
                          </code>
                        </td>

                        <td className="px-5 py-5">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              row.payment.status
                            )}`}
                          >
                            {row.payment.status.toUpperCase()}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-sm text-slate-600">
                          {formatDate(row.payment.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}
              <div className="space-y-4 p-4 md:hidden">
                {rows.map((row) => (
                  <div
                    key={row.payment.id}
                    className="rounded-xl border border-slate-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-slate-900">
                          {row.profile?.full_name || "Unknown Player"}
                        </h2>

                        <p className="text-sm text-slate-500">
                          @{row.profile?.username || "unknown"}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                          row.payment.status
                        )}`}
                      >
                        {row.payment.status}
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
                          Amount:{" "}
                        </span>

                        <span className="font-bold text-slate-900">
                          NPR {Number(row.payment.amount).toLocaleString("en-IN")}
                        </span>
                      </p>

                      <p>
                        <span className="text-slate-400">
                          Method:{" "}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {row.payment.payment_method || "-"}
                        </span>
                      </p>

                      <p className="break-all">
                        <span className="text-slate-400">
                          Transaction:{" "}
                        </span>

                        <span className="font-mono text-xs font-semibold text-slate-900">
                          {row.payment.transaction_id || "-"}
                        </span>
                      </p>

                      <p>
                        <span className="text-slate-400">
                          Date:{" "}
                        </span>

                        <span className="font-semibold text-slate-900">
                          {formatDate(row.payment.created_at)}
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