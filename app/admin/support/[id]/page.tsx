"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  Clock3,
  CircleDot,
} from "lucide-react";
import { useParams } from "next/navigation";
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

export default function AdminSupportTicketPage() {
  const supabase = createClient();
  const params = useParams();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const [messages, setMessages] = useState<
    {
      id: string;
      sender_id: string;
      sender_role: "user" | "admin";
      message: string;
      created_at: string;
    }[]
  >([]);

  const [loadingMessages, setLoadingMessages] = useState(true);

  const [updatingStatus, setUpdatingStatus] = useState(false);

  async function handleReply() {
    if (!reply.trim() || !ticketId || !ticket) {
      return;
    }

    setSendingReply(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSendingReply(false);
      return;
    }

    const replyMessage = reply.trim();

    // 1. Save admin reply
    const { error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: user.id,
        sender_role: "admin",
        message: replyMessage,
      });

    if (error) {
      console.error(
        "Support reply error:",
        JSON.stringify(error, null, 2)
      );

      setSendingReply(false);
      return;
    }

    // 2. Create notification for the player
    const { error: notificationError } = await supabase
      .from("notifications")
      .insert({
        user_id: ticket.user_id,
        title: "Support Ticket Reply",
        message: `Play & Win Support replied to your ticket PW-${String(
          ticket.ticket_number
        ).padStart(6, "0")}: ${replyMessage}`,
        type: "general",
        is_read: false,
        reference_id: ticket.id,
      });

    if (notificationError) {
      console.error(
        "Support notification error:",
        JSON.stringify(notificationError, null, 2)
      );
    }

    setReply("");
    await loadMessages();
    setSendingReply(false);
  }

  async function loadMessages() {
    if (!ticketId) {
      return;
    }

    const { data, error } = await supabase
      .from("support_ticket_messages")
      .select("id, sender_id, sender_role, message, created_at")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Support messages fetch error:", error);
      setMessages([]);
    } else {
      setMessages(data || []);
    }

    setLoadingMessages(false);
  }

  async function updateTicketStatus(newStatus: string) {
    if (!ticketId || !ticket) {
      return;
    }

    if (newStatus === ticket.status) {
      return;
    }

    setUpdatingStatus(true);

    const { data, error } = await supabase
      .from("support_tickets")
      .update({
        status: newStatus,
      })
      .eq("id", ticketId)
      .select(
        "id, ticket_number, user_id, name, email, category, subject, message, status, created_at"
      )
      .single();

    if (error) {
      console.error(
        "Support status update error:",
        JSON.stringify(error, null, 2)
      );

      setUpdatingStatus(false);
      return;
    }

    setTicket(data);
    setUpdatingStatus(false);
  }

  useEffect(() => {
    async function loadTicket() {
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
        .eq("id", ticketId)
        .single();

      if (error) {
        console.error("Support ticket fetch error:", error);
        setTicket(null);
      } else {
        setTicket(data);
      }

      setLoading(false);
    }

    if (ticketId) {
      loadTicket();
      loadMessages();
    }
  }, [ticketId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f5f7fb]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-yellow-500" />
          <p className="text-sm text-slate-500">
            Loading ticket...
          </p>
        </div>
      </main>
    );
  }

  if (!authorized) {
    return null;
  }

  if (!ticket) {
    return (
      <main className="min-h-screen bg-[#f5f7fb]">
        <div className="mx-auto max-w-4xl px-5 py-10">
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to Support Tickets
          </Link>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <h1 className="text-2xl font-black text-slate-950">
              Ticket Not Found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              This support ticket could not be found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const formattedTicketId = `PW-${String(
    ticket.ticket_number
  ).padStart(6, "0")}`;

  const currentStatus = ticket.status || "open";

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      {/* HEADER */}
      <section className="bg-slate-950">
        <div className="mx-auto max-w-5xl px-5 py-7 sm:px-6">
          <Link
            href="/admin/support"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to Support Tickets
          </Link>

          <div className="mt-6 flex items-center gap-3">
            <div className="rounded-xl bg-yellow-400 p-3 text-slate-950">
              <MessageCircle size={22} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-400">
                Support Ticket
              </p>

              <h1 className="mt-1 text-2xl font-black text-white sm:text-3xl">
                {formattedTicketId}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-6">
        {/* USER INFO */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-600">
                Player
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {ticket.name}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {ticket.email}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  className="text-emerald-600"
                />

                <span className="text-sm font-bold text-slate-700">
                  {currentStatus === "in_progress"
                    ? "In Progress"
                    : currentStatus === "resolved"
                    ? "Resolved"
                    : "Open"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {new Date(ticket.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* STATUS MANAGEMENT */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-600">
                Ticket Status
              </p>

              <h3 className="mt-2 text-lg font-black text-slate-950">
                Manage Support Ticket
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Update the current status of this support request.
              </p>
            </div>

            <div className="w-full sm:w-56">
              <select
                value={currentStatus}
                onChange={(e) => updateTicketStatus(e.target.value)}
                disabled={updatingStatus}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div
              className={`rounded-2xl border p-4 ${
                currentStatus === "open"
                  ? "border-yellow-300 bg-yellow-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <CircleDot
                  size={17}
                  className="text-yellow-600"
                />

                <span className="text-sm font-black text-slate-900">
                  Open
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                New or waiting for support.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                currentStatus === "in_progress"
                  ? "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock3
                  size={17}
                  className="text-blue-600"
                />

                <span className="text-sm font-black text-slate-900">
                  In Progress
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                Support team is handling it.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 ${
                currentStatus === "resolved"
                  ? "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2
                  size={17}
                  className="text-emerald-600"
                />

                <span className="text-sm font-black text-slate-900">
                  Resolved
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                The support request is completed.
              </p>
            </div>
          </div>

          {updatingStatus && (
            <p className="mt-4 text-right text-xs font-semibold text-slate-400">
              Updating status...
            </p>
          )}
        </div>

        {/* ORIGINAL MESSAGE */}
        <div className="mt-6">
          <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
            Original Request
          </p>

          <div className="mt-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-black text-yellow-700">
                {ticket.category}
              </span>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                {currentStatus === "in_progress"
                  ? "In Progress"
                  : currentStatus === "resolved"
                  ? "Resolved"
                  : "Open"}
              </span>
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              {ticket.subject}
            </h2>

            <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-600">
              {ticket.message}
            </p>
          </div>
        </div>

        {/* CONVERSATION */}
        <div className="mt-6">
          <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
            Conversation
          </p>

          <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
            {loadingMessages ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading conversation...
              </p>
            ) : messages.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No replies yet.
              </p>
            ) : (
              <div className="space-y-4">
                {messages.map((item) => {
                  const isAdmin = item.sender_role === "admin";

                  return (
                    <div
                      key={item.id}
                      className={`flex ${
                        isAdmin ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                          isAdmin
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-900"
                        }`}
                      >
                        <p
                          className={`mb-1 text-xs font-black ${
                            isAdmin
                              ? "text-yellow-400"
                              : "text-yellow-600"
                          }`}
                        >
                          {isAdmin ? "Admin" : ticket.name}
                        </p>

                        <p className="whitespace-pre-wrap text-sm leading-6">
                          {item.message}
                        </p>

                        <p className="mt-2 text-[10px] text-slate-400">
                          {new Date(
                            item.created_at
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ADMIN REPLY */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-yellow-100 p-3 text-yellow-700">
              <MessageCircle size={21} />
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-950">
                Reply to Player
              </h3>

              <p className="text-sm text-slate-500">
                Send a message directly to the player.
              </p>
            </div>
          </div>

          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write your reply..."
            rows={5}
            className="mt-5 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
          />

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleReply}
              disabled={sendingReply || !reply.trim()}
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sendingReply ? "Sending..." : "Send Reply"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}