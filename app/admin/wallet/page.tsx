"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Wallet,
  Image as ImageIcon,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type DepositRequest = {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  payment_proof: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type WithdrawalRequest = {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  account_number: string;
  account_name: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

type Profile = {
  id: string;
  full_name: string;
  username: string;
  email: string;
};

export default function AdminWalletPage() {
  const [deposits, setDeposits] = useState<DepositRequest[]>([]);
  const [withdrawals, setWithdrawals] = useState<
    WithdrawalRequest[]
  >([]);
  const [profiles, setProfiles] = useState<
    Record<string, Profile>
  >({});

const [proofUrls, setProofUrls] = useState<
  Record<string, string>
>({});
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequests() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const {
      data: {
        user,
      },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    // Make sure this user is actually an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      setError("You are not authorized to access this page.");
      setLoading(false);
      return;
    }

    const { data: depositData, error: depositError } =
      await supabase
        .from("deposit_requests")
        .select("*")
        .eq("status", "pending")
        .order("created_at", {
          ascending: false,
        });

    if (depositError) {
      console.error(depositError);
      setError("Unable to load deposit requests.");
      setLoading(false);
      return;
    }

    const {
      data: withdrawalData,
      error: withdrawalError,
    } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", {
        ascending: false,
      });

    if (withdrawalError) {
      console.error(withdrawalError);
      setError("Unable to load withdrawal requests.");
      setLoading(false);
      return;
    }

    const userIds = Array.from(
      new Set([
        ...(depositData || []).map(
          (item) => item.user_id
        ),
        ...(withdrawalData || []).map(
          (item) => item.user_id
        ),
      ])
    );

    let profileMap: Record<string, Profile> = {};

    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select(
          "id, full_name, username, email"
        )
        .in("id", userIds);

      if (profileData) {
        profileMap = Object.fromEntries(
          profileData.map((item) => [
            item.id,
            item,
          ])
        );
      }
    }

    const proofUrlMap: Record<string, string> = {};

for (const deposit of depositData || []) {
  if (!deposit.payment_proof) {
    continue;
  }

  const { data: signedUrlData, error: signedUrlError } =
    await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(
        deposit.payment_proof,
        60 * 60
      );

  if (!signedUrlError && signedUrlData?.signedUrl) {
    proofUrlMap[deposit.id] =
      signedUrlData.signedUrl;
  }
}

setDeposits(depositData || []);
setWithdrawals(withdrawalData || []);
setProfiles(profileMap);
setProofUrls(proofUrlMap);
setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function processDeposit(
    requestId: string,
    approve: boolean
  ) {
    setProcessing(requestId);
    setError("");
    setMessage("");

    const supabase = createClient();

    const note = approve
      ? "Deposit approved by admin."
      : "Deposit rejected by admin.";

    const { error: rpcError } = await supabase.rpc(
      "process_deposit_request",
      {
        request_id: requestId,
        approve_request: approve,
        note,
      }
    );

    if (rpcError) {
      console.error(rpcError);
      setError(
        rpcError.message ||
          "Unable to process deposit request."
      );
      setProcessing("");
      return;
    }

    setMessage(
      approve
        ? "Deposit approved and wallet credited."
        : "Deposit rejected."
    );

    setProcessing("");
    await loadRequests();
  }

  async function processWithdrawal(
    requestId: string,
    approve: boolean
  ) {
    setProcessing(requestId);
    setError("");
    setMessage("");

    const supabase = createClient();

    const note = approve
      ? "Withdrawal approved by admin."
      : "Withdrawal rejected by admin.";

    const { error: rpcError } = await supabase.rpc(
      "process_withdrawal_request",
      {
        request_id: requestId,
        approve_request: approve,
        note,
      }
    );

    if (rpcError) {
      console.error(rpcError);
      setError(
        rpcError.message ||
          "Unable to process withdrawal request."
      );
      setProcessing("");
      return;
    }

    setMessage(
      approve
        ? "Withdrawal approved and wallet balance updated."
        : "Withdrawal rejected."
    );

    setProcessing("");
    await loadRequests();
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
            >
              <ArrowLeft size={16} />
              Back to Admin
            </Link>

            <div className="mt-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                <Wallet size={24} />
              </div>

              <div>
                <h1 className="text-3xl font-black text-slate-950">
                  Wallet Management
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Review deposits and withdrawal requests.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            <RefreshCw
              size={17}
              className={
                loading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>

        </div>

        {/* Messages */}
        {message && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Pending Deposits */}
        <section className="mt-8">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Pending Deposits
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Verify payment before crediting the wallet.
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-black text-yellow-700">
              {deposits.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <p className="font-semibold text-slate-500">
                Loading deposits...
              </p>
            </div>
          ) : deposits.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <Wallet
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-bold text-slate-600">
                No pending deposits
              </p>

              <p className="mt-1 text-sm text-slate-400">
                New manual deposit requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {deposits.map((deposit) => {
                const profile =
                  profiles[deposit.user_id];

                return (
                  <div
                    key={deposit.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-5">

                      <div>
                        <p className="text-lg font-black text-slate-950">
                          NPR{" "}
                          {Number(
                            deposit.amount
                          ).toLocaleString()}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {profile?.full_name ||
                            "Unknown User"}
                        </p>

                        <p className="text-xs text-slate-400">
                          @{profile?.username ||
                            "unknown"}
                        </p>
                      </div>

                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black uppercase text-yellow-700">
                        Pending
                      </span>

                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Payment Method
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {deposit.payment_method}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Transaction ID
                        </p>

                        <p className="mt-1 break-all font-bold text-slate-950">
                          {deposit.transaction_id ||
                            "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Submitted
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {new Date(
                            deposit.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                    </div>

                    {deposit.payment_proof && (
  <div className="mt-6 rounded-2xl bg-slate-50 p-5">

    <div className="flex items-center gap-2">
      <ImageIcon
        size={18}
        className="text-yellow-600"
      />

      <p className="text-sm font-bold text-slate-950">
        Payment Screenshot
      </p>
    </div>

    {proofUrls[deposit.id] ? (
      <div className="mt-4">
        <img
          src={proofUrls[deposit.id]}
          alt="Payment screenshot"
          className="max-h-[500px] w-full rounded-2xl border border-slate-200 bg-white object-contain"
        />
      </div>
    ) : (
      <p className="mt-3 text-sm text-slate-400">
        Screenshot could not be loaded.
      </p>
    )}

  </div>
)}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                      <button
                        onClick={() =>
                          processDeposit(
                            deposit.id,
                            true
                          )
                        }
                        disabled={
                          processing === deposit.id
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />

                        {processing ===
                        deposit.id
                          ? "Processing..."
                          : "Approve Deposit"}
                      </button>

                      <button
                        onClick={() =>
                          processDeposit(
                            deposit.id,
                            false
                          )
                        }
                        disabled={
                          processing === deposit.id
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </section>

        {/* Pending Withdrawals */}
        <section className="mt-12">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">
                Pending Withdrawals
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review withdrawal requests before sending payment.
              </p>
            </div>

            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-black text-blue-700">
              {withdrawals.length} Pending
            </span>
          </div>

          {loading ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <p className="font-semibold text-slate-500">
                Loading withdrawals...
              </p>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center">
              <Wallet
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 font-bold text-slate-600">
                No pending withdrawals
              </p>

              <p className="mt-1 text-sm text-slate-400">
                New withdrawal requests will appear here.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {withdrawals.map((withdrawal) => {
                const profile =
                  profiles[withdrawal.user_id];

                return (
                  <div
                    key={withdrawal.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                  >

                    <div className="flex flex-wrap items-start justify-between gap-5">

                      <div>
                        <p className="text-lg font-black text-slate-950">
                          NPR{" "}
                          {Number(
                            withdrawal.amount
                          ).toLocaleString()}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-600">
                          {profile?.full_name ||
                            "Unknown User"}
                        </p>

                        <p className="text-xs text-slate-400">
                          @{profile?.username ||
                            "unknown"}
                        </p>
                      </div>

                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black uppercase text-yellow-700">
                        Pending
                      </span>

                    </div>

                    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Method
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {withdrawal.payment_method}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Account
                        </p>

                        <p className="mt-1 break-all font-bold text-slate-950">
                          {withdrawal.account_number}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Account Name
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {withdrawal.account_name ||
                            "Not provided"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Submitted
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {new Date(
                            withdrawal.created_at
                          ).toLocaleString()}
                        </p>
                      </div>

                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                      <button
                        onClick={() =>
                          processWithdrawal(
                            withdrawal.id,
                            true
                          )
                        }
                        disabled={
                          processing ===
                          withdrawal.id
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 font-black text-white transition hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={18} />

                        {processing ===
                        withdrawal.id
                          ? "Processing..."
                          : "Approve Withdrawal"}
                      </button>

                      <button
                        onClick={() =>
                          processWithdrawal(
                            withdrawal.id,
                            false
                          )
                        }
                        disabled={
                          processing ===
                          withdrawal.id
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 font-black text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                      >
                        <XCircle size={18} />
                        Reject
                      </button>

                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </section>

      </div>
    </main>
  );
}