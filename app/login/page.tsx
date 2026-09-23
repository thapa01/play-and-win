"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      setLoading(false);
      return;
    }

    try {
      // ==========================================
      // LOGIN WITH SUPABASE
      // ==========================================

      const {
        data: loginData,
        error: loginError,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (loginError) {
        setError(loginError.message);
        setLoading(false);
        return;
      }

      if (!loginData.user) {
        setError("Unable to log in. Please try again.");
        setLoading(false);
        return;
      }

      // ==========================================
      // CONFIRM SESSION
      // ==========================================

      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setError(
          "Login completed, but your session could not be created. Please try again."
        );
        setLoading(false);
        return;
      }

      // ==========================================
      // GET USER PROFILE / ROLE
      // ==========================================

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", loginData.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Profile loading error:", profileError);

        setError(
          "Login successful, but we could not load your profile. Please try again."
        );

        setLoading(false);
        return;
      }

      // ==========================================
      // REFRESH APP SESSION
      // ==========================================

      router.refresh();

      // ==========================================
      // ADMIN → ADMIN DASHBOARD
      // ==========================================

      if (profile?.role === "admin") {
        router.replace("/admin");
        return;
      }

      // ==========================================
      // NORMAL USER → HOME
      // ==========================================

      router.replace("/");
    } catch (err) {
      console.error("Login error:", err);

      setError(
        "Something went wrong while logging in. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="flex min-h-[90vh] items-center justify-center">
        <div className="w-full max-w-md">

          {/* ========================================= */}
          {/* BRAND */}
          {/* ========================================= */}

          <div className="mb-8 text-center">
            <Link
              href="/"
              className="inline-block text-2xl font-extrabold tracking-tight text-slate-800"
            >
              PLAY <span className="text-amber-500">&</span> WIN
            </Link>

            <h1 className="mt-7 text-3xl font-bold tracking-tight text-slate-900">
              Welcome Back
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Login to continue playing and winning.
            </p>
          </div>

          {/* ========================================= */}
          {/* LOGIN CARD */}
          {/* ========================================= */}

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">

            <form onSubmit={handleLogin}>

              {/* ========================================= */}
              {/* EMAIL */}
              {/* ========================================= */}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    inputMode="email"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />
                </div>
              </div>

              {/* ========================================= */}
              {/* PASSWORD */}
              {/* ========================================= */}

              <div className="mt-5">
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <div className="relative">

                  <LockKeyhole
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-14 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
                  />

                  {/* ===================================== */}
                  {/* MOBILE-FRIENDLY EYE BUTTON */}
                  {/* ===================================== */}

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition active:bg-slate-100 active:text-slate-900 hover:bg-slate-100 hover:text-slate-800"
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? (
                      <EyeOff
                        size={20}
                        strokeWidth={2}
                      />
                    ) : (
                      <Eye
                        size={20}
                        strokeWidth={2}
                      />
                    )}
                  </button>
                </div>
              </div>

              {/* ========================================= */}
              {/* ERROR */}
              {/* ========================================= */}

              {error && (
                <div className="mt-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3">
                  <p className="text-sm leading-5 text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* ========================================= */}
              {/* LOGIN BUTTON */}
              {/* ========================================= */}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-slate-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Logging in..." : "Login"}
              </button>

            </form>

            {/* ========================================= */}
            {/* SIGN UP */}
            {/* ========================================= */}

            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{" "}
                <Link
                  href="/sign-up"
                  className="font-bold text-slate-900 transition hover:text-blue-600"
                >
                  Create Account
                </Link>
              </p>
            </div>

          </div>

          {/* ========================================= */}
          {/* FOOTER */}
          {/* ========================================= */}

          <p className="mt-6 text-center text-xs text-slate-400">
            Play & Win • Gaming Tournaments
          </p>

        </div>
      </div>
    </main>
  );
}