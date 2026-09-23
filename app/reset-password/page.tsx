"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  LockKeyhole,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setMessage("Your password has been successfully updated.");

    setPassword("");
    setConfirmPassword("");

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
              <LockKeyhole
                size={28}
                className="text-white"
              />
            </div>

            <h1 className="mt-6 text-3xl font-bold text-slate-900">
              Reset Password
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Create a new secure password for your Play & Win account.
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

            {message ? (
              /* SUCCESS */
              <div className="text-center">

                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                  <CheckCircle2
                    size={32}
                    className="text-emerald-600"
                  />
                </div>

                <h2 className="mt-5 text-xl font-bold text-slate-900">
                  Password Updated
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  {message}
                </p>

                <Link
                  href="/login"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <ArrowLeft size={17} />
                  Go to Login
                </Link>

              </div>
            ) : (
              /* FORM */
              <form onSubmit={handleSubmit}>

                {/* New Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    New Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) =>
                        setPassword(event.target.value)
                      }
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(!showPassword)
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Use at least 6 characters.
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="mt-5">
                  <label
                    htmlFor="confirmPassword"
                    className="mb-2 block text-sm font-semibold text-slate-700"
                  >
                    Confirm New Password
                  </label>

                  <div className="relative">
                    <LockKeyhole
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      required
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                    <p className="text-sm leading-5 text-red-600">
                      {error}
                    </p>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading
                    ? "Updating Password..."
                    : "Update Password"}
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

          <p className="mt-6 text-center text-xs text-slate-400">
            Play & Win • Secure Account Recovery
          </p>

        </div>
      </div>
    </main>
  );
}