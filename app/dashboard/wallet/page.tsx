"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet as WalletIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Wallet = {
  id: string;
  user_id: string;
  balance: number;
};

type Transaction = {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  status: string;
  created_at: string;
};

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadWallet() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Please log in to view your wallet.");
        setLoading(false);
        return;
      }

      const { data: walletData, error: walletError } =
        await supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .single();

      if (walletError) {
        console.error(walletError);
        setError("Unable to load your wallet.");
        setLoading(false);
        return;
      }

      const { data: transactionData } = await supabase
        .from("wallet_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        })
        .limit(10);

      setWallet(walletData);
      setTransactions(transactionData || []);
      setLoading(false);
    }

    loadWallet();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-semibold text-slate-500">
              Loading wallet...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="mt-6 rounded-3xl border border-red-200 bg-white p-10 text-center">
            <p className="font-bold text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>

            <h1 className="mt-5 text-4xl font-black text-slate-950">
              My Wallet
            </h1>

            <p className="mt-2 text-slate-500">
              Manage your Play & Win balance and transactions.
            </p>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="mt-8 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">

          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white/60">
                Available Balance
              </p>

              <h2 className="mt-3 text-4xl font-black sm:text-5xl">
                NPR{" "}
                {Number(wallet?.balance || 0).toLocaleString(
                  "en-NP",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </h2>
            </div>

            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-400 text-slate-950">
              <WalletIcon size={28} />
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">

            <Link
              href="/dashboard/wallet/deposit"
              className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-4 font-black text-slate-950 transition hover:bg-yellow-300"
            >
              <ArrowDownToLine size={19} />
              Add Money
            </Link>

            <Link
              href="/dashboard/wallet/withdraw"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-4 font-black text-white transition hover:bg-white/20"
            >
              <ArrowUpFromLine size={19} />
              Withdraw
            </Link>

          </div>

        </div>

        {/* Rules */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Minimum Deposit
            </p>

            <p className="mt-2 text-xl font-black text-slate-950">
              NPR 50
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Minimum Withdrawal
            </p>

            <p className="mt-2 text-xl font-black text-slate-950">
              NPR 50
            </p>
          </div>

        </div>

        {/* Transaction History */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Transaction History
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Your latest wallet activity.
              </p>
            </div>
          </div>

          {transactions.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center">
              <WalletIcon
                size={30}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-bold text-slate-600">
                No transactions yet
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Your deposits, withdrawals, entries and prizes
                will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-6 divide-y divide-slate-100">
              {transactions.map((transaction) => {
                const positive = [
                  "deposit",
                  "prize",
                  "refund",
                  "bonus",
                ].includes(transaction.type);

                return (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <div className="flex items-center gap-3">

                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          positive
                            ? "bg-green-100 text-green-600"
                            : "bg-red-100 text-red-600"
                        }`}
                      >
                        {positive ? "+" : "-"}
                      </div>

                      <div>
                        <p className="font-bold capitalize text-slate-950">
                          {transaction.type.replace(
                            "_",
                            " "
                          )}
                        </p>

                        <p className="text-xs text-slate-400">
                          {transaction.description ||
                            "Wallet transaction"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {new Date(
                            transaction.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                    </div>

                    <div className="text-right">
                      <p
                        className={`font-black ${
                          positive
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {positive ? "+" : "-"} NPR{" "}
                        {Number(
                          transaction.amount
                        ).toLocaleString()}
                      </p>

                      <p className="text-xs capitalize text-slate-400">
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

      </div>
    </main>
  );
}