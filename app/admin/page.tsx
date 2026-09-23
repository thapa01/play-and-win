"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Users,
  CreditCard,
  KeyRound,
  Wallet,
  Tag,
  ArrowDownToLine,
  Gamepad2,
  Gift,
  MessageCircle,
  RotateCcw,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Clock3,
  ChevronRight,
  Sparkles,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type FinancialSummary = {
  total_deposits: number;
  today_deposits: number;
  total_entry_fees: number;
  today_entry_fees: number;
  total_prizes: number;
  today_prizes: number;
  total_refunds: number;
  today_refunds: number;
};

export default function AdminDashboard() {
  const supabase = createClient();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [stats, setStats] = useState({
    tournaments: 0,
    registrations: 0,
    payments: 0,
    gameAccess: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    activePromoCodes: 0,
  });

  const [financials, setFinancials] = useState<FinancialSummary>({
    total_deposits: 0,
    today_deposits: 0,
    total_entry_fees: 0,
    today_entry_fees: 0,
    total_prizes: 0,
    today_prizes: 0,
    total_refunds: 0,
    today_refunds: 0,
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

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

      const [
        tournamentsResult,
        registrationsResult,
        paymentsResult,
        gameAccessResult,
        depositsResult,
        withdrawalsResult,
        promoCodesResult,
        financialResult,
      ] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("tournament_registrations")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("payments")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("game_access")
          .select("id", { count: "exact", head: true }),

        supabase
          .from("deposit_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("withdrawal_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),

        supabase
          .from("promo_codes")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true),

        supabase.rpc("get_admin_financial_summary"),
      ]);

      setStats({
        tournaments: tournamentsResult.count ?? 0,
        registrations: registrationsResult.count ?? 0,
        payments: paymentsResult.count ?? 0,
        gameAccess: gameAccessResult.count ?? 0,
        pendingDeposits: depositsResult.count ?? 0,
        pendingWithdrawals: withdrawalsResult.count ?? 0,
        activePromoCodes: promoCodesResult.count ?? 0,
      });

      if (
        !financialResult.error &&
        financialResult.data &&
        financialResult.data.length > 0
      ) {
        setFinancials(financialResult.data[0]);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const money = (amount: number) =>
    `NPR ${Number(amount || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const netTournamentBalance =
    Number(financials.total_entry_fees || 0) -
    Number(financials.total_prizes || 0) -
    Number(financials.total_refunds || 0);

  const todayNetTournamentBalance =
    Number(financials.today_entry_fees || 0) -
    Number(financials.today_prizes || 0) -
    Number(financials.today_refunds || 0);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-700 border-t-blue-500" />
          <p className="text-sm text-slate-400">
            Loading admin dashboard...
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
      {/* ===================================================== */}
      {/* PREMIUM HEADER */}
      {/* ===================================================== */}

      <section className="relative overflow-hidden bg-slate-950">
        {/* Background glow */}
        <div className="absolute -left-24 -top-32 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <div className="rounded-lg bg-blue-500/15 p-2 text-blue-400">
                  <Sparkles size={16} />
                </div>

                <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">
                  Play & Win
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Admin Dashboard
              </h1>

              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
                Manage tournaments, players, wallets and platform activity
                from one place.
              </p>
            </div>

            <div className="flex items-center gap-3">
  <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
    <ShieldCheck size={18} className="text-emerald-400" />

    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        Account
      </p>

      <p className="text-sm font-semibold text-white">
        Administrator
      </p>
    </div>
  </div>

  <button
    onClick={handleLogout}
    className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
  >
    <LogOut size={17} />
    Logout
  </button>
</div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-10 px-5 py-8 sm:px-6 lg:px-8">
        {/* ===================================================== */}
        {/* FINANCIAL OVERVIEW */}
        {/* ===================================================== */}

        <section>
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">
                  Financial Overview
                </h2>

                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  Live
                </span>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Overview of wallet and tournament financial activity.
              </p>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Clock3 size={14} />
              Today&apos;s figures are shown inside each card
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Deposits */}
            <FinancialCard
              title="Total Deposits"
              value={money(financials.total_deposits)}
              today={money(financials.today_deposits)}
              subtitle="Added to player wallets"
              icon={<ArrowDownToLine size={21} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            {/* Entry Fees */}
            <FinancialCard
              title="Entry Fees"
              value={money(financials.total_entry_fees)}
              today={money(financials.today_entry_fees)}
              subtitle="Tournament entry money"
              icon={<Gamepad2 size={21} />}
              iconClass="bg-violet-50 text-violet-600"
            />

            {/* Prizes */}
            <FinancialCard
              title="Prizes Distributed"
              value={money(financials.total_prizes)}
              today={money(financials.today_prizes)}
              subtitle="Awarded to players"
              icon={<Gift size={21} />}
              iconClass="bg-amber-50 text-amber-600"
            />

            {/* Refunds */}
            <FinancialCard
              title="Refunds"
              value={money(financials.total_refunds)}
              today={money(financials.today_refunds)}
              subtitle="Returned to players"
              icon={<RotateCcw size={21} />}
              iconClass="bg-rose-50 text-rose-600"
            />
          </div>

          {/* NET BALANCE */}
          <div className="relative mt-4 overflow-hidden rounded-3xl bg-slate-950 p-6 shadow-xl sm:p-7">
            <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-blue-600/20 blur-3xl" />
            <div className="absolute -bottom-24 left-1/3 h-60 w-60 rounded-full bg-purple-600/10 blur-3xl" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-white/10 p-2.5 text-blue-400">
                    <TrendingUp size={21} />
                  </div>

                  <span className="text-sm font-semibold text-slate-300">
                    Net Tournament Balance
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {money(netTournamentBalance)}
                  </p>

                  <p className="mt-2 text-sm text-slate-400">
                    Entry Fees − Prizes − Refunds
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                <BalanceMiniCard
                  label="Entry Fees"
                  value={money(financials.total_entry_fees)}
                />

                <BalanceMiniCard
                  label="Prizes"
                  value={money(financials.total_prizes)}
                />

                <BalanceMiniCard
                  label="Refunds"
                  value={money(financials.total_refunds)}
                />
              </div>
            </div>

            <div className="relative mt-6 flex items-center justify-between border-t border-white/10 pt-4">
              <span className="text-xs text-slate-500">
                Today&apos;s net tournament balance
              </span>

              <span className="text-sm font-bold text-white">
                {money(todayNetTournamentBalance)}
              </span>
            </div>
          </div>
        </section>

        {/* ===================================================== */}
        {/* PLATFORM STATS */}
        {/* ===================================================== */}

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Platform Overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quick snapshot of your gaming platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Tournaments"
              value={stats.tournaments}
              icon={<Trophy size={21} />}
              iconClass="bg-amber-50 text-amber-600"
            />

            <StatCard
              title="Registrations"
              value={stats.registrations}
              icon={<Users size={21} />}
              iconClass="bg-blue-50 text-blue-600"
            />

            <StatCard
              title="Payments"
              value={stats.payments}
              icon={<CreditCard size={21} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <StatCard
              title="Game Access"
              value={stats.gameAccess}
              icon={<KeyRound size={21} />}
              iconClass="bg-violet-50 text-violet-600"
            />
          </div>
        </section>

        {/* ===================================================== */}
        {/* PENDING ACTIONS */}
        {/* ===================================================== */}

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Pending Actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Items that may need your attention.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {/* Wallet */}
            <Link
              href="/admin/wallet"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl"
            >
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-blue-50 opacity-0 blur-2xl transition group-hover:opacity-100" />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                    <Wallet size={22} />
                  </div>

                  {stats.pendingDeposits + stats.pendingWithdrawals > 0 ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600">
                      <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                      Action Required
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-600">
                      All Clear
                    </span>
                  )}
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Wallet Requests
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Review deposits and withdrawal requests.
                    </p>
                  </div>

                  <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition group-hover:bg-blue-600 group-hover:text-white">
                    <ArrowUpRight size={17} />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">Pending Deposits</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {stats.pendingDeposits}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400">
                      Pending Withdrawals
                    </p>
                    <p className="mt-1 text-xl font-bold text-slate-900">
                      {stats.pendingWithdrawals}
                    </p>
                  </div>
                </div>
              </div>
            </Link>

            {/* Promo */}
            <Link
              href="/admin/promo-codes"
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-purple-200 hover:shadow-xl"
            >
              <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-purple-50 opacity-0 blur-2xl transition group-hover:opacity-100" />

              <div className="relative">
                <div className="flex items-start justify-between">
                  <div className="rounded-xl bg-purple-50 p-3 text-purple-600">
                    <Tag size={22} />
                  </div>

                  <span className="rounded-full bg-purple-50 px-3 py-1.5 text-[11px] font-bold text-purple-600">
                    {stats.activePromoCodes} Active
                  </span>
                </div>

                <div className="mt-5 flex items-end justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      Promo Codes
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      Create and manage promotional offers.
                    </p>
                  </div>

                  <div className="rounded-full bg-slate-100 p-2 text-slate-500 transition group-hover:bg-purple-600 group-hover:text-white">
                    <ArrowUpRight size={17} />
                  </div>
                </div>

                <div className="mt-6 rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">
                    Currently Active Codes
                  </p>

                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {stats.activePromoCodes}
                  </p>
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* ===================================================== */}
        {/* MANAGEMENT */}
        {/* ===================================================== */}

        <section>
          <div className="mb-5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Management
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Access and manage every major area of the platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AdminCard
              href="/admin/tournaments"
              icon={<Trophy size={22} />}
              title="Tournaments"
              description="Create, edit and manage tournaments."
              iconClass="bg-amber-50 text-amber-600"
            />

            <AdminCard
              href="/admin/registrations"
              icon={<Users size={22} />}
              title="Registrations"
              description="View tournament registrations and players."
              iconClass="bg-blue-50 text-blue-600"
            />

            <AdminCard
              href="/admin/payments"
              icon={<CreditCard size={22} />}
              title="Payments"
              description="Review tournament payment records."
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <AdminCard
              href="/admin/game-access"
              icon={<KeyRound size={22} />}
              title="Game Access"
              description="Manage room IDs, passwords and player access."
              iconClass="bg-violet-50 text-violet-600"
            />

            <AdminCard
              href="/admin/wallet"
              icon={<Wallet size={22} />}
              title="Wallet"
              description="Approve deposits and withdrawals."
              iconClass="bg-blue-50 text-blue-600"
            />

            <AdminCard
              href="/admin/promo-codes"
              icon={<Tag size={22} />}
              title="Promo Codes"
              description="Manage discounts and promotional codes."
              iconClass="bg-purple-50 text-purple-600"
            />

            <AdminCard
              href="/admin/referrals"
              icon={<Gift size={22} />}
              title="Referral Management"
              description="Review referrals and approve player rewards."
              iconClass="bg-amber-50 text-amber-600"
            />
            <AdminCard
  href="/admin/support"
  icon={<MessageCircle size={22} />}
  title="Support Tickets"
  description="Review and manage player support requests."
  iconClass="bg-blue-50 text-blue-600"
/>
          </div>
        </section>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </main>
  );
}

/* ========================================================= */
/* STAT CARD                                                  */
/* ========================================================= */

function StatCard({
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
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div
          className={`rounded-xl p-3 transition group-hover:scale-105 ${iconClass}`}
        >
          {icon}
        </div>

        <ChevronRight
          size={17}
          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-slate-500"
        />
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">{title}</p>

      <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

/* ========================================================= */
/* FINANCIAL CARD                                             */
/* ========================================================= */

function FinancialCard({
  title,
  value,
  today,
  subtitle,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  today: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div
          className={`rounded-xl p-3 transition group-hover:scale-105 ${iconClass}`}
        >
          {icon}
        </div>

        <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
          All Time
        </span>
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{title}</p>

      <p className="mt-1 text-xl font-bold tracking-tight text-slate-900">
        {value}
      </p>

      <p className="mt-1.5 text-xs leading-5 text-slate-400">{subtitle}</p>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Today
          </p>

          <p className="mt-1 text-sm font-bold text-slate-700">{today}</p>
        </div>

        <div className="rounded-full bg-slate-50 p-2 text-slate-400">
          <TrendingUp size={14} />
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* BALANCE MINI CARD                                          */
/* ========================================================= */

function BalanceMiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-[100px] rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur">
      <p className="text-[10px] font-medium text-slate-500">{label}</p>

      <p className="mt-1 text-xs font-bold text-white sm:text-sm">
        {value}
      </p>
    </div>
  );
}

/* ========================================================= */
/* ADMIN CARD                                                 */
/* ========================================================= */

function AdminCard({
  href,
  icon,
  title,
  description,
  iconClass,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  iconClass: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
    >
      <div className="flex items-start justify-between">
        <div
          className={`rounded-xl p-3 transition duration-300 group-hover:scale-105 ${iconClass}`}
        >
          {icon}
        </div>

        <div className="rounded-full bg-slate-100 p-2 text-slate-400 transition group-hover:bg-slate-900 group-hover:text-white">
          <ChevronRight size={16} />
        </div>
      </div>

      <h3 className="mt-5 text-lg font-bold text-slate-900">{title}</h3>

      <p className="mt-1 text-sm leading-6 text-slate-500">
        {description}
      </p>

      <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-slate-700 transition group-hover:text-blue-600">
        Manage
        <ArrowUpRight
          size={15}
          className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </div>
    </Link>
  );
}