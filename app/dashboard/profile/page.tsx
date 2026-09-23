"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Mail,
  Shield,
  User,
  UserRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  username: string;
  role: string;
  created_at: string;
};

export default function ProfilePage() {
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You must be logged in to view your profile.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, username, role, created_at")
        .eq("id", user.id)
        .single();

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setProfile(data);
      setFullName(data.full_name || "");
      setUsername(data.username || "");

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSave() {
    setMessage("");
    setError("");

    if (fullName.trim().length < 2) {
      setError("Full name must be at least 2 characters.");
      return;
    }

    if (username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setSaving(true);

    const { data, error } = await supabase.rpc("update_my_profile", {
      new_full_name: fullName.trim(),
      new_username: username.trim(),
    });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setProfile(data);
    setFullName(data.full_name);
    setUsername(data.username);

    setMessage("Profile updated successfully.");
    setSaving(false);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="animate-pulse space-y-5">
              <div className="h-8 w-48 rounded-lg bg-slate-200" />
              <div className="h-4 w-72 rounded bg-slate-200" />
              <div className="h-24 rounded-2xl bg-slate-100" />
              <div className="h-24 rounded-2xl bg-slate-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-black text-slate-950">
            Profile unavailable
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            {error || "We could not load your profile."}
          </p>

          <Link
            href="/login"
            className="mt-6 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
          >
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  const createdDate = new Date(profile.created_at).toLocaleDateString(
    "en-US",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Back to Dashboard
        </Link>

        {/* Header */}
        <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-yellow-400">
                <UserRound size={30} />
              </div>

              <div>
                <p className="text-sm font-semibold text-yellow-600">
                  Account
                </p>

                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950">
                  My Profile
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  Manage your Play & Win account details.
                </p>
              </div>
            </div>

            <div className="inline-flex w-fit items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-700">
              <Shield size={14} />
              {profile.role}
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Edit Profile */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-7">
              <h2 className="text-xl font-black text-slate-950">
                Personal Information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Update the information displayed on your account.
              </p>
            </div>

            <div className="space-y-5">
              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Full Name
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Username
                </label>

                <div className="relative">
                  <UserRound
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Email Address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 py-3.5 pl-11 pr-4 text-sm font-medium text-slate-500"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Email changes are disabled for now.
                </p>
              </div>

              {/* Messages */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                  <CheckCircle2 size={17} />
                  {message}
                </div>
              )}

              {/* Save */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving Changes..." : "Save Changes"}
              </button>
            </div>
          </section>

          {/* Account Details */}
          <aside className="space-y-6">
            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-950">
                Account Details
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <Shield className="mt-0.5 text-slate-500" size={18} />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Account Role
                    </p>

                    <p className="mt-1 text-sm font-black uppercase text-slate-900">
                      {profile.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <CalendarDays
                    className="mt-0.5 text-slate-500"
                    size={18}
                  />

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Member Since
                    </p>

                    <p className="mt-1 text-sm font-black text-slate-900">
                      {createdDate}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                  <Mail className="mt-0.5 text-slate-500" size={18} />

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Account Email
                    </p>

                    <p className="mt-1 break-all text-sm font-black text-slate-900">
                      {profile.email}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl bg-slate-950 p-6 text-white shadow-sm">
              <p className="text-sm font-bold text-yellow-400">
                Play & Win
              </p>

              <h3 className="mt-2 text-xl font-black">
                Ready for your next tournament?
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Find a tournament, register, get game access and compete for
                rewards.
              </p>

              <Link
                href="/tournaments"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-300"
              >
                Browse Tournaments
              </Link>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}