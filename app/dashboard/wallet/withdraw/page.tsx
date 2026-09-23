"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowUpFromLine,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function WithdrawPage() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("eSewa");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount < 50) {
      setError("Minimum withdrawal amount is NPR 50.");
      return;
    }

    if (!accountNumber.trim()) {
      setError("Please enter your account number or mobile number.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in to withdraw money.");
      }

      // Get current wallet balance
      const { data: wallet, error: walletError } =
        await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .single();

      if (walletError || !wallet) {
        throw new Error("Unable to load your wallet balance.");
      }

      const currentBalance = Number(wallet.balance);

      if (numericAmount > currentBalance) {
        throw new Error(
          `Insufficient wallet balance. Your available balance is NPR ${currentBalance.toLocaleString()}.`
        );
      }

      // Check for an existing pending withdrawal
      const { data: pendingRequest } = await supabase
        .from("withdrawal_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

      if (pendingRequest) {
        throw new Error(
          "You already have a pending withdrawal request."
        );
      }

      // Create withdrawal request
      const { error: insertError } = await supabase
        .from("withdrawal_requests")
        .insert({
          user_id: user.id,
          amount: numericAmount,
          payment_method: paymentMethod,
          account_number: accountNumber.trim(),
          account_name: accountName.trim() || null,
          status: "pending",
        });

      if (insertError) {
        console.error(insertError);
        throw new Error(
          "Unable to submit your withdrawal request."
        );
      }

      setAmount("");
      setAccountNumber("");
      setAccountName("");

      window.location.href = "/dashboard/wallet/withdraw/success";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Back */}
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to Wallet
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">

          {/* Form */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                <ArrowUpFromLine size={26} />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-wider text-green-600">
                  Wallet
                </p>

                <h1 className="text-3xl font-black text-slate-950">
                  Withdraw Money
                </h1>
              </div>

            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Request a withdrawal from your wallet. All withdrawals
              are manually reviewed by the admin.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-6"
            >

              {/* Amount */}
              <div>
                <label className="text-sm font-bold text-slate-950">
                  Withdrawal Amount
                </label>

                <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-950">
                  <span className="flex items-center border-r border-slate-200 px-4 font-bold text-slate-500">
                    NPR
                  </span>

                  <input
                    type="number"
                    min="50"
                    step="1"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 outline-none"
                    required
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Minimum withdrawal: NPR 50
                </p>
              </div>

              {/* Quick Amounts */}
              <div>
                <p className="text-sm font-bold text-slate-950">
                  Quick Amount
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[50, 100, 500, 1000].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setAmount(String(value))
                        }
                        className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                      >
                        NPR {value}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-sm font-bold text-slate-950">
                  Withdrawal Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(event) =>
                    setPaymentMethod(event.target.value)
                  }
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-slate-950"
                >
                  <option value="eSewa">
                    eSewa
                  </option>

                  <option value="Khalti">
                    Khalti
                  </option>

                  <option value="Bank Transfer">
                    Bank Transfer
                  </option>

                  <option value="FonePay">
                    FonePay
                  </option>
                </select>
              </div>

              {/* Account Number */}
              <div>
                <label className="text-sm font-bold text-slate-950">
                  Account / Mobile Number
                </label>

                <input
                  type="text"
                  value={accountNumber}
                  onChange={(event) =>
                    setAccountNumber(event.target.value)
                  }
                  placeholder="Enter eSewa / Khalti / bank account number"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-950"
                  required
                />
              </div>

              {/* Account Name */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-slate-950">
                    Account Name
                  </label>

                  <span className="text-xs text-slate-400">
                    Optional
                  </span>
                </div>

                <input
                  type="text"
                  value={accountName}
                  onChange={(event) =>
                    setAccountName(event.target.value)
                  }
                  placeholder="Name on payment account"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-slate-950"
                />
              </div>

              {/* Messages */}
              {success && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold leading-6 text-green-700">
                  {success}
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-slate-950 px-6 py-4 font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Submitting..."
                  : "Submit Withdrawal Request"}
              </button>

            </form>
          </div>

          {/* Information */}
          <div className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

            <div className="flex items-center gap-3">
              <ShieldCheck
                size={22}
                className="text-green-600"
              />

              <h2 className="text-lg font-black text-slate-950">
                Withdrawal Information
              </h2>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-50 p-5">

              <div className="flex justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Minimum
                </span>

                <span className="font-black text-slate-950">
                  NPR 50
                </span>
              </div>

              <div className="mt-4 flex justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Verification
                </span>

                <span className="font-black text-yellow-600">
                  Manual
                </span>
              </div>

              <div className="mt-4 flex justify-between gap-4">
                <span className="text-sm text-slate-500">
                  Processing
                </span>

                <span className="font-black text-slate-950">
                  Admin Approval
                </span>
              </div>

            </div>

            <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">

              <p className="text-sm font-bold text-slate-950">
                Important
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Your wallet balance will be checked when you submit
                the request. The money will only be deducted after
                the withdrawal is approved.
              </p>

            </div>

          </div>

        </div>
      </div>
    </main>
  );
}