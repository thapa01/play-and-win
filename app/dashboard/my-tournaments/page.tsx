import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gamepad2,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Tournament = {
  id: string;
  title: string;
  game: string;
  description: string | null;
  tournament_type: "free" | "paid";
  entry_fee: number;
  prize_pool: number;
  max_players: number;
  registered_players: number;
  start_date: string;
  status: "upcoming" | "live" | "completed" | "cancelled";
  tournament_mode: "solo" | "duo" | "squad";
  team_size: number;
};

type Registration = {
  id: string;
  tournament_id: string;
  status: "registered" | "cancelled" | "completed";
  created_at: string;
  team_id: string | null;
};

type TeamMember = {
  tournament_team_id: string;
  user_id: string;
  role: "captain" | "member";
};

type GameAccess = {
  tournament_id: string;
  status: "locked" | "available" | "expired";
};

type TournamentResult = {
  tournament_id: string;
  user_id: string;
  placement: number;
  prize_amount: number;
};

function createSlug(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatMoney(value: number) {
  return `NPR ${Number(value).toLocaleString("en-NP")}`;
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getTournamentStatus(status: Tournament["status"]) {
  switch (status) {
    case "upcoming":
      return { label: "Upcoming", className: "bg-green-100 text-green-700" };
    case "live":
      return { label: "Live Now", className: "bg-red-100 text-red-700" };
    case "completed":
      return { label: "Completed", className: "bg-slate-100 text-slate-600" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-100 text-red-700" };
    default:
      return { label: status, className: "bg-slate-100 text-slate-600" };
  }
}

function getRegistrationStatus(status: Registration["status"]) {
  switch (status) {
    case "registered":
      return { label: "Registered", className: "bg-green-100 text-green-700" };
    case "completed":
      return { label: "Completed", className: "bg-blue-100 text-blue-700" };
    case "cancelled":
      return { label: "Cancelled", className: "bg-red-100 text-red-700" };
    default:
      return { label: status, className: "bg-slate-100 text-slate-600" };
  }
}

function getModeLabel(mode: Tournament["tournament_mode"]) {
  if (mode === "solo") return "Solo";
  if (mode === "duo") return "Duo";
  return "Squad";
}

export default async function MyTournamentsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: registrationData, error: registrationError } = await supabase
    .from("tournament_registrations")
    .select("id, tournament_id, status, created_at, team_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (registrationError) {
    console.error("Registration error:", registrationError);
  }

  const registrations = (registrationData ?? []) as Registration[];
  const tournamentIds = registrations.map((registration) => registration.tournament_id);

  let tournaments: Tournament[] = [];
  let gameAccess: GameAccess[] = [];
  let teamMembers: TeamMember[] = [];
  let results: TournamentResult[] = [];

  if (tournamentIds.length > 0) {
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select(
        `
          id,
          title,
          game,
          description,
          tournament_type,
          entry_fee,
          prize_pool,
          max_players,
          registered_players,
          start_date,
          status,
          tournament_mode,
          team_size
        `
      )
      .in("id", tournamentIds);

    if (tournamentError) {
      console.error("Tournament error:", tournamentError);
    }

    tournaments = (tournamentData ?? []) as Tournament[];

    const { data: accessData, error: accessError } = await supabase
      .from("game_access")
      .select("tournament_id, status")
      .in("tournament_id", tournamentIds)
      .eq("user_id", user.id);

    if (accessError) {
      console.error("Game access error:", accessError);
    }

    gameAccess = (accessData ?? []) as GameAccess[];

    const teamIds = registrations
      .map((registration) => registration.team_id)
      .filter((id): id is string => Boolean(id));

    if (teamIds.length > 0) {
      const { data: teamMemberData, error: teamMemberError } = await supabase
        .from("tournament_team_members")
        .select("tournament_team_id, user_id, role")
        .in("tournament_team_id", teamIds);

      if (teamMemberError) {
        console.error("Team member error:", teamMemberError);
      }

      teamMembers = (teamMemberData ?? []) as TeamMember[];
    }

    // Player's final placement and prize for each tournament.
    // No kills/points are used here.
    const { data: resultData, error: resultError } = await supabase
      .from("tournament_player_results")
      .select("tournament_id, user_id, placement, prize_amount")
      .eq("user_id", user.id)
      .in("tournament_id", tournamentIds);

    if (resultError) {
      console.error("Tournament result error:", resultError);
    }

    results = (resultData ?? []) as TournamentResult[];
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
                Player Dashboard
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                My Tournaments
              </h1>
              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Track your registered tournaments, results, prizes and game access.
              </p>
            </div>

            <Link
              href="/tournaments"
              className="inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              Browse Tournaments
              <ChevronRight size={17} />
            </Link>
          </div>
        </div>

        {registrations.length > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                  <Trophy size={19} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total Entries</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">{registrations.length}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <Gamepad2 size={19} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Active Tournaments</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {tournaments.filter((t) => t.status === "upcoming" || t.status === "live").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Game Access</p>
                  <p className="mt-1 text-2xl font-black text-slate-950">
                    {gameAccess.filter((access) => access.status === "available").length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {registrations.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm sm:p-16">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-500">
              <Trophy size={35} />
            </div>
            <h2 className="mt-6 text-2xl font-black text-slate-950">No tournaments yet</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              You haven't registered for any tournaments yet. Browse the available tournaments and secure your place.
            </p>
            <Link
              href="/tournaments"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              Browse Tournaments
              <ChevronRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {registrations.map((registration) => {
              const tournament = tournaments.find((item) => item.id === registration.tournament_id);
              if (!tournament) return null;

              const tournamentStatus = getTournamentStatus(tournament.status);
              const registrationStatus = getRegistrationStatus(registration.status);
              const access = gameAccess.find((item) => item.tournament_id === tournament.id);
              const accessAvailable = access?.status === "available";
              const isPaid = Number(tournament.entry_fee) > 0;
              const remainingPlayers = Math.max(tournament.max_players - tournament.registered_players, 0);
              const slug = createSlug(tournament.title);
              const modeLabel = getModeLabel(tournament.tournament_mode);

              const teamMemberRows = registration.team_id
                ? teamMembers.filter((member) => member.tournament_team_id === registration.team_id)
                : [];

              const isTeamRegistration = Boolean(registration.team_id);
              const isCaptain = teamMemberRows.some(
                (member) => member.user_id === user.id && member.role === "captain"
              );

              const result = results.find((item) => item.tournament_id === tournament.id);
              const hasResult = Boolean(result);
              const prizeWon = Number(result?.prize_amount ?? 0);
              const placement = result?.placement ?? null;

              const teamDisplay = isTeamRegistration
                ? `${teamMemberRows.length}/${tournament.team_size} players`
                : "Individual";

              return (
                <article
                  key={registration.id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="p-6 sm:p-7">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-yellow-400">
                          <Trophy size={25} />
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-yellow-600">
                              {tournament.game}
                            </p>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${tournamentStatus.className}`}>
                              {tournamentStatus.label}
                            </span>
                          </div>
                          <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">{tournament.title}</h2>
                          {tournament.description && (
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{tournament.description}</p>
                          )}
                        </div>
                      </div>

                      <span className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${registrationStatus.className}`}>
                        {registrationStatus.label}
                      </span>
                    </div>

                    <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-400"><Users size={16} /><p className="text-xs font-bold uppercase tracking-wide">Format</p></div>
                        <p className="mt-2 font-black text-slate-950">{modeLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {modeLabel === "Solo" ? "1 player" : `${tournament.team_size} players per team`}
                        </p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-400"><Wallet size={16} /><p className="text-xs font-bold uppercase tracking-wide">Entry Fee</p></div>
                        <p className="mt-2 font-black text-slate-950">{isPaid ? formatMoney(Number(tournament.entry_fee)) : "FREE"}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-400"><Trophy size={16} /><p className="text-xs font-bold uppercase tracking-wide">Prize Pool</p></div>
                        <p className="mt-2 font-black text-slate-950">{formatMoney(Number(tournament.prize_pool))}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-400"><CalendarDays size={16} /><p className="text-xs font-bold uppercase tracking-wide">Start Date</p></div>
                        <p className="mt-2 font-black text-slate-950">{formatDate(tournament.start_date)}</p>
                        <p className="mt-1 text-xs text-slate-500">{formatTime(tournament.start_date)}</p>
                      </div>

                      <div className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-slate-400"><Users size={16} /><p className="text-xs font-bold uppercase tracking-wide">Players</p></div>
                        <p className="mt-2 font-black text-slate-950">{tournament.registered_players} / {tournament.max_players}</p>
                        <p className="mt-1 text-xs text-slate-500">{remainingPlayers} spots left</p>
                      </div>
                    </div>

                    <div className={`mt-5 rounded-2xl border p-5 ${isTeamRegistration ? "border-yellow-200 bg-yellow-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isTeamRegistration ? "bg-yellow-100 text-yellow-700" : "bg-white text-slate-500"}`}>
                            <Users size={19} />
                          </div>
                          <div>
                            <p className="font-black text-slate-950">{isTeamRegistration ? `${modeLabel} Team` : "Solo Team"}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {isTeamRegistration
                                ? `${teamDisplay} · ${isCaptain ? "You are the captain" : "You joined as a teammate"}`
                                : "1 player · You are the player"}
                            </p>
                          </div>
                        </div>

                        {isTeamRegistration && (
                          <span className="inline-flex w-fit items-center rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-700">
                            {teamMemberRows.length >= tournament.team_size ? "Team Complete" : "Team In Progress"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* FINAL RESULT / PRIZE */}
                    {tournament.status === "completed" && (
                      <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                            <Trophy size={19} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black uppercase tracking-[0.15em] text-yellow-700">Final Result</p>

                            {hasResult && placement ? (
                              <>
                                <div className="mt-2 flex flex-wrap items-center gap-3">
                                  <p className="text-xl font-black text-slate-950">You finished #{placement}</p>
                                  {prizeWon > 0 ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1.5 text-xs font-black text-green-700">
                                      <CheckCircle2 size={14} />
                                      Prize Won: {formatMoney(prizeWon)}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-600">
                                      <XCircle size={14} />
                                      No Prize
                                    </span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-slate-600">
                                  {prizeWon > 0
                                    ? `Congratulations! You won ${formatMoney(prizeWon)} in this tournament.`
                                    : "You completed the tournament, but no prize was awarded for your position. Try next time!"}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="mt-2 text-xl font-black text-slate-950">Match completed</p>
                                <p className="mt-2 text-sm text-slate-600">Your result was not recorded as a prize-winning position. Try next time — better luck in your next tournament!</p>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={`mt-5 rounded-2xl border p-5 ${accessAvailable ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accessAvailable ? "bg-green-100 text-green-700" : "bg-white text-slate-500"}`}>
                            <ShieldCheck size={19} />
                          </div>
                          <div>
                            <p className="font-black text-slate-950">Game Access</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {accessAvailable
                                ? "Your room details are ready. Open Game Access to view them."
                                : tournament.status === "completed"
                                ? "This tournament has ended."
                                : "Room ID and password will be available when released by the admin."}
                            </p>
                          </div>
                        </div>

                        {accessAvailable ? (
                          <Link href="/dashboard/game-access" className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-5 py-3 text-sm font-black text-white transition hover:bg-green-700">
                            Open Game Access
                            <ChevronRight size={16} />
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-500">
                            <Clock size={15} />
                            Not Available Yet
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Registered On</p>
                      <p className="mt-1 text-sm font-bold text-slate-700">{formatDate(registration.created_at)}</p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Link href={`/tournaments/${slug}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950">
                        View Tournament
                        <ChevronRight size={16} />
                      </Link>
                      {accessAvailable && (
                        <Link href="/dashboard/game-access" className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950">
                          Enter Game Access
                          <Gamepad2 size={16} />
                        </Link>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
