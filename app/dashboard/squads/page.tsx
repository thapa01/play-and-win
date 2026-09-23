"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Gamepad2,
  Crown,
  UserPlus,
  Check,
  X,
  Loader2,
  ShieldCheck,
  Clock3,
  Copy,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Game = "PUBG" | "FREE FIRE" | "MOBILE LEGENDS";

type Squad = {
  id: string;
  name: string;
  game: Game;
  team_size: number;
  captain_id: string;
  created_at: string;
};

type Member = {
  id: string;
  squad_id: string;
  user_id: string;
  role: "captain" | "member";
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  username?: string;
  full_name?: string;
  gaming_id?: string;
  in_game_name?: string;
};

const gameOptions: {
  value: Game;
  label: string;
  defaultSize: number;
  description: string;
}[] = [
  {
    value: "PUBG",
    label: "PUBG",
    defaultSize: 4,
    description: "4-player squad",
  },
  {
    value: "FREE FIRE",
    label: "Free Fire",
    defaultSize: 4,
    description: "4-player squad",
  },
  {
    value: "MOBILE LEGENDS",
    label: "Mobile Legends",
    defaultSize: 5,
    description: "5-player squad",
  },
];

export default function SquadsPage() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [squads, setSquads] = useState<Squad[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [responding, setResponding] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);

  const [squadName, setSquadName] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game>("PUBG");
  const [teamSize, setTeamSize] = useState(4);

  const [selectedSquadId, setSelectedSquadId] = useState<string | null>(
    null
  );

  const [inviteUsername, setInviteUsername] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const { data: squadData, error: squadError } = await supabase
      .from("squads")
      .select(
        "id,name,game,team_size,captain_id,created_at"
      )
      .order("created_at", { ascending: false });

    if (squadError) {
      console.error(squadError);
      setError("Unable to load your squads.");
      setLoading(false);
      return;
    }

    const visibleSquads = (squadData ?? []) as Squad[];
    setSquads(visibleSquads);

    if (
      selectedSquadId &&
      !visibleSquads.some((squad) => squad.id === selectedSquadId)
    ) {
      setSelectedSquadId(null);
    }

    if (!selectedSquadId && visibleSquads.length > 0) {
      setSelectedSquadId(visibleSquads[0].id);
    }

    const squadIds = visibleSquads.map((squad) => squad.id);

    if (squadIds.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    const { data: memberData, error: memberError } = await supabase
      .from("squad_members")
      .select(
        "id,squad_id,user_id,role,status,created_at"
      )
      .in("squad_id", squadIds);

    if (memberError) {
      console.error(memberError);
      setError("Unable to load squad members.");
      setLoading(false);
      return;
    }

    const rawMembers = memberData ?? [];
    const userIds = [
      ...new Set(rawMembers.map((member) => member.user_id)),
    ];

    let profileMap: Record<
      string,
      {
        username: string;
        full_name: string;
      }
    > = {};

    if (userIds.length > 0) {
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("id,username,full_name")
          .in("id", userIds);

      if (profileError) {
        console.error(profileError);
      } else {
        for (const profile of profileData ?? []) {
          profileMap[profile.id] = {
            username: profile.username,
            full_name: profile.full_name,
          };
        }
      }
    }

    let gamingMap: Record<
      string,
      {
        gaming_id: string;
        in_game_name: string;
      }
    > = {};

    if (userIds.length > 0) {
      const { data: gamingData, error: gamingError } =
        await supabase
          .from("player_game_profiles")
          .select("user_id,game,gaming_id,in_game_name")
          .in("user_id", userIds);

      if (gamingError) {
        console.error(gamingError);
      } else {
        for (const gamingProfile of gamingData ?? []) {
          gamingMap[
            `${gamingProfile.user_id}:${gamingProfile.game}`
          ] = {
            gaming_id: gamingProfile.gaming_id,
            in_game_name: gamingProfile.in_game_name,
          };
        }
      }
    }

    const formattedMembers: Member[] = rawMembers.map(
      (member) => {
        const squad = visibleSquads.find(
          (item) => item.id === member.squad_id
        );

        const gamingProfile = squad
          ? gamingMap[
              `${member.user_id}:${squad.game}`
            ]
          : undefined;

        return {
          ...member,
          username:
            profileMap[member.user_id]?.username ??
            "Unknown user",
          full_name:
            profileMap[member.user_id]?.full_name ?? "",
          gaming_id: gamingProfile?.gaming_id,
          in_game_name: gamingProfile?.in_game_name,
        } as Member;
      }
    );

    setMembers(formattedMembers);
    setLoading(false);
  }

  function changeGame(game: Game) {
    setSelectedGame(game);

    const option = gameOptions.find(
      (item) => item.value === game
    );

    setTeamSize(option?.defaultSize ?? 4);
  }

  async function createSquad() {
    if (!userId) {
      setError("You must be logged in.");
      return;
    }

    if (squadName.trim().length < 3) {
      setError("Squad name must be at least 3 characters.");
      return;
    }

    if (teamSize < 2 || teamSize > 10) {
      setError("Team size must be between 2 and 10.");
      return;
    }

    setCreating(true);
    setError("");
    setMessage("");

    const { data: squad, error: squadError } =
      await supabase
        .from("squads")
        .insert({
          name: squadName.trim(),
          game: selectedGame,
          team_size: teamSize,
          captain_id: userId,
        })
        .select()
        .single();

    if (squadError || !squad) {
      console.error(squadError);
      setError(
        squadError?.message ||
          "Unable to create squad."
      );
      setCreating(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("squad_members")
      .insert({
        squad_id: squad.id,
        user_id: userId,
        role: "captain",
        status: "accepted",
      });

    if (memberError) {
      console.error(memberError);

      // Roll back the squad if captain membership fails.
      await supabase
        .from("squads")
        .delete()
        .eq("id", squad.id);

      setError(
        "Squad could not be created. Please try again."
      );
      setCreating(false);
      return;
    }

    setSquadName("");
    setSelectedGame("PUBG");
    setTeamSize(4);
    setShowCreate(false);
    setSelectedSquadId(squad.id);

    setMessage(
      `Squad "${squad.name}" created successfully.`
    );

    setCreating(false);

    await loadData();
  }

  async function invitePlayer() {
    if (!selectedSquadId) {
      setError("Select a squad first.");
      return;
    }

    if (!inviteUsername.trim()) {
      setError("Enter a Play & Win username.");
      return;
    }

    setInviting(true);
    setError("");
    setMessage("");

    const { error: inviteError } = await supabase.rpc(
      "invite_player_to_squad",
      {
        target_squad_id: selectedSquadId,
        target_username: inviteUsername.trim(),
      }
    );

    if (inviteError) {
      console.error(inviteError);
      setError(
        inviteError.message ||
          "Unable to send squad invitation."
      );
      setInviting(false);
      return;
    }

    setInviteUsername("");

    setMessage(
      "Squad invitation sent successfully."
    );

    setInviting(false);

    await loadData();
  }

  async function respondToInvitation(
    membershipId: string,
    accept: boolean
  ) {
    setResponding(membershipId);
    setError("");
    setMessage("");

    const { error: responseError } =
      await supabase.rpc(
        "respond_to_squad_invitation",
        {
          target_membership_id: membershipId,
          accept_invitation: accept,
        }
      );

    if (responseError) {
      console.error(responseError);
      setError(
        responseError.message ||
          "Unable to process invitation."
      );
      setResponding(null);
      return;
    }

    setMessage(
      accept
        ? "Squad invitation accepted."
        : "Squad invitation rejected."
    );

    setResponding(null);

    await loadData();
  }

  const selectedSquad = useMemo(
    () =>
      squads.find(
        (squad) => squad.id === selectedSquadId
      ) ?? null,
    [squads, selectedSquadId]
  );

  const selectedMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          member.squad_id === selectedSquadId
      ),
    [members, selectedSquadId]
  );

  const acceptedMembers = selectedMembers.filter(
    (member) => member.status === "accepted"
  );

  const pendingInvitesForCaptain =
    selectedMembers.filter(
      (member) => member.status === "pending"
    );

  const myPendingInvitations = members.filter(
    (member) =>
      member.user_id === userId &&
      member.status === "pending"
  );

  const myCaptainSquads = squads.filter(
    (squad) => squad.captain_id === userId
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex min-h-20 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <Link href="/dashboard" className="shrink-0">
              <div className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                PLAY <span className="text-yellow-500">&amp;</span> WIN
              </div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Gaming Platform
              </div>
            </Link>
          </div>
        </header>
        <div className="flex min-h-[calc(100vh-80px)] items-center justify-center px-6">
          <div className="flex items-center gap-3 text-slate-600">
            <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
            Loading squads...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-20 items-center justify-between gap-6 max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link href="/dashboard" className="shrink-0">
            <div className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              PLAY <span className="text-yellow-500">&amp;</span> WIN
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
              Gaming Platform
            </div>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 transition hover:text-yellow-600">Home</Link>
            <Link href="/dashboard/tournaments" className="text-sm font-medium text-slate-600 transition hover:text-yellow-600">Tournaments</Link>
            <Link href="/dashboard/gaming-ids" className="text-sm font-medium text-slate-600 transition hover:text-yellow-600">Gaming IDs</Link>
            <Link href="/dashboard/squads" className="text-sm font-semibold text-yellow-600">My Squads</Link>
          </nav>
          <Link href="/dashboard" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-slate-950">
            Dashboard
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              <Users className="h-4 w-4" />
              Squad Management
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              My Squads
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Create and manage your gaming squads for
              team tournaments.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowCreate(true);
              setError("");
              setMessage("");
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950 shadow-sm transition hover:bg-yellow-400 hover:text-slate-950"
          >
            <Plus className="h-4 w-4" />
            Create Squad
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Pending Invitations */}
        {myPendingInvitations.length > 0 && (
          <section className="mb-8 rounded-3xl border border-yellow-200 bg-yellow-50 p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                <Clock3 className="h-5 w-5 text-yellow-600" />
              </div>

              <div>
                <h2 className="font-bold text-slate-950">
                  Squad Invitations
                </h2>
                <p className="text-sm text-slate-600">
                  You have pending squad invitations.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {myPendingInvitations.map(
                (invitation) => {
                  const squad = squads.find(
                    (item) =>
                      item.id === invitation.squad_id
                  );

                  return (
                    <div
                      key={invitation.id}
                      className="flex flex-col gap-4 rounded-2xl border border-yellow-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-semibold text-slate-950">
                          {squad?.name ??
                            "Squad Invitation"}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {squad?.game} •{" "}
                          {squad?.team_size} players
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          disabled={
                            responding ===
                            invitation.id
                          }
                          onClick={() =>
                            respondToInvitation(
                              invitation.id,
                              true
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:opacity-50"
                        >
                          {responding ===
                          invitation.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Accept
                        </button>

                        <button
                          type="button"
                          disabled={
                            responding ===
                            invitation.id
                          }
                          onClick={() =>
                            respondToInvitation(
                              invitation.id,
                              false
                            )
                          }
                          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                          Reject
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </section>
        )}

        {squads.length === 0 ? (
          /* Empty state */
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <Users className="h-8 w-8 text-slate-700" />
            </div>

            <h2 className="text-xl font-bold text-slate-950">
              No squads yet
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              Create your first squad and invite other
              registered Play &amp; Win players.
            </p>

            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              <Plus className="h-4 w-4" />
              Create Your Squad
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">

            {/* Squad List */}
            <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 px-2">
                <h2 className="font-bold text-slate-950">
                  Your Squads
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {squads.length} squad
                  {squads.length !== 1 ? "s" : ""}
                </p>
              </div>

              <div className="space-y-2">
                {squads.map((squad) => {
                  const active =
                    squad.id === selectedSquadId;

                  const captain =
                    squad.captain_id === userId;

                  return (
                    <button
                      key={squad.id}
                      type="button"
                      onClick={() =>
                        setSelectedSquadId(squad.id)
                      }
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            active
                              ? "bg-white/10"
                              : "bg-slate-100"
                          }`}
                        >
                          <Gamepad2
                            className={`h-5 w-5 ${
                              active
                                ? "text-white"
                                : "text-slate-700"
                            }`}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">
                            {squad.name}
                          </p>

                          <p
                            className={`mt-1 text-xs ${
                              active
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            {squad.game}
                          </p>

                          <div
                            className={`mt-2 flex items-center gap-1 text-xs ${
                              active
                                ? "text-slate-300"
                                : "text-slate-500"
                            }`}
                          >
                            <Users className="h-3.5 w-3.5" />
                            {squad.team_size} players
                          </div>
                        </div>

                        {captain && (
                          <Crown
                            className={`h-4 w-4 ${
                              active
                                ? "text-white"
                                : "text-slate-500"
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* Selected Squad */}
            {selectedSquad && (
              <section className="space-y-6">

                {/* Squad Header */}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white">
                        <Gamepad2 className="h-7 w-7" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-2xl font-bold text-slate-950">
                            {selectedSquad.name}
                          </h2>

                          {selectedSquad.captain_id ===
                            userId && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                              <Crown className="h-3.5 w-3.5" />
                              Captain
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {selectedSquad.game}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl bg-slate-50 px-5 py-3 text-center">
                      <p className="text-2xl font-bold text-slate-950">
                        {acceptedMembers.length}/
                        {selectedSquad.team_size}
                      </p>

                      <p className="text-xs font-medium text-slate-500">
                        Squad Members
                      </p>
                    </div>
                  </div>
                </div>

                {/* Invite Player */}
                {selectedSquad.captain_id ===
                  userId && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-5 flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                        <UserPlus className="h-5 w-5 text-slate-700" />
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-950">
                          Invite Player
                        </h3>

                        <p className="text-sm text-slate-500">
                          Invite an existing Play &amp; Win
                          user to your squad.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        type="text"
                        value={inviteUsername}
                        onChange={(event) =>
                          setInviteUsername(
                            event.target.value
                          )
                        }
                        placeholder="Enter Play & Win username"
                        disabled={inviting}
                        className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-950 outline-none focus:border-yellow-400 focus:bg-white"
                      />

                      <button
                        type="button"
                        onClick={invitePlayer}
                        disabled={inviting}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:opacity-50"
                      >
                        {inviting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <UserPlus className="h-4 w-4" />
                        )}
                        Invite
                      </button>
                    </div>
                  </div>
                )}

                {/* Members */}
                <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-950">
                          Squad Members
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Gaming information for this
                          squad.
                        </p>
                      </div>

                      <ShieldCheck className="h-5 w-5 text-slate-400" />
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {acceptedMembers.map(
                      (member) => (
                        <div
                          key={member.id}
                          className="p-5 sm:p-6"
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-4">
                              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                                {(
                                  member.username ??
                                  "U"
                                )
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>

                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-slate-950">
                                    {member.full_name ||
                                      member.username}
                                  </p>

                                  {member.role ===
                                    "captain" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">
                                      <Crown className="h-3 w-3" />
                                      Captain
                                    </span>
                                  )}
                                </div>

                                <p className="mt-1 text-sm text-slate-500">
                                  @{member.username}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-slate-50 px-4 py-3 sm:min-w-[260px]">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                {selectedSquad.game} Gaming Profile
                              </p>

                              {member.gaming_id &&
                              member.in_game_name ? (
                                <div className="mt-2">
                                  <p className="font-semibold text-slate-950">
                                    {member.in_game_name}
                                  </p>

                                  <p className="mt-1 text-sm text-slate-500">
                                    ID:{" "}
                                    {member.gaming_id}
                                  </p>
                                </div>
                              ) : (
                                <p className="mt-2 text-sm text-yellow-600">
                                  Gaming profile not added
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {acceptedMembers.length === 0 && (
                      <div className="p-10 text-center text-sm text-slate-500">
                        No accepted members yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Pending invitations */}
                {selectedSquad.captain_id ===
                  userId &&
                  pendingInvitesForCaptain.length >
                    0 && (
                    <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
                      <h3 className="font-bold text-slate-950">
                        Pending Invitations
                      </h3>

                      <div className="mt-4 space-y-2">
                        {pendingInvitesForCaptain.map(
                          (member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between rounded-2xl bg-white p-4"
                            >
                              <div>
                                <p className="font-semibold text-slate-950">
                                  @{member.username}
                                </p>

                                <p className="text-xs text-slate-500">
                                  Waiting for acceptance
                                </p>
                              </div>

                              <Clock3 className="h-4 w-4 text-yellow-500" />
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </section>
            )}
          </div>
        )}

        {/* Security note */}
        <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-600" />

            <p className="text-sm leading-6 text-slate-600">
              <strong className="text-slate-950">
                Squad security:
              </strong>{" "}
              only registered Play &amp; Win users can
              join a squad. Invitations must be accepted
              by the invited player before they become an
              active member.
            </p>
          </div>
        </div>
      </div>

      {/* Create Squad Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-7">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Create Squad
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a squad for team tournaments.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Squad Name
                </label>

                <input
                  type="text"
                  value={squadName}
                  onChange={(event) =>
                    setSquadName(event.target.value)
                  }
                  placeholder="e.g. Thunder Warriors"
                  disabled={creating}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Game
                </label>

                <div className="grid gap-2">
                  {gameOptions.map((game) => (
                    <button
                      key={game.value}
                      type="button"
                      onClick={() =>
                        changeGame(game.value)
                      }
                      disabled={creating}
                      className={`flex items-center justify-between rounded-2xl border p-4 text-left transition ${
                        selectedGame === game.value
                          ? "border-slate-900 bg-slate-950 text-white"
                          : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                    >
                      <div>
                        <p className="font-semibold">
                          {game.label}
                        </p>

                        <p
                          className={`mt-1 text-xs ${
                            selectedGame === game.value
                              ? "text-slate-300"
                              : "text-slate-500"
                          }`}
                        >
                          {game.description}
                        </p>
                      </div>

                      {selectedGame === game.value && (
                        <Check className="h-5 w-5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Team Size
                </label>

                <select
                  value={teamSize}
                  onChange={(event) =>
                    setTeamSize(
                      Number(event.target.value)
                    )
                  }
                  disabled={creating}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-yellow-400 focus:bg-white"
                >
                  {Array.from(
                    { length: 9 },
                    (_, index) => index + 2
                  ).map((size) => (
                    <option key={size} value={size}>
                      {size} Players
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowCreate(false)
                }
                disabled={creating}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={createSquad}
                disabled={creating}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:opacity-50"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Squad
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}