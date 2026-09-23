"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ChevronRight,
  MessageCircle,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type SupportTicket = {
  id: string;
  ticket_number: number;
  user_id: string;
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

export default function AdminSupportPage() {
  const supabase = createClient();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadTickets(showRefresh = false) {
    if (showRefresh) {
      setRefreshing(true);
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      window.location.href = "/dashboard";
      return;
    }

    setAuthorized(true);

    const { data, error } = await supabase
      .from("support_tickets")
      .select(
        "id, ticket_number, user_id, name, email, category, subject, message, status, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Support tickets fetch error:", error);
      setTickets([]);
    } else {
      setTickets(data || []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    loadTickets();
  }, []);

  const formatTicketId = (ticketNumber: number) =>
    `PW-${String(ticketNumber).padStart(6, "0")}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-yellow-500" />
          <p className="text-sm text-slate-500">
            Loading support tickets...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* HEADER */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/admin"
                className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to Admin Dashboard
              </Link>

              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-yellow-400 p-3 text-slate-950">
                  <MessageCircle size={22} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                    Play & Win
                  </p>

                  <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
                    Support Tickets
                  </h1>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => loadTickets(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
            Support Center
          </p>

          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Player Support Requests
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Review support requests submitted by Play & Win users.
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-700">
              <MessageCircle size={25} />
            </div>

            <h3 className="mt-4 text-xl font-black text-slate-950">
              No support tickets
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              New player support requests will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                        {formatTicketId(ticket.ticket_number)}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                        {ticket.category}
                      </span>

                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                        {ticket.status || "Open"}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-black text-slate-950">
                      {ticket.subject}
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {ticket.message}
                    </p>
                  </div>

                  <div className="shrink-0 rounded-2xl bg-slate-50 p-4 lg:w-64">
                    <div className="flex items-center gap-2 text-slate-950">
                      <ShieldCheck size={17} className="text-emerald-600" />

                      <span className="text-sm font-black">
                        {ticket.name}
                      </span>
                    </div>

                    <p className="mt-2 break-all text-xs text-slate-500">
                      {ticket.email}
                    </p>

                    <p className="mt-3 text-xs text-slate-400">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex justify-end border-t border-slate-100 pt-4">
                <Link
  href={`/admin/support/${ticket.id}`}
  className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
>
  Open Ticket
  <ChevronRight size={16} />
</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}