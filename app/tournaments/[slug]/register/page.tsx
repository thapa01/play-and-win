"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LockKeyhole,
  ShieldCheck,
  Trophy,
  Wallet,
  Users,
  CalendarDays,
  AlertCircle,
  UserPlus,
  Clock3,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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

export default function TournamentRegisterPage() {
  const params = useParams();
  const router = useRouter();

  const slug = params.slug as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [captainUsername, setCaptainUsername] = useState("");
  const [captainGamingId, setCaptainGamingId] = useState("");
  const [captainInGameName, setCaptainInGameName] = useState("");

  const [teamId, setTeamId] = useState<string | null>(null);

  /*
   * teamMemberCount = TOTAL players in the team, INCLUDING the captain.
   * (0 means no team has been created yet.)
   */
  const [teamMemberCount, setTeamMemberCount] = useState(0);
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [pendingInvites, setPendingInvites] = useState<
    { id: string; username: string }[]
  >([]);
  const [declinedInvites, setDeclinedInvites] = useState<
    { id: string; username: string }[]
  >([]);
  const [inviteUsername, setInviteUsername] = useState("");
  const [teammateGamingId, setTeammateGamingId] = useState("");
  const [teammateInGameName, setTeammateInGameName] = useState("");

  // Squad mode: all teammate slots are shown at once and filled in one go.
  const [squadRows, setSquadRows] = useState<
    { username: string; gamingId: string; inGameName: string }[]
  >([
    { username: "", gamingId: "", inGameName: "" },
    { username: "", gamingId: "", inGameName: "" },
    { username: "", gamingId: "", inGameName: "" },
  ]);
  const [addedTeammates, setAddedTeammates] = useState<
    { id: string; username: string }[]
  >([]);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [changingInviteId, setChangingInviteId] = useState<string | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const [message, setMessage] = useState("");
  const [registrationConfirmed, setRegistrationConfirmed] = useState(false);
  const [error, setError] = useState("");

  async function loadTournamentTeam(
    userId: string,
    tournamentId: string
  ) {
    const supabase = createClient();

    const { data: team } = await supabase
      .from("tournament_teams")
      .select("id")
      .eq("tournament_id", tournamentId)
      .eq("captain_id", userId)
      .maybeSingle();

    if (!team) {
      setTeamId(null);
      setTeamMemberCount(0);
      setPendingInviteCount(0);
      setPendingInvites([]);
      setAddedTeammates([]);
      setDeclinedInvites([]);
      return;
    }

    setTeamId(team.id);

    const [
      { data: memberRows },
      { data: pendingInviteRows },
      { data: declinedInviteRows },
    ] = await Promise.all([
      supabase
        .from("tournament_team_members")
        .select("id, user_id")
        .eq("tournament_team_id", team.id),

      supabase
        .from("tournament_team_invites")
        .select("id, invited_user_id")
        .eq("tournament_team_id", team.id)
        .eq("status", "pending")
        .order("created_at", { ascending: true }),

      supabase
        .from("tournament_team_invites")
        .select("id, invited_user_id")
        .eq("tournament_team_id", team.id)
        .eq("status", "rejected")
        .order("responded_at", { ascending: false }),
    ]);

    /*
     * FIX #1:
     * tournament_team_members only contains the teammates, NOT the captain.
     * The captain must be counted as well, otherwise a Duo accepts
     * Captain + 2 teammates (3 players) and a Squad accepts 5 players.
     */
    const teammateRows = (
      (memberRows || []) as { id: string; user_id: string }[]
    ).filter((row) => row.user_id !== userId);
    const teammateCount = teammateRows.length;
    const totalTeamPlayers = teammateCount + 1; // +1 for the captain

    const pendingRows = (pendingInviteRows || []) as {
      id: string;
      invited_user_id: string;
    }[];

    const declinedRows = (declinedInviteRows || []) as {
      id: string;
      invited_user_id: string;
    }[];

    const allInvitedUserIds = Array.from(
      new Set([
        ...pendingRows.map((row) => row.invited_user_id),
        ...declinedRows.map((row) => row.invited_user_id),
        ...teammateRows.map((row) => row.user_id),
      ])
    );

    let usernameById = new Map<string, string>();

    if (allInvitedUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", allInvitedUserIds);

      usernameById = new Map(
        (profiles || []).map((profile) => [
          profile.id,
          profile.username || "Unknown player",
        ])
      );
    }

    /*
     * Teammate usernames come from a secure database function, because
     * row-level security usually stops one player from reading another
     * player's profile directly (which caused "Unknown player").
     */
    const { data: teammateNameRows } = await supabase.rpc(
      "get_my_team_teammates",
      { target_tournament_id: tournamentId }
    );

    (
      (teammateNameRows || []) as {
        user_id: string;
        username: string | null;
      }[]
    ).forEach((row) => {
      if (row.username) {
        usernameById.set(row.user_id, row.username);
      }
    });

    const inviteDetails = pendingRows.map((row) => ({
      id: row.id,
      username: usernameById.get(row.invited_user_id) || "Unknown player",
    }));

    const declinedDetails = declinedRows.map((row) => ({
      id: row.id,
      username: usernameById.get(row.invited_user_id) || "Unknown player",
    }));

    setAddedTeammates(
      teammateRows.map((row) => ({
        id: row.id,
        username: usernameById.get(row.user_id) || "Unknown player",
      }))
    );
    setTeamMemberCount(totalTeamPlayers);
    setPendingInviteCount(inviteDetails.length);
    setPendingInvites(inviteDetails);
    setDeclinedInvites(declinedDetails);
  }

  useEffect(() => {
    async function loadTournament() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .in("status", ["upcoming", "live"]);

      if (tournamentError || !data) {
        setError("Unable to load tournament.");
        setLoading(false);
        return;
      }

      const found = data.find(
        (item) => createSlug(item.title) === slug
      ) as Tournament | undefined;

      if (!found) {
        setError("Tournament not found.");
        setLoading(false);
        return;
      }

      setTournament(found);

      if (user) {
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();

        if (wallet) {
          setWalletBalance(Number(wallet.balance));
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .maybeSingle();

        setCaptainUsername(profile?.username || "");

        const { data: savedDetails } = await supabase
          .from("tournament_player_game_details")
          .select("gaming_id, in_game_name")
          .eq("tournament_id", found.id)
          .eq("user_id", user.id)
          .maybeSingle();

        setCaptainGamingId(savedDetails?.gaming_id || "");
        setCaptainInGameName(savedDetails?.in_game_name || "");

        if (found.tournament_mode !== "solo") {
          await loadTournamentTeam(user.id, found.id);
        } else {
          setTeamId(null);
          setTeamMemberCount(0);
          setPendingInviteCount(0);
        }
      } else {
        setTeamId(null);
        setTeamMemberCount(0);
        setPendingInviteCount(0);
      }

      setLoading(false);
    }

    loadTournament();
  }, [slug]);

  async function refreshData(userId: string, tournamentId: string) {
    const supabase = createClient();

    const [{ data: updatedWallet }, { data: updatedTournament }] =
      await Promise.all([
        supabase
          .from("wallets")
          .select("balance")
          .eq("user_id", userId)
          .maybeSingle(),

        supabase
          .from("tournaments")
          .select("*")
          .eq("id", tournamentId)
          .single(),
      ]);

    if (updatedWallet) {
      setWalletBalance(Number(updatedWallet.balance));
    }

    if (updatedTournament) {
      setTournament(updatedTournament as Tournament);
    }
  }

  async function sendTournamentInvite() {
    setError("");
    setMessage("");

    // Prevent double clicks / double Enter presses
    if (sendingInvite) {
      return;
    }

    if (!tournament || tournament.tournament_mode === "solo") {
      return;
    }

    const username = inviteUsername.trim();
    const gamingId = teammateGamingId.trim();
    const inGameName = teammateInGameName.trim();

    if (!username || !gamingId || !inGameName) {
      setError(
        "Enter your teammate's username, gaming ID, and in-game name."
      );
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirect=/tournaments/${slug}/register`);
      return;
    }

    if (!captainGamingId.trim() || !captainInGameName.trim()) {
      setError(
        `Enter your Captain ${tournament.game} Gaming ID and in-game name above before adding your teammate.`
      );
      return;
    }

    const teamSize =
      tournament.tournament_mode === "duo"
        ? 2
        : Number(tournament.team_size || 4);

    // teamMemberCount already includes the captain
    if (teamMemberCount + pendingInviteCount >= teamSize) {
      setError("Your tournament team is already full.");
      return;
    }

    setSendingInvite(true);

    try {
      const captainSaveError = await saveCaptainGameDetails(user.id);

      if (captainSaveError) {
        throw new Error(captainSaveError);
      }

      const { data: addedTeamId, error: teamError } = await supabase.rpc(
        "add_tournament_teammate_direct",
        {
          target_tournament_id: tournament.id,
          target_username: username,
          target_gaming_id: gamingId,
          target_in_game_name: inGameName,
        }
      );

      if (teamError) {
        throw new Error(teamError.message);
      }

      if (!addedTeamId) {
        throw new Error("Unable to add your teammate.");
      }

      setInviteUsername("");
      setTeammateGamingId("");
      setTeammateInGameName("");

      await loadTournamentTeam(user.id, tournament.id);

      setMessage(
        `@${username.replace(/^@/, "")} has been added to your team successfully.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add your teammate."
      );
    } finally {
      setSendingInvite(false);
    }
  }

  async function saveCaptainGameDetails(
    userId: string
  ): Promise<string | null> {
    if (!tournament) return "Tournament not found.";

    const supabase = createClient();

    const { error: saveError } = await supabase
      .from("tournament_player_game_details")
      .upsert(
        {
          tournament_id: tournament.id,
          user_id: userId,
          game: tournament.game,
          gaming_id: captainGamingId.trim(),
          in_game_name: captainInGameName.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "tournament_id,user_id" }
      );

    if (saveError) {
      return `Unable to save your ${tournament.game} gaming details: ${saveError.message}`;
    }

    return null;
  }

  function updateSquadRow(
    index: number,
    field: "username" | "gamingId" | "inGameName",
    value: string
  ) {
    setSquadRows((rows) => {
      const next = [...rows];
      while (next.length <= index) {
        next.push({ username: "", gamingId: "", inGameName: "" });
      }
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  async function addSquadTeammates() {
    setError("");
    setMessage("");

    if (sendingInvite) return;
    if (!tournament || tournament.tournament_mode !== "squad") return;

    const slotsToFill = teamSlotsRemaining;

    if (slotsToFill <= 0) {
      setError("Your tournament team is already full.");
      return;
    }

    if (!captainGamingId.trim() || !captainInGameName.trim()) {
      setError(
        `Enter your Captain ${tournament.game} Gaming ID and in-game name above before adding teammates.`
      );
      return;
    }

    const alreadyAdded = Math.max(teamMemberCount - 1, 0);
    const emptyRow = { username: "", gamingId: "", inGameName: "" };
    const rows = Array.from(
      { length: slotsToFill },
      (_, i) => squadRows[i] ?? emptyRow
    );

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (
        !row.username.trim() ||
        !row.gamingId.trim() ||
        !row.inGameName.trim()
      ) {
        setError(
          `Enter the username, gaming ID, and in-game name for Teammate ${alreadyAdded + i + 1}.`
        );
        return;
      }
    }

    // Block duplicates: the captain, existing teammates, or the same name twice.
    const normalize = (value: string) =>
      value.trim().replace(/^@/, "").toLowerCase();

    const seen = new Set<string>([
      normalize(captainUsername),
      ...addedTeammates.map((mate) => normalize(mate.username)),
    ]);

    for (let i = 0; i < rows.length; i++) {
      const key = normalize(rows[i].username);

      if (seen.has(key)) {
        setError(
          `@${key} is already in your team or has been entered twice.`
        );
        return;
      }

      seen.add(key);
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?redirect=/tournaments/${slug}/register`);
      return;
    }

    setSendingInvite(true);

    try {
      const captainSaveError = await saveCaptainGameDetails(user.id);

      if (captainSaveError) {
        throw new Error(captainSaveError);
      }

      const addedIndexes: number[] = [];
      let failureMessage = "";

      // Teammates are added one by one using the existing secure function.
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        const { data: addedTeamId, error: rpcError } = await supabase.rpc(
          "add_tournament_teammate_direct",
          {
            target_tournament_id: tournament.id,
            target_username: row.username.trim(),
            target_gaming_id: row.gamingId.trim(),
            target_in_game_name: row.inGameName.trim(),
          }
        );

        if (rpcError || !addedTeamId) {
          failureMessage = `Teammate ${alreadyAdded + i + 1} (@${normalize(
            row.username
          )}): ${rpcError?.message || "Unable to add your teammate."}`;
          break;
        }

        addedIndexes.push(i);
      }

      // Always reload the real team from the database.
      await loadTournamentTeam(user.id, tournament.id);

      // Keep only the rows that were NOT added, so they can be corrected.
      const leftover = rows.filter((_, i) => !addedIndexes.includes(i));
      const nextRows = [...leftover];

      while (nextRows.length < Math.max(tournamentTeamSize - 1, 1)) {
        nextRows.push({ ...emptyRow });
      }

      setSquadRows(nextRows);

      if (failureMessage) {
        setError(
          addedIndexes.length > 0
            ? `${addedIndexes.length} teammate(s) were added, but ${failureMessage}`
            : failureMessage
        );
      } else {
        setMessage(
          addedIndexes.length === 1
            ? "Teammate added to your team successfully."
            : `${addedIndexes.length} teammates added to your team successfully.`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add your teammates."
      );
    } finally {
      setSendingInvite(false);
    }
  }

  async function changeTournamentInvite(inviteId: string) {
    setError("");
    setMessage("");
    setChangingInviteId(inviteId);

    try {
      const supabase = createClient();

      const { error: changeError } = await supabase.rpc(
        "change_tournament_team_invite",
        {
          target_invite_id: inviteId,
        }
      );

      if (changeError) {
        throw new Error(changeError.message);
      }

      if (tournament) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          await loadTournamentTeam(user.id, tournament.id);
        }
      }

      setMessage(
        "The previous invitation was cancelled. You can now invite a different player."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to change the invited player."
      );
    } finally {
      setChangingInviteId(null);
    }
  }

  async function handleRegister() {
    setError("");
    setMessage("");

    if (!tournament) {
      setError("Tournament not found.");
      return;
    }

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(
        `/login?redirect=/tournaments/${slug}/register`
      );
      return;
    }

    const mode = tournament.tournament_mode || "solo";
    const teamSize =
      mode === "solo"
        ? 1
        : mode === "duo"
          ? 2
          : Number(tournament.team_size || 4);

    const isPaid = Number(tournament.entry_fee) > 0;
    const isFull =
      tournament.registered_players >= tournament.max_players;

    if (tournament.status !== "upcoming") {
      setError(
        tournament.status === "live"
          ? "Registration is closed because this tournament has already started."
          : "Registration is not available for this tournament."
      );
      return;
    }

    if (isFull) {
      setError("This tournament is already full.");
      return;
    }

    if (mode !== "solo") {
      if (!teamId) {
        setError(
          mode === "duo"
            ? "Add your Duo teammate before registering."
            : "Add your Squad teammates before registering."
        );
        return;
      }

      const teamSlotsUsedForRegistration =
        teamMemberCount + pendingInviteCount;

      if (teamSlotsUsedForRegistration < teamSize) {
        setError(
          mode === "duo"
            ? "Add your Duo teammate before registering."
            : `Add all ${teamSize - 1} Squad teammates before registration.`
        );
        return;
      }
    }

    if (!captainGamingId.trim() || !captainInGameName.trim()) {
      setError(
        `Enter your ${tournament.game} Gaming ID and in-game name before registering.`
      );
      return;
    }

    if (
      isPaid &&
      walletBalance !== null &&
      walletBalance < Number(tournament.entry_fee)
    ) {
      setError(
        `Insufficient wallet balance. You need ${formatMoney(
          Number(tournament.entry_fee) - walletBalance
        )} more.`
      );
      return;
    }

    setRegistering(true);

    try {
      const { error: gameProfileError } = await supabase
        .from("tournament_player_game_details")
        .upsert(
          {
            tournament_id: tournament.id,
            user_id: user.id,
            game: tournament.game,
            gaming_id: captainGamingId.trim(),
            in_game_name: captainInGameName.trim(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "tournament_id,user_id" }
        );

      if (gameProfileError) {
        throw new Error(
          `Unable to save your ${tournament.game} gaming details: ${gameProfileError.message}`
        );
      }

      /*
       * Solo uses the existing secure registration function.
       * Duo/Squad uses the tournament-team registration function.
       */
      const { error: registrationError } =
        mode === "solo"
          ? await supabase.rpc("register_for_tournament_v2", {
              target_tournament_id: tournament.id,
              target_squad_id: null,
            })
          : await supabase.rpc("register_tournament_team", {
              target_tournament_id: tournament.id,
            });

      if (registrationError) {
        let friendlyMessage = registrationError.message;

        const rawMessage =
          registrationError.message?.toLowerCase() || "";

        if (rawMessage.includes("already registered")) {
          friendlyMessage =
            "You or one of your selected teammates is already registered for this tournament.";
        } else if (rawMessage.includes("insufficient wallet")) {
          friendlyMessage =
            "Your wallet balance is not sufficient for this tournament.";
        } else if (rawMessage.includes("tournament is full")) {
          friendlyMessage = "This tournament is now full.";
        } else if (
          rawMessage.includes("registration is not available")
        ) {
          friendlyMessage =
            "Registration is no longer available for this tournament.";
        } else if (
          rawMessage.includes("team") ||
          rawMessage.includes("teammate")
        ) {
          friendlyMessage = registrationError.message;
        } else if (
          rawMessage.includes("gaming profile") ||
          rawMessage.includes("game profile") ||
          rawMessage.includes("gaming details") ||
          rawMessage.includes("gaming id") ||
          rawMessage.includes("in-game name")
        ) {
          friendlyMessage = registrationError.message;
        }

        throw new Error(friendlyMessage);
      }

      await refreshData(user.id, tournament.id);

      /*
       * FIX #2:
       * Previously the team state was reset to 0 here, which made the
       * "Registration Confirmed" screen think the team was empty and
       * show the Add Teammate form again. Reload the real team instead.
       */
      if (mode !== "solo") {
        await loadTournamentTeam(user.id, tournament.id);
      }

      setInviteUsername("");
      setTeammateGamingId("");
      setTeammateInGameName("");
      setRegistrationConfirmed(true);

      setMessage(
        mode === "solo"
          ? "Registration successful! Your tournament entry has been confirmed."
          : `Registration successful! Your ${mode === "duo" ? "Duo" : "Squad"} has been registered for this tournament.`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to complete registration."
      );
    } finally {
      setRegistering(false);
    }
  }

  const tournamentMode = tournament?.tournament_mode || "solo";

  const tournamentTeamSize =
    tournamentMode === "solo"
      ? 1
      : tournamentMode === "duo"
        ? 2
        : Number(tournament?.team_size || 4);

  const teamReady =
    tournamentMode === "solo" ||
    (Boolean(teamId) &&
      teamMemberCount + pendingInviteCount >= tournamentTeamSize);

  // The captain always occupies one slot, even before the team row exists.
  const teamSlotsUsed = Math.max(teamMemberCount, 1) + pendingInviteCount;
  const teamSlotsRemaining = Math.max(
    tournamentTeamSize - teamSlotsUsed,
    0
  );

  const squadRowsFilled = Array.from(
    { length: teamSlotsRemaining },
    (_, i) => squadRows[i]
  ).every(
    (row) =>
      Boolean(row) &&
      row.username.trim() !== "" &&
      row.gamingId.trim() !== "" &&
      row.inGameName.trim() !== ""
  );

  // Squad teammate slots that are completely filled in (live preview).
  const filledSquadSlots =
    tournamentMode === "squad"
      ? Array.from({ length: teamSlotsRemaining }, (_, i) => squadRows[i]).filter(
          (row) =>
            Boolean(row) &&
            row.username.trim() !== "" &&
            row.gamingId.trim() !== "" &&
            row.inGameName.trim() !== ""
        ).length
      : 0;

  // Counter shown in "Your Team": captain + added teammates + filled slots.
  const playersCounter = Math.min(
    tournamentTeamSize,
    Math.max(
      teamMemberCount,
      captainGamingId.trim() && captainInGameName.trim() ? 1 : 0
    ) + filledSquadSlots
  );

  const isPaid = useMemo(
    () => Number(tournament?.entry_fee ?? 0) > 0,
    [tournament]
  );

  const isFull = useMemo(() => {
    if (!tournament) return false;

    return tournament.registered_players >= tournament.max_players;
  }, [tournament]);

  const remainingPlayers = useMemo(() => {
    if (!tournament) return 0;

    return Math.max(
      tournament.max_players - tournament.registered_players,
      0
    );
  }, [tournament]);

  const insufficientBalance =
    isPaid &&
    walletBalance !== null &&
    tournament !== null &&
    walletBalance < Number(tournament.entry_fee);

  const registrationClosed =
    tournament?.status !== "upcoming" || isFull;

  const canRegister =
    !registering &&
    !registrationClosed &&
    !insufficientBalance &&
    teamReady;

  const afterBalance =
    isPaid && walletBalance !== null && tournament
      ? walletBalance - Number(tournament.entry_fee)
      : walletBalance;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-6">
            <div className="h-5 w-40 rounded bg-slate-200" />

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <div className="h-[620px] rounded-3xl bg-white shadow-sm" />
              <div className="h-[420px] rounded-3xl bg-white shadow-sm" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/tournaments"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to Tournaments
          </Link>

          <div className="mt-6 rounded-3xl border border-red-200 bg-white p-10 text-center shadow-sm">
            <AlertCircle className="mx-auto text-red-500" size={40} />

            <p className="mt-4 font-black text-red-600">
              {error || "Tournament not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href={`/tournaments/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to Tournament
        </Link>

        {/* Header */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                <Trophy size={27} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
                  {tournament.game}
                </p>

                <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  Register for {tournament.title}
                </h1>
              </div>
            </div>

            <div
              className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider ${
                tournament.status === "upcoming"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {tournament.status === "upcoming"
                ? "Registration Open"
                : "Registration Closed"}
            </div>
          </div>

          {/* Tournament quick information */}
          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <CalendarDays size={17} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Starts
                </span>
              </div>

              <p className="mt-2 font-black text-slate-950">
                {formatDate(tournament.start_date)}
              </p>

              <p className="text-sm text-slate-500">
                {formatTime(tournament.start_date)}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Users size={17} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Players
                </span>
              </div>

              <p className="mt-2 font-black text-slate-950">
                {tournament.registered_players} /{" "}
                {tournament.max_players}
              </p>

              <p className="text-sm text-slate-500">
                {remainingPlayers} spots remaining
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Users size={17} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Format
                </span>
              </div>

              <p className="mt-2 font-black text-slate-950">
                {tournamentMode === "solo"
                  ? "Solo"
                  : tournamentMode === "duo"
                    ? "Duo"
                    : "Squad"}
              </p>

              <p className="text-sm text-slate-500">
                {tournamentTeamSize} player
                {tournamentTeamSize !== 1 ? "s" : ""} per team
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Trophy size={17} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Prize Pool
                </span>
              </div>

              <p className="mt-2 font-black text-slate-950">
                {formatMoney(Number(tournament.prize_pool))}
              </p>

              <p className="text-sm text-slate-500">Total rewards</p>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Registration card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            {registrationConfirmed ? (
              <div>
                <div className="text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <CheckCircle2 size={42} />
                  </div>

                  <h2 className="mt-6 text-2xl font-black text-slate-950">
                    Registration Confirmed
                  </h2>

                  <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                    {message}
                  </p>

                  <div className="mt-7 rounded-2xl border border-green-200 bg-green-50 p-5">
                    <p className="text-xs font-black uppercase tracking-wider text-green-600">
                      You are officially registered
                    </p>

                    <p className="mt-2 font-black text-slate-950">
                      {tournament.title}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      Your tournament access will be available through
                      your account when provided by the admin.
                    </p>
                  </div>
                </div>

                {tournamentMode !== "solo" && (
                  <div className="mt-7 rounded-2xl border border-yellow-200 bg-yellow-50/50 p-5 text-left">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100">
                        <Users size={20} className="text-yellow-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-wide text-yellow-700">
                          {tournamentMode === "duo"
                            ? "Duo Team Management"
                            : "Squad Team Management"}
                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-600">
                          You have already paid for this team. If a teammate
                          declines, you can invite another player without
                          paying again.
                        </p>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                Captain
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                @{captainUsername.replace(/^@/, "")}
                              </p>
                            </div>

                            <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
                              <p className="text-lg font-black text-slate-950">
                                {Math.max(1, teamMemberCount)}
                                <span className="text-slate-400">
                                  /{tournamentTeamSize}
                                </span>
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Accepted
                              </p>
                            </div>
                          </div>

                          {pendingInviteCount > 0 && (
                            <div className="mt-4 space-y-2">
                              {pendingInvites.map((invite) => (
                                <div
                                  key={invite.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-3"
                                >
                                  <div className="min-w-0">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-yellow-700">
                                      Invitation pending
                                    </p>
                                    <p className="mt-0.5 truncate text-sm font-black text-slate-950">
                                      @{invite.username.replace(/^@/, "")}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      changeTournamentInvite(invite.id)
                                    }
                                    disabled={
                                      changingInviteId !== null ||
                                      sendingInvite
                                    }
                                    className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {changingInviteId === invite.id ? (
                                      <>
                                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                                        Changing...
                                      </>
                                    ) : (
                                      <>
                                        <X size={14} />
                                        Change Player
                                      </>
                                    )}
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {declinedInvites.length > 0 && (
                            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
                              <div className="flex items-start gap-3">
                                <X
                                  size={18}
                                  className="mt-0.5 shrink-0 text-red-500"
                                />
                                <div>
                                  <p className="text-sm font-black text-red-700">
                                    Teammate declined the invitation
                                  </p>
                                  {declinedInvites.map((invite) => (
                                    <p
                                      key={invite.id}
                                      className="mt-1 text-xs leading-5 text-red-600"
                                    >
                                      @{invite.username.replace(/^@/, "")}{" "}
                                      declined.
                                    </p>
                                  ))}
                                  <p className="mt-2 text-xs leading-5 text-red-600">
                                    Your payment and tournament registration
                                    remain active. Invite another player to
                                    complete your Duo.
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {teamSlotsRemaining > 0 &&
                            pendingInviteCount === 0 && (
                              <>
                                <label className="mt-5 block text-xs font-black uppercase tracking-wide text-slate-400">
                                  Add Teammate Directly
                                </label>

                                <div className="mt-2 flex flex-col gap-3">
                                  <div className="relative">
                                    <UserPlus
                                      size={17}
                                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                                    />
                                    <input
                                      type="text"
                                      value={inviteUsername}
                                      onChange={(e) =>
                                        setInviteUsername(e.target.value)
                                      }
                                      disabled={sendingInvite || registering}
                                      placeholder="Play & Win username (e.g. @player3)"
                                      className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                                    />
                                  </div>

                                  <input
                                    type="text"
                                    value={teammateGamingId}
                                    onChange={(e) =>
                                      setTeammateGamingId(e.target.value)
                                    }
                                    disabled={sendingInvite || registering}
                                    placeholder="Teammate's gaming ID"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                                  />

                                  <input
                                    type="text"
                                    value={teammateInGameName}
                                    onChange={(e) =>
                                      setTeammateInGameName(e.target.value)
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        sendTournamentInvite();
                                      }
                                    }}
                                    disabled={sendingInvite || registering}
                                    placeholder="Teammate's in-game name"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                                  />

                                  <button
                                    type="button"
                                    onClick={sendTournamentInvite}
                                    disabled={
                                      sendingInvite ||
                                      registering ||
                                      !inviteUsername.trim() ||
                                      !teammateGamingId.trim() ||
                                      !teammateInGameName.trim()
                                    }
                                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {sendingInvite ? (
                                      <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Adding Teammate...
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus size={17} />
                                        Add Teammate
                                      </>
                                    )}
                                  </button>
                                </div>
                              </>
                            )}

                          {teamSlotsRemaining === 0 &&
                            pendingInviteCount === 0 && (
                              <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-sm font-black text-green-700">
                                <CheckCircle2 size={17} /> Your team is
                                complete.
                              </div>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Link
                    href="/dashboard/my-tournaments"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
                  >
                    View My Tournament <ChevronRight size={17} />
                  </Link>
                  <Link
                    href="/dashboard/game-access"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                  >
                    Game Access
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-600">
                    Final Step
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-slate-950">
                    Confirm Your Registration
                  </h2>

                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
                    Review the tournament details below before confirming
                    your entry.
                  </p>
                </div>

                {/* Captain game details */}
                <div className="mt-7 rounded-2xl border border-yellow-200 bg-yellow-50/50 p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100">
                      <Trophy size={20} className="text-yellow-700" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-wide text-yellow-700">
                        {tournamentMode === "solo"
                          ? "Your Game Details"
                          : "Captain Game Details"}
                      </p>

                      <p className="mt-1 text-sm leading-6 text-slate-600">
                        Enter the {tournament.game} details you will use in
                        this tournament.
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                            Play & Win Username
                          </label>
                          <div className="rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">
                            {captainUsername
                              ? `@${captainUsername.replace(/^@/, "")}`
                              : "Loading..."}
                          </div>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Your account username
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                            {tournament.game} Gaming ID
                          </label>
                          <input
                            type="text"
                            value={captainGamingId}
                            onChange={(e) =>
                              setCaptainGamingId(e.target.value)
                            }
                            disabled={registering}
                            placeholder="Enter your Gaming ID"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                          />
                        </div>

                        <div>
                          <label className="mb-2 block text-xs font-black uppercase tracking-wide text-slate-400">
                            In-Game Name
                          </label>
                          <input
                            type="text"
                            value={captainInGameName}
                            onChange={(e) =>
                              setCaptainInGameName(e.target.value)
                            }
                            disabled={registering}
                            placeholder="Enter your in-game name"
                            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment summary */}
                <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-500">
                      Entry Fee
                    </span>

                    <span className="text-xl font-black text-slate-950">
                      {isPaid
                        ? formatMoney(Number(tournament.entry_fee))
                        : "FREE"}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                    <span className="text-sm font-semibold text-slate-500">
                      Prize Pool
                    </span>

                    <span className="font-black text-slate-950">
                      {formatMoney(Number(tournament.prize_pool))}
                    </span>
                  </div>
                </div>

                {/* Wallet */}
                {isPaid && (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100">
                          <Wallet size={20} className="text-slate-700" />
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                            Current Wallet
                          </p>

                          <p className="mt-1 text-lg font-black text-slate-950">
                            {walletBalance === null
                              ? "Loading..."
                              : formatMoney(walletBalance)}
                          </p>
                        </div>
                      </div>

                      <Link
                        href="/dashboard/wallet/deposit"
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-black text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                      >
                        Add Money
                      </Link>
                    </div>

                    {walletBalance !== null && !insufficientBalance && (
                      <div className="mt-5 rounded-xl bg-green-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-green-700">
                            Balance after registration
                          </span>

                          <span className="font-black text-green-700">
                            {formatMoney(afterBalance ?? 0)}
                          </span>
                        </div>
                      </div>
                    )}

                    {insufficientBalance && (
                      <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
                        <div className="flex gap-3">
                          <AlertCircle
                            size={20}
                            className="mt-0.5 shrink-0 text-red-500"
                          />

                          <div>
                            <p className="font-black text-red-700">
                              Insufficient wallet balance
                            </p>

                            <p className="mt-1 text-sm leading-5 text-red-600">
                              You need{" "}
                              {formatMoney(
                                Number(tournament.entry_fee) -
                                  (walletBalance ?? 0)
                              )}{" "}
                              more to register.
                            </p>

                            <Link
                              href="/dashboard/wallet/deposit"
                              className="mt-3 inline-flex items-center gap-1 text-sm font-black text-red-700 underline underline-offset-2"
                            >
                              Add money to wallet
                              <ChevronRight size={15} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {message && !registrationConfirmed && (
                  <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2
                        size={19}
                        className="mt-0.5 shrink-0 text-green-600"
                      />

                      <div>
                        <p className="text-sm font-black text-green-700">
                          {message}
                        </p>

                        <p className="mt-1 text-xs leading-5 text-green-600">
                          You can continue setting up your team and confirm
                          registration when ready.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* DIRECT TEAM REGISTRATION */}
                {tournamentMode !== "solo" && (
                  <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50/50 p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-yellow-100">
                        <Users size={20} className="text-yellow-700" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black uppercase tracking-wide text-yellow-700">
                          {tournamentMode === "duo"
                            ? "Duo Registration"
                            : "Squad Registration"}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          Add each teammate's Play & Win username, gaming ID,
                          and in-game name.
                        </p>

                        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                                Your Team
                              </p>
                              <p className="mt-1 font-black text-slate-950">
                                Captain
                              </p>
                              <p className="text-sm text-slate-500">You</p>
                            </div>

                            <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
                              <p className="text-lg font-black text-slate-950">
                                {playersCounter}
                                <span className="text-slate-400">
                                  /{tournamentTeamSize}
                                </span>
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                Players
                              </p>
                            </div>
                          </div>

                          {teamMemberCount >= tournamentTeamSize && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-3 text-sm font-black text-green-700">
                              <CheckCircle2 size={17} />
                              Team complete — ready to register
                            </div>
                          )}

                          {tournamentMode === "squad" && (
                            <div className="mt-5">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-black text-slate-950">
                                  Add Teammates (
                                  {Math.min(Math.max(teamMemberCount - 1, 0) + filledSquadSlots, tournamentTeamSize - 1)}/
                                  {tournamentTeamSize - 1})
                                </p>
                                <p className="text-xs font-semibold text-slate-500">
                                  {tournamentTeamSize - 1} teammates required
                                </p>
                              </div>

                              {addedTeammates.length > 0 && (
                                <div className="mt-3 space-y-2">
                                  {addedTeammates.map((mate, index) => (
                                    <div
                                      key={mate.id}
                                      className="flex items-center justify-between gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-3"
                                    >
                                      <div className="min-w-0">
                                        <p className="text-[10px] font-black uppercase tracking-wide text-green-700">
                                          Teammate {index + 1} added
                                        </p>
                                        <p className="mt-0.5 truncate text-sm font-black text-slate-950">
                                          @{mate.username.replace(/^@/, "")}
                                        </p>
                                      </div>
                                      <CheckCircle2
                                        size={18}
                                        className="shrink-0 text-green-600"
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {teamSlotsRemaining > 0 && (
                                <div className="mt-3 space-y-3">
                                  {Array.from(
                                    { length: teamSlotsRemaining },
                                    (_, i) => {
                                      const row = squadRows[i] ?? {
                                        username: "",
                                        gamingId: "",
                                        inGameName: "",
                                      };
                                      const slotNumber =
                                        Math.max(teamMemberCount - 1, 0) +
                                        i +
                                        1;

                                      return (
                                        <div
                                          key={i}
                                          className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                                        >
                                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Teammate {slotNumber}
                                          </p>

                                          <div className="mt-2 grid gap-2 sm:grid-cols-3">
                                            <input
                                              type="text"
                                              value={row.username}
                                              onChange={(e) =>
                                                updateSquadRow(
                                                  i,
                                                  "username",
                                                  e.target.value
                                                )
                                              }
                                              disabled={
                                                sendingInvite || registering
                                              }
                                              placeholder="Play & Win username"
                                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                                            />

                                            <input
                                              type="text"
                                              value={row.gamingId}
                                              onChange={(e) =>
                                                updateSquadRow(
                                                  i,
                                                  "gamingId",
                                                  e.target.value
                                                )
                                              }
                                              disabled={
                                                sendingInvite || registering
                                              }
                                              placeholder="Gaming ID"
                                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                                            />

                                            <input
                                              type="text"
                                              value={row.inGameName}
                                              onChange={(e) =>
                                                updateSquadRow(
                                                  i,
                                                  "inGameName",
                                                  e.target.value
                                                )
                                              }
                                              disabled={
                                                sendingInvite || registering
                                              }
                                              placeholder="In-game name"
                                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                                            />
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}

                                  <button
                                    type="button"
                                    onClick={addSquadTeammates}
                                    disabled={
                                      sendingInvite ||
                                      registering ||
                                      !squadRowsFilled
                                    }
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {sendingInvite ? (
                                      <>
                                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        Adding Teammates...
                                      </>
                                    ) : (
                                      <>
                                        <UserPlus size={17} />
                                        {teamSlotsRemaining === 1
                                          ? "Add Teammate"
                                          : `Add ${teamSlotsRemaining} Teammates`}
                                      </>
                                    )}
                                  </button>

                                  <div className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-900">
                                    <p className="font-black">Important</p>
                                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                                      <li>
                                        Make sure your teammates have Play &
                                        Win accounts.
                                      </li>
                                      <li>
                                        Enter correct gaming IDs and in-game
                                        names.
                                      </li>
                                      <li>
                                        You need {tournamentTeamSize - 1}{" "}
                                        teammates for Squad mode. The captain
                                        pays the team entry fee.
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {teamSlotsRemaining > 0 && tournamentMode === "duo" && (
                            <div className="mt-5 space-y-3">
                              <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                                Add Teammate
                              </p>

                              <input
                                type="text"
                                value={inviteUsername}
                                onChange={(e) =>
                                  setInviteUsername(e.target.value)
                                }
                                disabled={sendingInvite || registering}
                                placeholder="Play & Win username (e.g. @player3)"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                              />

                              <input
                                type="text"
                                value={teammateGamingId}
                                onChange={(e) =>
                                  setTeammateGamingId(e.target.value)
                                }
                                disabled={sendingInvite || registering}
                                placeholder="Teammate's gaming ID"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                              />

                              <input
                                type="text"
                                value={teammateInGameName}
                                onChange={(e) =>
                                  setTeammateInGameName(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    sendTournamentInvite();
                                  }
                                }}
                                disabled={sendingInvite || registering}
                                placeholder="Teammate's in-game name"
                                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:border-yellow-500 disabled:bg-slate-100"
                              />

                              <button
                                type="button"
                                onClick={sendTournamentInvite}
                                disabled={
                                  sendingInvite ||
                                  registering ||
                                  !inviteUsername.trim() ||
                                  !teammateGamingId.trim() ||
                                  !teammateInGameName.trim()
                                }
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {sendingInvite ? (
                                  <>
                                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                    Adding Teammate...
                                  </>
                                ) : (
                                  <>
                                    <UserPlus size={17} />
                                    Add Teammate
                                  </>
                                )}
                              </button>

                              <p className="text-xs leading-5 text-slate-500">
                                Add teammates directly. The captain pays the
                                team entry fee during registration. Game
                                Access appears when the admin releases it.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Free tournament */}
                {!isPaid && (
                  <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={22} className="text-green-600" />

                      <div>
                        <p className="font-black text-green-700">
                          Free Entry
                        </p>

                        <p className="mt-1 text-sm text-green-600">
                          No payment or wallet balance is required.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Closed */}
                {registrationClosed && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                    <div className="flex gap-3">
                      <AlertCircle
                        size={21}
                        className="mt-0.5 shrink-0 text-red-500"
                      />

                      <div>
                        <p className="font-black text-red-700">
                          {isFull
                            ? "Tournament Full"
                            : tournament.status === "live"
                              ? "Registration Closed"
                              : "Registration Unavailable"}
                        </p>

                        <p className="mt-1 text-sm leading-5 text-red-600">
                          {isFull
                            ? "All available player slots have already been filled."
                            : tournament.status === "live"
                              ? "This tournament has already started."
                              : "Registration is currently unavailable."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                    <div className="flex gap-3">
                      <AlertCircle
                        size={19}
                        className="mt-0.5 shrink-0 text-red-500"
                      />

                      <p className="text-sm font-semibold leading-5 text-red-700">
                        {error}
                      </p>
                    </div>
                  </div>
                )}

                {/* Register */}
                {!registrationClosed && (
                  <button
                    onClick={handleRegister}
                    disabled={!canRegister}
                    className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {registering ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing Registration...
                      </>
                    ) : isPaid ? (
                      <>
                        <CreditCard size={18} />
                        Pay {formatMoney(Number(tournament.entry_fee))} &
                        Confirm Registration
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={18} />
                        Register Free
                      </>
                    )}
                  </button>
                )}

                <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-slate-400">
                  <LockKeyhole size={14} />

                  <span>
                    {isPaid
                      ? "Your entry fee is processed securely through your Play & Win wallet."
                      : "Your registration is securely linked to your Play & Win account."}
                  </span>
                </div>
              </>
            )}
          </section>

          {/* Right summary */}
          <aside className="h-fit rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <ShieldCheck size={21} className="text-green-600" />

              <h2 className="text-lg font-black text-slate-950">
                Registration Summary
              </h2>
            </div>

            <div className="mt-6 divide-y divide-slate-100">
              <div className="py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  Tournament
                </p>

                <p className="mt-1 font-black text-slate-950">
                  {tournament.title}
                </p>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-500">Game</span>

                <span className="font-bold text-slate-950">
                  {tournament.game}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-500">Format</span>

                <span className="text-right font-bold text-slate-950">
                  {tournamentMode === "solo"
                    ? "Solo"
                    : tournamentMode === "duo"
                      ? "Duo"
                      : "Squad"}{" "}
                  ({tournamentTeamSize})
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-500">Entry Fee</span>

                <span className="font-black text-slate-950">
                  {isPaid
                    ? formatMoney(Number(tournament.entry_fee))
                    : "FREE"}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-500">Prize Pool</span>

                <span className="font-black text-slate-950">
                  {formatMoney(Number(tournament.prize_pool))}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-500">Players</span>

                <span className="font-bold text-slate-950">
                  {tournament.registered_players} /{" "}
                  {tournament.max_players}
                </span>
              </div>

              <div className="flex items-center justify-between gap-4 py-4">
                <span className="text-sm text-slate-500">Start Date</span>

                <span className="text-right font-bold text-slate-950">
                  {formatDate(tournament.start_date)}
                </span>
              </div>
            </div>

            {/* Security */}
            <div className="mt-5 rounded-2xl bg-slate-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <div>
                  <p className="text-sm font-black text-slate-950">
                    Secure Tournament Access
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Room ID and password are only shown to eligible
                    registered players through Game Access.
                  </p>
                </div>
              </div>
            </div>

            {/* What happens */}
            <div className="mt-5">
              <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                What happens next?
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                    1
                  </div>

                  <p className="text-sm leading-5 text-slate-600">
                    Your team is confirmed and registered securely.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                    2
                  </div>

                  <p className="text-sm leading-5 text-slate-600">
                    Your wallet transaction is recorded if the tournament is
                    paid.
                  </p>
                </div>

                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">
                    3
                  </div>

                  <p className="text-sm leading-5 text-slate-600">
                    Eligible game access becomes available through your
                    dashboard.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}