"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle2, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setMessage("");
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(
      cleanEmail,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    );

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage(
      "If an account exists with this email, we have sent you a password reset link."
    );

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="flex min-h-[90vh] items-center justify-center">
        <div className="w-full max-w-md">

          {/* Brand */}
          <div className="mb-8 text-center">
            <Link
              href="/login"
              className="inline-block text-2xl font-extrabold tracking-tight text-slate-800"
            >
              PLAY <span className="text-amber-500">&</span> WIN
            </Link>

            <div className="mx-auto mt-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg">
              <LockKeyhole size={28} className="text-white" />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Forgot Password?
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              No worries. Enter the email address connected to your
              Play & Win account and we&apos;ll send you a reset link.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

            {message ? (
              /* SUCCESS STATE */
              <div className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2
                    size={32}
                    className="text-emerald-600"
                  />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  Check Your Email
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {message}
                </p>

                <div className="mt-6 rounded-xl bg-slate-50 px-4 py-3 text-left">
                  <p className="text-xs text-slate-400">
                    Didn&apos;t receive the email?
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Check your spam or junk folder and make sure you entered
                    the correct email address.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <ArrowLeft size={17} />
                  Back to Login
                </Link>

              </div>
            ) : (
              /* EMAIL FORM */
              <form onSubmit={handleSubmit}>

                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={19}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm leading-5 text-red-600">
                      {error}
                    </p>
                  </div>
                )}

                {/* Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending Reset Link..." : "Send Reset Link"}
                </button>

                {/* Back */}
                <Link
                  href="/login"
                  className="mt-5 flex items-center justify-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>

              </form>
            )}
          </div>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-slate-400">
            Play & Win • Secure Account Recovery
          </p>

        </div>
      </div>
    </main>
  );
}