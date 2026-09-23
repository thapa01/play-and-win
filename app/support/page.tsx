"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ChevronDown,
  HelpCircle,
  MessageCircle,
  Send,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const faqs = [
  {
    question: "How do I join a tournament?",
    answer:
      "Create your Play & Win account, choose the tournament you want to join, and complete the registration process. If the tournament has an entry fee, make sure you have sufficient wallet balance and complete the registration.",
  },
  {
    question: "How do deposits and withdrawals work?",
    answer:
      "You can manage your balance through the Play & Win Wallet. Deposits and withdrawals are normally processed within 5–30 minutes. Processing time may vary depending on verification and transaction conditions.",
  },
  {
    question: "How does prize distribution work?",
    answer:
      "Prize distribution is based on the winning positions and prize structure announced for the specific tournament. Eligible winners receive the prize assigned to their final position, such as 1st, 2nd, 3rd, and other declared positions.",
  },
  {
    question: "How does the referral system work?",
    answer:
      "Invite friends using your unique referral code or referral link. When an eligible referral is approved according to the Play & Win referral rules, the applicable reward is credited to your wallet.",
  },
  {
    question: "What happens if a tournament is not organized?",
    answer:
      "If a tournament cannot be organized, eligible participants will be informed about the available resolution, such as a refund or information about the next tournament date, according to the applicable tournament arrangement.",
  },
  {
    question: "What if I have a problem during a tournament?",
    answer:
      "If you experience a tournament-related issue, submit a support ticket with the tournament name, relevant details, and any available evidence. Our team will review the issue according to the tournament rules and available information.",
  },
  {
    question: "Where can I find my tournament and game details?",
    answer:
      "Your registered tournaments are available in Dashboard → My Tournaments. When room information is released by the tournament organizer, it can be found under Dashboard → Game Access.",
  },
  {
    question: "How can I contact Play & Win Support?",
    answer:
      "You can create a support request from this page. For general support and inquiries, you can also contact us at playnwin.officialnp@gmail.com.",
  },
];

const categories = [
  "General",
  "Registration",
  "Payment",
  "Tournament",
  "Game Access",
  "Technical Issue",
];

export default function SupportPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [defaultName, setDefaultName] = useState("");
  const [defaultEmail, setDefaultEmail] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("General");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [loadingUser, setLoadingUser] = useState(true);
  const [sending, setSending] = useState(false);

  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [ticketMessages, setTicketMessages] = useState<
    Record<string, any[]>
  >({});

  const [replyDrafts, setReplyDrafts] = useState<
    Record<string, string>
  >({});

  const [replyingTicketId, setReplyingTicketId] = useState<string | null>(
    null
  );

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .single();

        const profileName = profile?.full_name || "";
        const profileEmail = profile?.email || user.email || "";

        setDefaultName(profileName);
        setDefaultEmail(profileEmail);

        setName(profileName);
        setEmail(profileEmail);
      }

      setLoadingUser(false);
    }

    async function loadTickets() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setTickets([]);
        setLoadingTickets(false);
        return;
      }

      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "id, ticket_number, category, subject, message, status, created_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Support tickets fetch error:", error);
        setTickets([]);
      } else {
        setTickets(data || []);
      }

      setLoadingTickets(false);

      if (data && data.length > 0) {
        const ticketIds = data.map((ticket) => ticket.id);

        const { data: messageData, error: messageError } =
          await supabase
            .from("support_ticket_messages")
            .select(
              "id, ticket_id, sender_id, sender_role, message, created_at"
            )
            .in("ticket_id", ticketIds)
            .order("created_at", { ascending: true });

        if (messageError) {
          console.error(
            "Support messages fetch error:",
            messageError
          );
          return;
        }

        const groupedMessages: Record<string, any[]> = {};

        (messageData || []).forEach((item) => {
          if (!groupedMessages[item.ticket_id]) {
            groupedMessages[item.ticket_id] = [];
          }

          groupedMessages[item.ticket_id].push(item);
        });

        setTicketMessages(groupedMessages);
      }
    }

    loadUser();
    loadTickets();
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setSending(true);
    setSuccess("");
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      setSending(false);
      return;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      setSending(false);
      return;
    }

    if (!subject.trim()) {
      setError("Please enter a subject.");
      setSending(false);
      return;
    }

    if (!message.trim()) {
      setError("Please describe your issue.");
      setSending(false);
      return;
    }

    if (!userId) {
      setError("Please log in before submitting a support request.");
      setSending(false);
      return;
    }

    const { data: newTicket, error: insertError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        category,
        subject: subject.trim(),
        message: message.trim(),
      })
      .select("ticket_number")
      .single();

    if (insertError) {
      setError(insertError.message);
      setSending(false);
      return;
    }

    const formattedTicketId = `PW-${String(
      newTicket.ticket_number
    ).padStart(6, "0")}`;

    setSuccess(
      `Your support request has been submitted successfully. Ticket ID: ${formattedTicketId}`
    );

    setSubject("");
    setMessage("");
    setCategory("General");

    setSending(false);
  }

  async function handleUserReply(ticketId: string) {
    const replyText = replyDrafts[ticketId]?.trim();

    if (!replyText || !userId) {
      return;
    }

    setReplyingTicketId(ticketId);

    const { data, error } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_id: userId,
        sender_role: "user",
        message: replyText,
      })
      .select(
        "id, ticket_id, sender_id, sender_role, message, created_at"
      )
      .single();

    if (error) {
      console.error(
        "User support reply error:",
        JSON.stringify(error, null, 2)
      );

      setReplyingTicketId(null);
      return;
    }

    setTicketMessages((current) => ({
      ...current,
      [ticketId]: [...(current[ticketId] || []), data],
    }));

    setReplyDrafts((current) => ({
      ...current,
      [ticketId]: "",
    }));

    setReplyingTicketId(null);
  }

  function getStatusLabel(status: string) {
    if (status === "in_progress") {
      return "In Progress";
    }

    if (status === "resolved") {
      return "Resolved";
    }

    return "Open";
  }

  function getStatusClass(status: string) {
    if (status === "in_progress") {
      return "bg-blue-100 text-blue-700";
    }

    if (status === "resolved") {
      return "bg-green-100 text-green-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* HERO */}
      <section className="px-5 pb-14 pt-10 sm:pt-16">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Home
          </Link>

          <div className="mt-12 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-600">
              PLAY & WIN SUPPORT
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
              How can we help?
            </h1>

            <p className="mt-5 text-base leading-7 text-slate-500 sm:text-lg">
              Need help with registration, payments, tournaments, game
              access, or a technical issue? Find an answer below or send
              us a support request.
            </p>
          </div>
        </div>
      </section>

      {/* SUPPORT FEATURES */}
      <section className="px-5 pb-14">
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <HelpCircle size={23} />
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-950">
              Quick Answers
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Find answers to common tournament and account questions.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <MessageCircle size={23} />
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-950">
              Contact Support
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Need help with your account, payment, tournament, or
              technical issue? Contact us at{" "}
              <a
                href="mailto:playnwin.officialnp@gmail.com"
                className="font-semibold text-slate-900 hover:text-yellow-600"
              >
                playnwin.officialnp@gmail.com
              </a>
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <ShieldCheck size={23} />
            </div>

            <h2 className="mt-5 text-lg font-black text-slate-950">
              Secure Requests
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Your support request is connected to your authenticated account.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ + FORM */}
      <section className="px-5 pb-20">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-2">
          {/* FAQ */}
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
              FAQ
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Frequently Asked Questions
            </h2>

            <div className="mt-6 space-y-3">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;

                return (
                  <div
                    key={faq.question}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setOpenFaq(isOpen ? null : index)
                      }
                      className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                    >
                      <span className="font-bold text-slate-950">
                        {faq.question}
                      </span>

                      <ChevronDown
                        size={18}
                        className={`shrink-0 text-slate-400 transition ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-100 px-5 py-4">
                        <p className="text-sm leading-6 text-slate-500">
                          {faq.answer}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* FORM */}
          <div>
            <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
              CONTACT US
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Send a Support Request
            </h2>

            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {loadingUser ? (
                <p className="text-sm text-slate-500">
                  Loading your account...
                </p>
              ) : !userId ? (
                <div className="text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-2xl">
                    🔐
                  </div>

                  <h3 className="mt-4 text-xl font-black text-slate-950">
                    Login Required
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Please log in to submit a support request.
                  </p>

                  <Link
                    href="/login"
                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-yellow-500 hover:text-slate-950"
                  >
                    Login
                    <ArrowRight size={17} />
                  </Link>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  {success && (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
                      {success}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        Name
                      </label>

                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={defaultName || "Your name"}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-500"
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
                        placeholder={defaultEmail || "you@example.com"}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Category
                    </label>

                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-500"
                    >
                      {categories.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Subject
                    </label>

                    <input
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="What do you need help with?"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Message
                    </label>

                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Describe your issue..."
                      rows={6}
                      className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-yellow-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Send size={17} />

                    {sending
                      ? "Sending..."
                      : "Send Support Request"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* MY SUPPORT TICKETS */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
            MY SUPPORT
          </p>

          <h2 className="mt-2 text-3xl font-black text-slate-950">
            My Support Tickets
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Track your support requests, replies, and current status.
          </p>

          <div className="mt-6">
            {loadingTickets ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Loading your tickets...
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
                <MessageCircle
                  size={28}
                  className="mx-auto text-slate-400"
                />

                <p className="mt-3 font-bold text-slate-950">
                  No support tickets yet
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Your submitted support requests will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                  >
                    {/* TICKET HEADER */}
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-yellow-600">
                          PW-
                          {String(ticket.ticket_number).padStart(
                            6,
                            "0"
                          )}
                        </p>

                        <h3 className="mt-1 text-lg font-black text-slate-950">
                          {ticket.subject}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {ticket.category}
                        </p>
                      </div>

                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-black ${getStatusClass(
                          ticket.status
                        )}`}
                      >
                        {getStatusLabel(ticket.status)}
                      </span>
                    </div>

                    {/* ORIGINAL MESSAGE */}
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                        Your Request
                      </p>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {ticket.message}
                      </p>
                    </div>

                    {/* CONVERSATION */}
                    <div className="mt-5 border-t border-slate-100 pt-5">
                      <p className="text-xs font-black uppercase tracking-widest text-yellow-600">
                        Conversation
                      </p>

                      <div className="mt-3 space-y-3">
                        {ticketMessages[ticket.id]?.length > 0 ? (
                          ticketMessages[ticket.id].map((item) => {
                            const isAdmin =
                              item.sender_role === "admin";

                            return (
                              <div
                                key={item.id}
                                className={`flex ${
                                  isAdmin
                                    ? "justify-end"
                                    : "justify-start"
                                }`}
                              >
                                <div
                                  className={`max-w-[90%] rounded-2xl px-4 py-3 ${
                                    isAdmin
                                      ? "bg-slate-950 text-white"
                                      : "bg-slate-100 text-slate-900"
                                  }`}
                                >
                                  <p
                                    className={`text-xs font-black ${
                                      isAdmin
                                        ? "text-yellow-400"
                                        : "text-yellow-600"
                                    }`}
                                  >
                                    {isAdmin
                                      ? "Play & Win Support"
                                      : "You"}
                                  </p>

                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
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
                          })
                        ) : (
                          <p className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-400">
                            No replies yet. Our support team will
                            respond here.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* USER REPLY */}
                    {ticket.status !== "resolved" && (
                      <div className="mt-5 border-t border-slate-100 pt-5">
                        <p className="text-sm font-black text-slate-950">
                          Reply to Support
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Continue the conversation without creating a
                          new ticket.
                        </p>

                        <textarea
                          value={replyDrafts[ticket.id] || ""}
                          onChange={(e) =>
                            setReplyDrafts((current) => ({
                              ...current,
                              [ticket.id]: e.target.value,
                            }))
                          }
                          placeholder="Write your reply..."
                          rows={4}
                          className="mt-3 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                        />

                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleUserReply(ticket.id)
                            }
                            disabled={
                              replyingTicketId === ticket.id ||
                              !replyDrafts[ticket.id]?.trim()
                            }
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Send size={16} />

                            {replyingTicketId === ticket.id
                              ? "Sending..."
                              : "Send Reply"}
                          </button>
                        </div>
                      </div>
                    )}

                    {ticket.status === "resolved" && (
                      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-bold text-green-700">
                          This ticket has been resolved.
                        </p>

                        <p className="mt-1 text-xs text-green-600">
                          If you still need help, you can create a new
                          support ticket.
                        </p>
                      </div>
                    )}

                    <p className="mt-5 text-xs text-slate-400">
                      Submitted{" "}
                      {new Date(
                        ticket.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-slate-950 px-6 py-12 text-center">
          <h2 className="text-3xl font-black text-white">
            Ready to get back in the game?
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Browse tournaments and find your next competition.
          </p>

          <Link
            href="/tournaments"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-300"
          >
            Browse Tournaments
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </main>
  );
}