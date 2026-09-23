"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Gamepad2,
  Lock,
  Unlock,
  Clock3,
  Save,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  Copy,
  DoorOpen,
  CalendarClock,
  ChevronDown,
  Zap,
  CircleDot,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tournament = {
  id: string;
  title: string;
  game: string;
  status: string;
  start_date: string;
};

type Profile = {
  id: string;
  username: string;
  full_name: string;
  email: string;
};

type GameAccess = {
  id: string;
  tournament_id: string;
  user_id: string;
  game: string;
  room_id: string | null;
  room_password: string | null;
  status: "locked" | "available" | "expired";
  available_from: string | null;
  expires_at: string | null;
};

type Player = {
  user_id: string;
  profile: Profile | null;
  access: GameAccess | null;
};

const supabase = createClient();

function formatDate(date: string | null) {
  if (!date) return "Not set";

  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function toDateTimeLocal(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);

  return localDate.toISOString().slice(0, 16);
}

function fromDateTimeLocal(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
}

export default function AdminGameAccessPage() {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);

  const [loading, setLoading] = useState(true);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [roomId, setRoomId] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAdmin() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) {
        router.push("/login");
        return;
      }
  
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
  
      if (!profile || profile.role !== "admin") {
        router.push("/dashboard");
        return;
      }
  
      loadTournaments();
    }
  
    checkAdmin();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadPlayers(selectedTournament);
    } else {
      setPlayers([]);
      clearRoomForm();
    }
  }, [selectedTournament]);

  async function loadTournaments() {
    setLoading(true);
    setError("");
  
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, title, game, status, start_date");
  
      if (error) {
        console.error("Tournament load error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
  
        setError(
          `${error.message}${
            error.code ? ` (Code: ${error.code})` : ""
          }`
        );
  
        setLoading(false);
        return;
      }
  
      const sortedTournaments = [...(data || [])].sort(
        (a, b) =>
          new Date(a.start_date).getTime() -
          new Date(b.start_date).getTime()
      );
  
      setTournaments(sortedTournaments);
  
      if (sortedTournaments.length > 0) {
        setSelectedTournament(
          (current) => current || sortedTournaments[0].id
        );
      }
    } catch (err) {
      console.error("Tournament load exception:", err);
  
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load tournaments."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadPlayers(tournamentId: string) {
    setPlayersLoading(true);
    setError("");
    setMessage("");

    try {
      const { data: registrations, error: registrationError } =
        await supabase
          .from("tournament_registrations")
          .select("user_id")
          .eq("tournament_id", tournamentId)
          .eq("status", "registered");

      if (registrationError) throw registrationError;

      const userIds = Array.from(
        new Set((registrations || []).map((item) => item.user_id))
      );

      if (userIds.length === 0) {
        setPlayers([]);
        clearRoomForm();
        setPlayersLoading(false);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, email")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      const { data: accesses, error: accessError } = await supabase
        .from("game_access")
        .select(
          "id, tournament_id, user_id, game, room_id, room_password, status, available_from, expires_at"
        )
        .eq("tournament_id", tournamentId);

      if (accessError) throw accessError;

      const playerList: Player[] = userIds.map((userId) => {
        const profile =
          profiles?.find((item) => item.id === userId) || null;

        const access =
          accesses?.find((item) => item.user_id === userId) || null;

        return {
          user_id: userId,
          profile,
          access,
        };
      });

      setPlayers(playerList);

      // Load the common room credentials from the existing records.
      // The admin now manages one room configuration for the whole tournament.
      const configuredAccess =
        accesses?.find(
          (item) =>
            item.room_id ||
            item.room_password ||
            item.available_from ||
            item.expires_at
        ) || null;

      if (configuredAccess) {
        setRoomId(configuredAccess.room_id || "");
        setRoomPassword(configuredAccess.room_password || "");
        setAvailableFrom(toDateTimeLocal(configuredAccess.available_from));
        setExpiresAt(toDateTimeLocal(configuredAccess.expires_at));
      } else {
        clearRoomForm();
      }
    } catch (err: any) {
      console.error("Player load error:", err);

      setError(
        err?.message ||
          err?.details ||
          "Failed to load registered players."
      );

      setPlayers([]);
      clearRoomForm();
    } finally {
      setPlayersLoading(false);
    }
  }

  function clearRoomForm() {
    setRoomId("");
    setRoomPassword("");
    setAvailableFrom("");
    setExpiresAt("");
  }

  function validateRoomForm(requireCredentials = true) {
    if (requireCredentials) {
      if (!roomId.trim()) {
        setError("Room ID is required.");
        return false;
      }

      if (!roomPassword.trim()) {
        setError("Room Password is required.");
        return false;
      }
    }

    if (!availableFrom) {
      setError("Available From is required.");
      return false;
    }

    if (!expiresAt) {
      setError("Expires At is required.");
      return false;
    }

    const start = new Date(availableFrom).getTime();
    const end = new Date(expiresAt).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      setError("Please enter valid availability times.");
      return false;
    }

    if (start >= end) {
      setError("Expires At must be later than Available From.");
      return false;
    }

    return true;
  }

  async function ensureAccessRecords(tournament: Tournament) {
    const missingPlayers = players.filter((player) => !player.access);

    if (missingPlayers.length === 0) return;

    const rows = missingPlayers.map((player) => ({
      tournament_id: tournament.id,
      user_id: player.user_id,
      game: tournament.game,
      status: "locked" as const,
      room_id: null,
      room_password: null,
      available_from: null,
      expires_at: null,
    }));

    const { error } = await supabase.from("game_access").insert(rows);

    if (error) throw error;
  }

  async function saveRoomForAll(release: boolean) {
    const tournament = tournaments.find(
      (item) => item.id === selectedTournament
    );

    if (!tournament) {
      setError("Please select a tournament first.");
      return;
    }

    if (players.length === 0) {
      setError("There are no registered players in this tournament.");
      return;
    }

    if (!validateRoomForm(true)) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      // Create access records for every registered player who does not
      // already have one. Existing records are preserved.
      await ensureAccessRecords(tournament);

      const status = release ? "available" : "locked";
      const availableFromValue = fromDateTimeLocal(availableFrom);
      const expiresAtValue = fromDateTimeLocal(expiresAt);

      // One database update applies the SAME room credentials and
      // availability window to every registered player.
      const { error: updateError } = await supabase
        .from("game_access")
        .update({
          game: tournament.game,
          room_id: roomId.trim(),
          room_password: roomPassword.trim(),
          status,
          available_from: availableFromValue,
          expires_at: expiresAtValue,
        })
        .eq("tournament_id", tournament.id);

      if (updateError) throw updateError;

      await loadPlayers(tournament.id);

      setMessage(
        release
          ? `Room released successfully to all ${players.length} registered players.`
          : `Room details saved for all ${players.length} registered players.`
      );
    } catch (err: any) {
      console.error("Bulk game access error:", err);

      setError(
        err?.message ||
          err?.details ||
          err?.hint ||
          "Failed to update game access for all players."
      );
    } finally {
      setSaving(false);
    }
  }

  async function lockRoomForAll() {
    const tournament = tournaments.find(
      (item) => item.id === selectedTournament
    );

    if (!tournament) {
      setError("Please select a tournament first.");
      return;
    }

    if (players.length === 0) {
      setError("There are no registered players in this tournament.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      await ensureAccessRecords(tournament);

      const { error: updateError } = await supabase
        .from("game_access")
        .update({
          status: "locked",
        })
        .eq("tournament_id", tournament.id);

      if (updateError) throw updateError;

      await loadPlayers(tournament.id);

      setMessage(
        `Room access locked for all ${players.length} registered players.`
      );
    } catch (err: any) {
      console.error("Lock game access error:", err);

      setError(
        err?.message ||
          err?.details ||
          err?.hint ||
          "Failed to lock game access."
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyText(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied to clipboard.`);
    } catch {
      setError("Unable to copy.");
    }
  }

  const selectedTournamentData = tournaments.find(
    (item) => item.id === selectedTournament
  );

  const registeredCount = players.length;

  const availableCount = players.filter(
    (item) => item.access?.status === "available"
  ).length;

  const lockedCount = players.filter(
    (item) => item.access?.status === "locked"
  ).length;

  const expiredCount = players.filter(
    (item) => item.access?.status === "expired"
  ).length;

  const notCreatedCount = players.filter(
    (item) => !item.access
  ).length;

  const allReleased =
    registeredCount > 0 && availableCount === registeredCount;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="animate-pulse">
            <div className="h-8 w-64 rounded-xl bg-slate-200" />
            <div className="mt-3 h-4 w-96 rounded bg-slate-200" />
            <div className="mt-8 h-28 rounded-3xl bg-white" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-9">
        {/* HEADER */}
        <Link
  href="/admin"
  className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
>
  <ArrowLeft size={16} />
  Back to Admin
</Link>
        <header className="mb-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-[10px] font-black tracking-[0.16em] text-slate-500 shadow-sm">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <ShieldCheck size={14} />
                ADMIN • GAME CONTROL
              </div>

              <h1 className="text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Game Access
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500 sm:text-base">
                Create one private room configuration and release the same
                room credentials to every registered player with one click.
              </p>
            </div>

            <button
              onClick={() => {
                if (selectedTournament) {
                  loadPlayers(selectedTournament);
                }
              }}
              disabled={playersLoading || saving}
              className="group inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={17}
                className={
                  playersLoading
                    ? "animate-spin"
                    : "transition-transform group-hover:rotate-180"
                }
              />
              Refresh Data
            </button>
          </div>
        </header>

        {/* TOURNAMENT CONTROL */}
        <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_8px_35px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-800 px-5 py-5 text-white sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
                <Gamepad2 size={21} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Tournament Control
                </p>

                <h2 className="mt-1 font-black">
                  Manage Game Access
                </h2>
              </div>
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 sm:flex">
              <Zap size={14} />
              One-Click Room Release
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="relative">
              <select
                value={selectedTournament}
                onChange={(event) =>
                  setSelectedTournament(event.target.value)
                }
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 pr-12 text-sm font-bold text-slate-900 outline-none transition-all focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-100"
              >
                {tournaments.length === 0 ? (
                  <option value="">No tournaments found</option>
                ) : (
                  tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.title} — {tournament.game}
                    </option>
                  ))
                )}
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-slate-400"
              />
            </div>

            {selectedTournamentData && (
              <div className="mt-4 flex flex-wrap gap-2">
                <InfoPill>
                  <Gamepad2 size={13} />
                  {selectedTournamentData.game}
                </InfoPill>

                <InfoPill green>
                  <CircleDot size={13} />
                  {selectedTournamentData.status}
                </InfoPill>

                <InfoPill>
                  <CalendarClock size={13} />
                  {formatDate(selectedTournamentData.start_date)}
                </InfoPill>
              </div>
            )}
          </div>
        </section>

        {/* ALERTS */}
        {message && (
          <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-sm">
            <CheckCircle2 size={19} />
            {message}
          </div>
        )}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-800 shadow-sm">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STATS */}
        <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard
            icon={<Users size={19} />}
            label="Registered"
            value={registeredCount}
          />

          <StatCard
            icon={<Unlock size={19} />}
            label="Available"
            value={availableCount}
            accent="green"
          />

          <StatCard
            icon={<Lock size={19} />}
            label="Locked"
            value={lockedCount}
          />

          <StatCard
            icon={<Clock3 size={19} />}
            label="Expired"
            value={expiredCount}
            accent="red"
          />

          <StatCard
            icon={<Users size={19} />}
            label="Not Created"
            value={notCreatedCount}
            accent="amber"
          />
        </section>

        {/* MAIN ROOM CONTROL */}
        <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_8px_35px_rgba(15,23,42,0.06)]">
          <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-yellow-500" />
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">
                    Tournament Room
                  </h2>
                </div>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  Enter the room details once. The same credentials will be
                  applied to every registered player in this tournament.
                </p>
              </div>

              <div
                className={`inline-flex w-fit items-center gap-2 rounded-full px-3.5 py-2 text-xs font-black ${
                  allReleased
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border border-slate-200 bg-slate-50 text-slate-600"
                }`}
              >
                {allReleased ? (
                  <>
                    <Unlock size={14} />
                    ROOM RELEASED TO ALL
                  </>
                ) : (
                  <>
                    <Lock size={14} />
                    ROOM NOT RELEASED
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {players.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
                <Users className="mx-auto text-slate-400" size={28} />
                <p className="mt-3 font-black text-slate-900">
                  No registered players yet
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Players must register for this tournament before room
                  access can be released.
                </p>
              </div>
            ) : (
              <>
                <div className="grid gap-5 lg:grid-cols-2">
                  <FieldWrapper label="Room ID" icon={<DoorOpen size={15} />}>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={roomId}
                        onChange={(event) => setRoomId(event.target.value)}
                        placeholder="Enter room ID"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                      />

                      {roomId && (
                        <button
                          onClick={() => copyText(roomId, "Room ID")}
                          type="button"
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Copy Room ID"
                        >
                          <Copy size={17} />
                        </button>
                      )}
                    </div>
                  </FieldWrapper>

                  <FieldWrapper
                    label="Room Password"
                    icon={<ShieldCheck size={15} />}
                  >
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={roomPassword}
                        onChange={(event) =>
                          setRoomPassword(event.target.value)
                        }
                        placeholder="Enter room password"
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                      />

                      {roomPassword && (
                        <button
                          onClick={() =>
                            copyText(roomPassword, "Room password")
                          }
                          type="button"
                          className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          title="Copy Password"
                        >
                          <Copy size={17} />
                        </button>
                      )}
                    </div>
                  </FieldWrapper>

                  <FieldWrapper
                    label="Available From"
                    icon={<Clock3 size={15} />}
                  >
                    <input
                      type="datetime-local"
                      value={availableFrom}
                      onChange={(event) =>
                        setAvailableFrom(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      {availableFrom
                        ? formatDate(fromDateTimeLocal(availableFrom))
                        : "Not set"}
                    </p>
                  </FieldWrapper>

                  <FieldWrapper
                    label="Expires At"
                    icon={<Clock3 size={15} />}
                  >
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-900 shadow-sm outline-none transition-all focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                    />

                    <p className="mt-2 text-xs text-slate-400">
                      {expiresAt
                        ? formatDate(fromDateTimeLocal(expiresAt))
                        : "Not set"}
                    </p>
                  </FieldWrapper>
                </div>

                <div className="mt-6 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50 p-4">
                  <div className="flex gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                      <ShieldCheck size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-blue-950">
                        One room for the whole tournament
                      </p>
                      <p className="mt-1 text-xs leading-5 text-blue-700">
                        You do not need to enter the Room ID, password, time,
                        or expiry separately for each player. One release
                        updates every registered player at once.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => saveRoomForAll(false)}
                    disabled={saving || playersLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <Save size={17} />
                    )}
                    Save for All
                  </button>

                  <button
                    type="button"
                    onClick={lockRoomForAll}
                    disabled={saving || playersLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-100 px-5 py-3.5 text-sm font-black text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <Lock size={17} />
                    )}
                    Lock for All
                  </button>

                  <button
                    type="button"
                    onClick={() => saveRoomForAll(true)}
                    disabled={saving || playersLoading}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-slate-900/10 transition-all hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <RefreshCw size={17} className="animate-spin" />
                    ) : (
                      <Unlock size={17} />
                    )}
                    Release to All Players
                  </button>
                </div>

                <p className="mt-3 text-center text-xs text-slate-400">
                  Registered players:{" "}
                  <span className="font-black text-slate-600">
                    {players.length}
                  </span>{" "}
                  • One click updates all of them.
                </p>
              </>
            )}
          </div>
        </section>

        {/* PLAYERS */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
                <h2 className="text-2xl font-black tracking-tight text-slate-950">
                  Registered Players
                </h2>
              </div>

              <p className="mt-1.5 text-sm text-slate-500">
                This list shows who will receive access. No individual room
                setup is required.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
              <Users size={14} />
              {players.length} Registered
            </div>
          </div>

          {playersLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : players.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Users size={30} />
              </div>

              <h3 className="mt-5 text-lg font-black text-slate-900">
                No registered players
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Players who register for this tournament will automatically
                appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_6px_28px_rgba(15,23,42,0.045)]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead className="border-b border-slate-100 bg-slate-50/80">
                    <tr>
                      <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Player
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Email
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Access
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Available From
                      </th>
                      <th className="px-5 py-4 text-left text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
                        Expires At
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {players.map((player) => {
                      const access = player.access;
                      const username =
                        player.profile?.username || "Unknown Player";
                      const initial = username.charAt(0).toUpperCase();

                      return (
                        <tr key={player.user_id} className="hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
                                {initial}
                              </div>

                              <div className="min-w-0">
                                <p className="font-black text-slate-900">
                                  {username}
                                </p>
                                <p className="truncate text-xs text-slate-400">
                                  {player.profile?.full_name || "No name"}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 text-sm text-slate-500">
                            {player.profile?.email || "No email"}
                          </td>

                          <td className="px-5 py-4">
                            {access ? (
                              <StatusBadge status={access.status} />
                            ) : (
                              <span className="rounded-full bg-amber-100 px-3 py-2 text-[10px] font-black tracking-[0.08em] text-amber-700">
                                ACCESS NOT CREATED
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {formatDate(access?.available_from || null)}
                          </td>

                          <td className="px-5 py-4 text-sm font-semibold text-slate-600">
                            {formatDate(access?.expires_at || null)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* SECURITY NOTE */}
        <section className="mt-6 overflow-hidden rounded-[24px] border border-blue-100 bg-gradient-to-r from-blue-50 to-slate-50">
          <div className="flex gap-3 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
              <ShieldCheck size={19} />
            </div>

            <div>
              <p className="text-sm font-black text-blue-950">
                Secure Room Credentials
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-700">
                Room ID and password are released to players only when their
                tournament access is marked Available. The admin manages the
                common room credentials once for the tournament instead of
                editing each player separately.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function InfoPill({
  children,
  green = false,
}: {
  children: React.ReactNode;
  green?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
        green
          ? "bg-emerald-50 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {children}
    </span>
  );
}

function FieldWrapper({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">
        {icon}
        {label}
      </label>

      {children}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent?: "default" | "green" | "red" | "amber";
}) {
  const iconStyle =
    accent === "green"
      ? "bg-emerald-50 text-emerald-600"
      : accent === "red"
      ? "bg-red-50 text-red-600"
      : accent === "amber"
      ? "bg-amber-50 text-amber-600"
      : "bg-slate-100 text-slate-700";

  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div
          className={`rounded-xl p-2.5 transition-transform duration-200 group-hover:scale-105 ${iconStyle}`}
        >
          {icon}
        </div>

        <span className="text-3xl font-black tracking-tight text-slate-950">
          {value}
        </span>
      </div>

      <p className="mt-3 text-[10px] font-black uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: GameAccess["status"];
}) {
  if (status === "available") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black tracking-[0.08em] text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        <Unlock size={13} />
        AVAILABLE
      </span>
    );
  }

  if (status === "expired") {
    return (
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-black tracking-[0.08em] text-red-700">
        <Clock3 size={13} />
        EXPIRED
      </span>
    );
  }

  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100 px-3 py-2 text-[10px] font-black tracking-[0.08em] text-slate-600">
      <Lock size={13} />
      LOCKED
    </span>
  );
}
