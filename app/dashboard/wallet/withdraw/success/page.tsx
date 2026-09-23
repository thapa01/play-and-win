"use client";

import Link from "next/link";
import { Check, ArrowLeft } from "lucide-react";

export default function WithdrawSuccessPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-100">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-green-600">
                <Check size={32} className="text-green-600" strokeWidth={3} />
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-8 text-center">
            <p className="text-sm font-black uppercase tracking-[0.25em] text-green-600">
              Withdrawal Request
            </p>

            <h1 className="mt-4 text-4xl font-black text-slate-950 sm:text-5xl">
              Withdrawal Submitted Successfully
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              Your withdrawal request has been submitted successfully.
              An admin will review your request and process the withdrawal
              after approval.
            </p>
          </div>

          {/* Steps */}
          <div className="mt-10 space-y-4">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
                  1
                </div>

                <div>
                  <h2 className="font-black text-slate-950">
                    Withdrawal request submitted
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Your withdrawal request is now waiting for admin
                    verification.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-black text-white">
                  2
                </div>

                <div>
                  <h2 className="font-black text-slate-950">
                    Admin verification
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    The admin will verify your withdrawal request and payment
                    details.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-slate-950">
                  3
                </div>

                <div>
                  <h2 className="font-black text-slate-950">
                    Withdrawal processed after approval
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Your withdrawal will be processed once the request is
                    approved by the admin.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            <Link
              href="/dashboard/wallet"
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              <ArrowLeft size={18} />
              Back to Wallet
            </Link>

            <Link
              href="/dashboard/wallet/withdraw"
              className="flex items-center justify-center rounded-xl border border-slate-200 px-6 py-4 font-black text-slate-700 transition hover:border-slate-950 hover:bg-slate-50"
            >
              Submit Another Withdrawal
            </Link>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-slate-400">
            Please wait for admin approval before expecting the withdrawal
            to be processed.
          </p>
        </div>
      </div>
    </main>
  );
}