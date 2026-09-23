"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  User,
  Users,
  CalendarDays,
  Mail,
  RefreshCw,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  email: string;
  full_name: string;
  username: string;
  role: "user" | "admin";
  created_at: string;
};

export default function AdminUsersPage() {
  const supabase = createClient();

  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: myProfile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || myProfile?.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    const { data, error: usersError } = await supabase
      .from("profiles")
      .select("id,email,full_name,username,role,created_at")
      .order("created_at", { ascending: false });

    if (usersError) {
      setError(usersError.message);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return users;

    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(query) ||
        user.username.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    );
  }, [users, search]);

  const adminCount = users.filter((user) => user.role === "admin").length;
  const playerCount = users.filter((user) => user.role === "user").length;

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  async function changeRole(userId: string, newRole: "user" | "admin") {
    setChangingRole(userId);
    setError("");
    setSuccess("");

    const { error: roleError } = await supabase.rpc("change_user_role", {
      target_user_id: userId,
      new_role: newRole,
    });

    if (roleError) {
      setError(roleError.message);
      setChangingRole(null);
      return;
    }

    setSuccess(
      newRole === "admin"
        ? "User has been promoted to administrator."
        : "Administrator has been changed to a player."
    );

    await loadUsers();

    setChangingRole(null);

    setTimeout(() => {
      setSuccess("");
    }, 4000);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] text-slate-900">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <Link
              href="/admin"
              className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Admin Dashboard
            </Link>

            <h1 className="text-3xl font-bold tracking-tight">
              User Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View and manage Play & Win users.
            </p>
          </div>

          <button
            onClick={loadUsers}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* Stats */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Users
                </p>
                <p className="mt-2 text-3xl font-bold">{users.length}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Users size={23} className="text-slate-700" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Players</p>
                <p className="mt-2 text-3xl font-bold">{playerCount}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                <User size={23} className="text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Administrators
                </p>
                <p className="mt-2 text-3xl font-bold">{adminCount}</p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                <ShieldCheck size={23} className="text-amber-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* Main card */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Search */}
          <div className="border-b border-slate-200 p-5">
            <div className="relative max-w-xl">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, username or email..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500">
                <Loader2 size={20} className="animate-spin" />
                Loading users...
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[300px] items-center justify-center px-6 text-center">
              <div>
                <Users
                  size={38}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-4 font-semibold text-slate-700">
                  No users found
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Try changing your search.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-left">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        User
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Email
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Role
                      </th>

                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">
                        Joined
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 last:border-0"
                      >
                        {/* User */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                              {user.full_name
                                ? user.full_name.charAt(0).toUpperCase()
                                : "U"}
                            </div>

                            <div>
                              <p className="font-semibold text-slate-900">
                                {user.full_name || "Unnamed User"}
                              </p>

                              <p className="text-sm text-slate-500">
                                @{user.username}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Email */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <Mail size={15} />
                            {user.email}
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-6 py-5">
                          {user.role === "admin" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                              <ShieldCheck size={14} />
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                              <User size={14} />
                              User
                            </span>
                          )}
                        </td>

                        {/* Joined */}
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm text-slate-600">
                            <CalendarDays size={15} />
                            {formatDate(user.created_at)}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-5 text-right">
                          {user.id ===
                          users.find((u) => u.role === "admin")?.id ? (
                            <span className="text-xs font-medium text-slate-400">
                              Current Admin
                            </span>
                          ) : (
                            <div className="relative inline-block">
                              <select
                                value={user.role}
                                disabled={changingRole === user.id}
                                onChange={(e) =>
                                  changeRole(
                                    user.id,
                                    e.target.value as "user" | "admin"
                                  )
                                }
                                className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>

                              <ChevronDown
                                size={15}
                                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                              />
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                          {user.full_name
                            ? user.full_name.charAt(0).toUpperCase()
                            : "U"}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-900">
                            {user.full_name || "Unnamed User"}
                          </p>

                          <p className="text-sm text-slate-500">
                            @{user.username}
                          </p>
                        </div>
                      </div>

                      {user.role === "admin" ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                          <ShieldCheck size={13} />
                          Admin
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          <User size={13} />
                          User
                        </span>
                      )}
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-slate-500">
                      <div className="flex items-center gap-2">
                        <Mail size={15} />
                        <span className="break-all">{user.email}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <CalendarDays size={15} />
                        Joined {formatDate(user.created_at)}
                      </div>
                    </div>

                    {user.id ===
                    users.find((u) => u.role === "admin")?.id ? (
                      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-center text-xs font-medium text-slate-400">
                        Current Admin
                      </div>
                    ) : (
                      <div className="relative mt-4">
                        <select
                          value={user.role}
                          disabled={changingRole === user.id}
                          onChange={(e) =>
                            changeRole(
                              user.id,
                              e.target.value as "user" | "admin"
                            )
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-400 disabled:opacity-50"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>

                        <ChevronDown
                          size={16}
                          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {!loading && filteredUsers.length > 0 && (
            <div className="border-t border-slate-200 bg-slate-50/50 px-6 py-4 text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredUsers.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {users.length}
              </span>{" "}
              users
            </div>
          )}
        </div>
      </div>
    </main>
  );
}