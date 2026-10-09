"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Bold,
  Megaphone,
  Send,
  ShieldCheck,
  Tag,
  Trophy,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
type AnnouncementType = "general" | "tournament" | "offer" | "important";
type SendMode = "global" | "room";
type Announcement = {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
};
type Tournament = {
  id: string;
  title: string;
  game: string;
  status: string;
  start_date: string;
  registered_players: number;
};
const announcementTypes: {
  value: AnnouncementType;
  label: string;
}[] = [
  { value: "general", label: "General announcement" },
  { value: "tournament", label: "Tournament / Event" },
  { value: "offer", label: "Offer / Promotion" },
  { value: "important", label: "Important notice" },
];
type HighlightStyle = "yellow" | "green" | "blue" | "red" | "purple" | "bold";
function renderHighlightedMessage(message: string) {
  const pattern = /\[\[hl:(yellow|green|blue|red|purple|bold)\]\]([\s\S]*?)\[\[\/hl\]\]/g;
  const parts: React.ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  let index = 0;
  const styles: Record<HighlightStyle, string> = {
    yellow: "rounded bg-amber-100 px-1 py-0.5 font-bold text-amber-900 ring-1 ring-amber-200",
    green: "rounded bg-emerald-100 px-1 py-0.5 font-bold text-emerald-800 ring-1 ring-emerald-200",
    blue: "rounded bg-blue-100 px-1 py-0.5 font-bold text-blue-800 ring-1 ring-blue-200",
    red: "rounded bg-red-100 px-1 py-0.5 font-bold text-red-800 ring-1 ring-red-200",
    purple: "rounded bg-purple-100 px-1 py-0.5 font-bold text-purple-800 ring-1 ring-purple-200",
    bold: "font-extrabold text-slate-950",
  };
  while ((match = pattern.exec(message)) !== null) {
    if (match.index > cursor) parts.push(<span key={`plain-${index++}`}>{message.slice(cursor, match.index)}</span>);
    parts.push(<span key={`highlight-${index++}`} className={styles[match[1] as HighlightStyle]}>{match[2]}</span>);
    cursor = pattern.lastIndex;
  }
  if (cursor < message.length) parts.push(<span key={`plain-${index++}`}>{message.slice(cursor)}</span>);
  return parts.length ? parts : message;
}
function typeIcon(type: string) {
  if (type === "tournament") return <Trophy size={18} />;
  if (type === "offer") return <Tag size={18} />;
  if (type === "important") return <ShieldCheck size={18} />;
  return <Megaphone size={18} />;
}
export default function AdminAnnouncementsPage() {
  const supabase = createClient();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [mode, setMode] = useState<SendMode>("global");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [type, setType] = useState<AnnouncementType>("general");
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [history, setHistory] = useState<Announcement[]>([]);
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, type, created_at")
      .in("type", ["general", "important", "offer", "tournament"])
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      console.error("Could not load announcement history:", error);
      setErrorMessage(
        "The page opened, but announcement history could not be loaded. Check your notification viewing policies."
      );
    } else {
      setHistory((data || []) as Announcement[]);
    }
    setLoadingHistory(false);
  }, [supabase]);
  const loadTournaments = useCallback(async () => {
    setLoadingTournaments(true);
    const { data, error } = await supabase
      .from("tournaments")
      .select("id, title, game, status, start_date, registered_players")
      .in("status", ["upcoming", "live"])
      .order("start_date", { ascending: true });
    if (error) {
      console.error("Could not load tournaments:", error);
      setErrorMessage(
        "Could not load tournaments. Check administrator access to the tournaments table."
      );
      setTournaments([]);
    } else {
      setTournaments((data || []) as Tournament[]);
    }
    setLoadingTournaments(false);
  }, [supabase]);
  useEffect(() => {
    let active = true;
    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) {
        window.location.replace("/login");
        return;
      }
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      if (!active) return;
      if (error || profile?.role !== "admin") {
        window.location.replace("/dashboard");
        return;
      }
      setAuthorized(true);
      setCheckingAccess(false);
      await Promise.all([loadHistory(), loadTournaments()]);
    }
    void initialize();
    return () => {
      active = false;
    };
  }, [supabase, loadHistory, loadTournaments]);
  useEffect(() => {
    let active = true;
    async function loadRegisteredRecipientCount() {
      setRecipientCount(null);
      if (mode !== "room" || !selectedTournamentId) {
        setLoadingRecipients(false);
        return;
      }
      setLoadingRecipients(true);
      setErrorMessage("");
      const { data, error } = await supabase
        .from("tournament_registrations")
        .select("user_id")
        .eq("tournament_id", selectedTournamentId)
        .eq("status", "registered");
      if (!active) return;
      if (error) {
        console.error("Could not load registered players:", error);
        setErrorMessage(
          "Could not verify registered players. No room notification can be sent until this query works."
        );
        setRecipientCount(null);
      } else {
        const ids = new Set(
          (data || []).map((row) => row.user_id).filter(Boolean)
        );
        setRecipientCount(ids.size);
      }
      setLoadingRecipients(false);
    }
    void loadRegisteredRecipientCount();
    return () => {
      active = false;
    };
  }, [mode, selectedTournamentId, supabase]);
  async function verifyAdmin() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("Your session has expired. Please sign in again.");
    }
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (error || profile?.role !== "admin") {
      throw new Error("Only an administrator can send notifications.");
    }
  }
  async function sendGlobalAnnouncement(
    cleanTitle: string,
    cleanMessage: string
  ) {
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id");
    if (error) {
      throw new Error("Could not retrieve the user list: " + error.message);
    }
    const userIds = Array.from(
      new Set((users || []).map((profile) => profile.id).filter(Boolean))
    );
    if (userIds.length === 0) {
      throw new Error("No registered user profiles were found.");
    }
    const batchSize = 200;
    let sentCount = 0;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize).map((userId) => ({
        user_id: userId,
        title: cleanTitle,
        message: cleanMessage,
        type,
        is_read: false,
      }));
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(batch);
      if (insertError) {
        throw new Error(
          `Sending stopped after ${sentCount} notifications. ${insertError.message} Check existing notifications before retrying to avoid duplicates.`
        );
      }
      sentCount += batch.length;
    }
    setNotice(
      `Announcement sent successfully to ${sentCount} user profiles.`
    );
  }
  async function sendTournamentRoomDetails() {
    if (!selectedTournamentId) {
      throw new Error("Please select a tournament.");
    }
    const cleanRoomId = roomId.trim();
    const cleanRoomPassword = roomPassword.trim();
    if (!cleanRoomId || !cleanRoomPassword) {
      throw new Error("Please enter both the room ID and room password.");
    }
    const tournament = tournaments.find(
      (item) => item.id === selectedTournamentId
    );
    if (!tournament) {
      throw new Error("The selected tournament could not be found.");
    }
    // Recheck registration records immediately before sending.
    const { data: registrations, error: registrationError } = await supabase
      .from("tournament_registrations")
      .select("user_id")
      .eq("tournament_id", selectedTournamentId)
      .eq("status", "registered");
    if (registrationError) {
      throw new Error(
        "Could not verify tournament registrations: " +
          registrationError.message
      );
    }
    const userIds = Array.from(
      new Set(
        (registrations || [])
          .map((registration) => registration.user_id)
          .filter(Boolean)
      )
    );
    if (userIds.length === 0) {
      throw new Error(
        "There are no registered users for this tournament. No notifications were sent."
      );
    }
    if (
      !window.confirm(
        `Send room details for "${tournament.title}" to ${userIds.length} registered account(s)? The room ID and password will be included in each notification.`
      )
    ) {
      return;
    }
    const cleanTitle =
      title.trim() || `Tournament Room Details: ${tournament.title}`;
    const cleanMessage = [
      `Tournament: ${tournament.title}`,
      `Game: ${tournament.game}`,
      "",
      "Your tournament room details:",
      `Room ID: [[hl:blue]]${cleanRoomId}[[/hl]]`,
      `Room Password: [[hl:green]]${cleanRoomPassword}[[/hl]]`,
      "",
      "Please keep these details private and share them only with authorized teammates.",
    ].join("\n");
    // Recheck admin privileges immediately before inserting.
    await verifyAdmin();
    // Insert only to unique user IDs returned by this tournament's
    // actual registered records. Never use the global profiles list here.
    const batchSize = 200;
    let sentCount = 0;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize).map((userId) => ({
        user_id: userId,
        title: cleanTitle,
        message: cleanMessage,
        type: "tournament",
        is_read: false,
      }));
      const { error } = await supabase
        .from("notifications")
        .insert(batch);
      if (error) {
        throw new Error(
          `Sending stopped after ${sentCount} notifications. ${error.message} Some notifications may already have been sent. Check the notification history before retrying.`
        );
      }
      sentCount += batch.length;
    }
    setNotice(
      `Room details sent to ${sentCount} registered account(s) for ${tournament.title}.`
    );
    setRoomId("");
    setRoomPassword("");
    setTitle("");
    await loadHistory();
  }
  function applyHighlight(style: HighlightStyle) {
    const textarea = messageRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) {
      setErrorMessage("First select the text you want to highlight in the message.");
      return;
    }
    const selectedText = message.slice(start, end);
    const marker = `[[hl:${style}]]${selectedText}[[/hl]]`;
    const nextMessage = message.slice(0, start) + marker + message.slice(end);
    setMessage(nextMessage);
    setErrorMessage("");
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start, start + marker.length);
    });
  }
  async function sendAnnouncement(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setNotice("");
    setErrorMessage("");
    const cleanTitle = title.trim();
    const cleanMessage = message.trim();
    if (mode === "global" && (!cleanTitle || !cleanMessage)) {
      setErrorMessage("Please enter both a title and a message.");
      return;
    }
    if (mode === "room" && !selectedTournamentId) {
      setErrorMessage("Please select a tournament.");
      return;
    }
    setSending(true);
    try {
      await verifyAdmin();
      if (mode === "room") {
        await sendTournamentRoomDetails();
      } else {
        await sendGlobalAnnouncement(cleanTitle, cleanMessage);
        setTitle("");
        setMessage("");
        setType("general");
        await loadHistory();
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while sending the notification."
      );
    } finally {
      setSending(false);
    }
  }
  if (checkingAccess || !authorized) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
          <Loader2 className="animate-spin" size={20} />
          Checking administrator access...
        </div>
      </main>
    );
  }
  const selectedTournament = tournaments.find(
    (item) => item.id === selectedTournamentId
  );
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/admin"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950"
        >
          <ArrowLeft size={17} />
          Back to Admin Dashboard
        </Link>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-800">
              <Bell size={24} />
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
              Announcements
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Send global updates or private tournament room details through
              the Play & Win notification bell.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-600">
            <ShieldCheck size={17} className="text-green-600" />
            Administrator access
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <h2 className="text-lg font-black">Create notification</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose who should receive your notification.
              </p>
            </div>
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setMode("global");
                  setNotice("");
                  setErrorMessage("");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  mode === "global"
                    ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <Megaphone size={20} className="mb-2" />
                <span className="block text-sm font-black">
                  Global announcement
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Send a message to all user profiles.
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("room");
                  setNotice("");
                  setErrorMessage("");
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  mode === "room"
                    ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-100"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <LockKeyhole size={20} className="mb-2" />
                <span className="block text-sm font-black">
                  Tournament room details
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Send room credentials to registered accounts only.
                </span>
              </button>
            </div>
            <form onSubmit={sendAnnouncement} className="space-y-5">
              {mode === "global" ? (
                <>
                  <div>
                    <label
                      htmlFor="announcement-title"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Announcement title
                    </label>
                    <input
                      id="announcement-title"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={120}
                      required
                      placeholder="e.g. PUBG Tournament Starts Today!"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {title.length}/120
                    </p>
                  </div>
                  <div>
                    <label
                      htmlFor="announcement-type"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Announcement type
                    </label>
                    <select
                      id="announcement-type"
                      value={type}
                      onChange={(event) =>
                        setType(event.target.value as AnnouncementType)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    >
                      {announcementTypes.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="announcement-message"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Message
                    </label>
                    <div className="mb-2 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                      <span className="px-1 text-xs font-bold text-slate-500">Select text, then highlight:</span>
                      <button type="button" onClick={() => applyHighlight("yellow")} className="rounded-lg border border-amber-200 bg-amber-100 px-2.5 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-200">Yellow</button>
                      <button type="button" onClick={() => applyHighlight("green")} className="rounded-lg border border-emerald-200 bg-emerald-100 px-2.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-200">Green</button>
                      <button type="button" onClick={() => applyHighlight("blue")} className="rounded-lg border border-blue-200 bg-blue-100 px-2.5 py-1.5 text-xs font-bold text-blue-800 hover:bg-blue-200">Blue</button>
                      <button type="button" onClick={() => applyHighlight("red")} className="rounded-lg border border-red-200 bg-red-100 px-2.5 py-1.5 text-xs font-bold text-red-800 hover:bg-red-200">Red</button>
                      <button type="button" onClick={() => applyHighlight("purple")} className="rounded-lg border border-purple-200 bg-purple-100 px-2.5 py-1.5 text-xs font-bold text-purple-800 hover:bg-purple-200">Purple</button>
                      <button type="button" onClick={() => applyHighlight("bold")} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100"><Bold size={13} /> Bold</button>
                    </div>
                    <textarea
                      ref={messageRef}
                      id="announcement-message"
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      maxLength={2000}
                      required
                      rows={6}
                      placeholder="Write your announcement here."
                      className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">
                      {message.length}/2000
                    </p>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-500">Notification preview</p>
                      <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{renderHighlightedMessage(message || "Your message preview will appear here.")}</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Select a phrase in the message box, then click a color or Bold. You can highlight multiple phrases using different styles.</p>
                  </div>
                  <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                    <p className="text-sm font-bold">Send to all user profiles</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      This preserves your existing global announcement
                      behavior.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor="tournament-select"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Select tournament
                    </label>
                    <select
                      id="tournament-select"
                      value={selectedTournamentId}
                      onChange={(event) => {
                        setSelectedTournamentId(event.target.value);
                        setNotice("");
                        setErrorMessage("");
                      }}
                      required
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    >
                      <option value="">
                        {loadingTournaments
                          ? "Loading tournaments..."
                          : "Choose a tournament"}
                      </option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.title} — {tournament.game}
                        </option>
                      ))}
                    </select>
                    {!loadingTournaments && tournaments.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No upcoming or live tournaments were found.
                      </p>
                    )}
                  </div>
                  {selectedTournament && (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start gap-3">
                        <Trophy
                          size={20}
                          className="mt-0.5 shrink-0 text-yellow-700"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="break-words text-sm font-black">
                            {selectedTournament.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {selectedTournament.game} ·{" "}
                            {selectedTournament.status}
                          </p>
                          <div className="mt-3 flex items-center gap-2 text-sm font-bold">
                            <Users size={17} />
                            {loadingRecipients
                              ? "Checking registrations..."
                              : recipientCount === null
                                ? "Recipient count unavailable"
                                : `${recipientCount} registered account(s)`}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            The count comes from actual registered user
                            records, not the tournament's reserved player
                            capacity.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div>
                    <label
                      htmlFor="room-id"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Room ID
                    </label>
                    <input
                      id="room-id"
                      value={roomId}
                      onChange={(event) => setRoomId(event.target.value)}
                      maxLength={200}
                      autoComplete="off"
                      required
                      placeholder="Enter the tournament room ID"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="room-password"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Room password
                    </label>
                    <input
                      id="room-password"
                      value={roomPassword}
                      onChange={(event) => setRoomPassword(event.target.value)}
                      maxLength={200}
                      autoComplete="new-password"
                      required
                      placeholder="Enter the room password"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                    />
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start gap-3">
                      <LockKeyhole
                        size={19}
                        className="mt-0.5 shrink-0 text-amber-800"
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          Private room information
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-700">
                          Room credentials will be included in notifications
                          addressed to accounts with a registered record for
                          this tournament. Verify the recipient count before
                          confirming.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {errorMessage && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-6 text-red-700"
                >
                  {errorMessage}
                </div>
              )}
              {notice && (
                <div
                  role="status"
                  className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 p-3 text-sm leading-6 text-green-800"
                >
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  {notice}
                </div>
              )}
              <button
                type="submit"
                disabled={
                  sending ||
                  (mode === "room" &&
                    (loadingTournaments ||
                      loadingRecipients ||
                      recipientCount === null ||
                      recipientCount === 0))
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Sending notification...
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    {mode === "room"
                      ? "Send Room Details to Registered Players"
                      : "Send to All Users"}
                  </>
                )}
              </button>
            </form>
          </section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black">Recent notifications</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Latest messages matching announcement types.
                </p>
              </div>
              <CalendarDays size={21} className="text-slate-400" />
            </div>
            {loadingHistory ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Loading history...
              </div>
            ) : history.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
                <Bell className="mx-auto text-slate-300" size={28} />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  No matching notifications yet
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Recent announcements appear here when the viewing policies
                  allow them.
                </p>
              </div>
            ) : (
              <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
                {history.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-100 p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-50 text-yellow-800">
                        {typeIcon(item.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-sm font-black text-slate-900">
                          {item.title}
                        </h3>
                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-slate-600">
                          {renderHighlightedMessage(item.message)}
                        </p>
                        <p className="mt-3 text-[10px] font-medium text-slate-400">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
