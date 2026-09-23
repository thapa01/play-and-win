"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Clock3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Check,
  Ban,
  WalletCards,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Referral = {
  id: string;
  referrer_id: string;
  referrer_name: string | null;
  referrer_username: string | null;
  referred_id: string;
  referred_name: string | null;
  referred_username: string | null;
  referral_code: string;
  status: "pending" | "approved" | "rejected";
  reward_amount: number;
  created_at: string;
};

export default function AdminReferralsPage() {
  const supabase = createClient();

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [rewardAmounts, setRewardAmounts] = useState<
    Record<string, string>
  >({});

  async function loadReferrals() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    setAuthorized(true);

    const { data, error: referralError } = await supabase.rpc(
      "get_admin_referrals"
    );

    if (referralError) {
      console.error("Admin referrals error:", referralError);
      setError(referralError.message);
      setReferrals([]);
    } else {
      setReferrals((data || []) as Referral[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadReferrals();
  }, []);

  async function approveAndReward(referralId: string) {
    const amountText = rewardAmounts[referralId]?.trim() || "";

    const amount = Number(amountText);

    if (!amountText || !Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid reward amount greater than 0.");
      return;
    }

    const actionKey = `${referralId}-approve`;

    setActionLoading(actionKey);
    setError("");

    const { error: rewardError } = await supabase.rpc(
      "approve_referral_reward",
      {
        input_referral_id: referralId,
        input_reward_amount: amount,
      }
    );

    if (rewardError) {
      console.error("Referral reward error:", rewardError);
      setError(rewardError.message);
      setActionLoading(null);
      return;
    }

    setRewardAmounts((current) => {
      const updated = { ...current };
      delete updated[referralId];
      return updated;
    });

    await loadReferrals();

    setActionLoading(null);
  }

  async function rejectReferral(referralId: string) {
    const actionKey = `${referralId}-reject`;

    setActionLoading(actionKey);
    setError("");

    const { error: rejectError } = await supabase.rpc(
      "update_referral_status",
      {
        input_referral_id: referralId,
        input_status: "rejected",
      }
    );

    if (rejectError) {
      console.error("Referral rejection error:", rejectError);
      setError(rejectError.message);
      setActionLoading(null);
      return;
    }

    await loadReferrals();

    setActionLoading(null);
  }

  const pendingCount = referrals.filter(
    (referral) => referral.status === "pending"
  ).length;

  const approvedCount = referrals.filter(
    (referral) => referral.status === "approved"
  ).length;

  const rejectedCount = referrals.filter(
    (referral) => referral.status === "rejected"
  ).length;

  const money = (amount: number) =>
    `NPR ${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400">
            Loading referral management...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* HEADER */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Admin Dashboard
          </Link>

          <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-lg bg-blue-500/15 p-2 text-blue-400">
                  <Users size={16} />
                </div>

                <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                  Rewards
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Referral Management
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                View and manage players who joined Play & Win through referral
                links.
              </p>
            </div>

            <button
              type="button"
              onClick={loadReferrals}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <RefreshCw size={17} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-6 lg:px-8">
        {/* SUMMARY */}
        <section className="grid gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Pending"
            value={pendingCount}
            icon={<Clock3 size={21} />}
            iconClass="bg-amber-50 text-amber-600"
          />

          <SummaryCard
            title="Approved"
            value={approvedCount}
            icon={<CheckCircle2 size={21} />}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            title="Rejected"
            value={rejectedCount}
            icon={<XCircle size={21} />}
            iconClass="bg-rose-50 text-rose-600"
          />
        </section>

        {/* ERROR */}
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* REFERRALS */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-5">
            <h2 className="text-xl font-bold text-slate-900">
              Referral Records
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Approve a referral and enter the reward amount to credit the
              referrer's wallet.
            </p>
          </div>

          {referrals.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Users size={24} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No referrals yet
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Referral records will appear here when players invite new
                users.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1250px] w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Referrer
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Referred Player
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Referral Code
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Status
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Reward
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Joined
                    </th>

                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {referrals.map((referral) => (
                    <tr
                      key={referral.id}
                      className="transition hover:bg-slate-50"
                    >
                      {/* REFERRER */}
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">
                          {referral.referrer_name || "Unknown Player"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          @{referral.referrer_username || "unknown"}
                        </p>
                      </td>

                      {/* REFERRED PLAYER */}
                      <td className="px-6 py-5">
                        <p className="font-bold text-slate-900">
                          {referral.referred_name || "Unknown Player"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          @{referral.referred_username || "unknown"}
                        </p>
                      </td>

                      {/* CODE */}
                      <td className="px-6 py-5">
                        <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs font-bold tracking-wider text-slate-700">
                          {referral.referral_code}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-6 py-5">
                        <StatusBadge status={referral.status} />
                      </td>

                      {/* REWARD */}
                      <td className="px-6 py-5">
                        <span className="font-bold text-slate-900">
                          {money(referral.reward_amount)}
                        </span>
                      </td>

                      {/* DATE */}
                      <td className="px-6 py-5">
                        <span className="text-sm text-slate-500">
                          {formatDate(referral.created_at)}
                        </span>
                      </td>

                      {/* ACTION */}
                      <td className="px-6 py-5">
                        {referral.status === "pending" ? (
                          <div className="space-y-3">
                            <div className="relative">
                              <WalletCards
                                size={15}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                              />

                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={rewardAmounts[referral.id] || ""}
                                onChange={(e) =>
                                  setRewardAmounts((current) => ({
                                    ...current,
                                    [referral.id]: e.target.value,
                                  }))
                                }
                                placeholder="Reward amount"
                                className="w-40 rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  approveAndReward(referral.id)
                                }
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading ===
                                `${referral.id}-approve` ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                ) : (
                                  <Check size={14} />
                                )}
                                Approve & Reward
                              </button>

                              <button
                                type="button"
                                onClick={() => rejectReferral(referral.id)}
                                disabled={actionLoading !== null}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {actionLoading ===
                                `${referral.id}-reject` ? (
                                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                ) : (
                                  <Ban size={14} />
                                )}
                                Reject
                              </button>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-slate-400">
                            No action
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex rounded-xl p-3 ${iconClass}`}>
        {icon}
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "pending" | "approved" | "rejected";
}) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
        <CheckCircle2 size={14} />
        Approved
      </span>
    );
  }

  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600">
        <XCircle size={14} />
        Rejected
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
      <Clock3 size={14} />
      Pending
    </span>
  );
}