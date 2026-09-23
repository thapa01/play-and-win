"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const referralCode = searchParams.get("ref")?.trim() || "";

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
          referral_code: referralCode || null,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
    } else {
      setMessage(
        "Account created successfully. Please check your email to verify your account."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex min-h-[85vh] max-w-md items-center justify-center">
        <div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <Link
              href="/"
              className="text-2xl font-black tracking-tight text-slate-950"
            >
              PLAY <span className="text-yellow-500">&</span> WIN
            </Link>

            <h1 className="mt-6 text-3xl font-black text-slate-950">
              Create Account
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Join tournaments and start playing.
            </p>

            {referralCode && (
              <div className="mt-4 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800">
                You were invited to Play & Win.
              </div>
            )}
          </div>

          <form onSubmit={handleSignUp} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Full Name
              </label>

              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Username
              </label>

              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Email
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                Password
              </label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                placeholder="Create a password"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {message && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-yellow-400 px-4 py-3 font-black text-slate-950 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-bold text-slate-950 hover:text-yellow-600"
            >
              Login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-slate-50">
          <div className="text-sm font-semibold text-slate-600">
            Loading...
          </div>
        </main>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}