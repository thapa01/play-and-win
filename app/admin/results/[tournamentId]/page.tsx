"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Save,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tournament = {
  id: string;
  title: string;
  game: string;
  tournament_mode: string;
  team_size: number;
  entry_fee: number;
  prize_pool: number;
  registered_players: number;
  max_players: number;
  start_date: string;
  status: string;
};

type Player = {
  user_id: string;
  username: string;
  full_name: string | null;
  team_id: string | null;
};

type BattleResult = {
  placement: string;
  kills: string;
  prize: string;
};

type FootballResult = {
  result: "win" | "draw" | "loss" | "";
  goalsFor: string;
  goalsAgainst: string;
  prize: string;
};

type SavedResult = {
  user_id: string;
  placement: number;
  kills: number;
  prize_amount: number;
};

function normalizeGame(game: string) {
  return game.trim().toUpperCase().replace(/[\s-]/g, "");
}

function formatMoney(value: number) {
  return `NPR ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getBattlePoints(placement: string, kills: string) {
  const place = Number(placement || 0);
  const killCount = Number(kills || 0);

  let placementPoints = 0;

  if (place === 1) placementPoints = 10;
  else if (place === 2) placementPoints = 6;
  else if (place >= 3 && place <= 5) placementPoints = 5;

  return placementPoints + Math.max(killCount, 0);
}

function getFootballPoints(result: FootballResult) {
  if (result.result === "win") return 3;
  if (result.result === "draw") return 1;
  return 0;
}

export default function TournamentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const tournamentId = params.tournamentId as string;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [battleResults, setBattleResults] = useState<
    Record<string, BattleResult>
  >({});
  const [footballResults, setFootballResults] = useState<
    Record<string, FootballResult>
  >({});
  const [loading, setLoading] = useState(true);
  const [savingResults, setSavingResults] = useState(false);
  const [awardingPrize, setAwardingPrize] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedWinner, setSelectedWinner] = useState("");
  const [prizeAmount, setPrizeAmount] = useState("");
  const [selectedPlacement, setSelectedPlacement] = useState("");

  const isEfootball = useMemo(
    () => normalizeGame(tournament?.game || "") === "EFOOTBALL",
    [tournament?.game]
  );

  useEffect(() => {
    if (tournamentId) loadTournament();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  async function loadTournament() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { data: tournamentData, error: tournamentError } =
        await supabase
          .from("tournaments")
          .select(
            `
              id,
              title,
              game,
              tournament_mode,
              team_size,
              entry_fee,
              prize_pool,
              registered_players,
              max_players,
              start_date,
              status
            `
          )
          .eq("id", tournamentId)
          .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData as Tournament);

      const { data: registrationData, error: registrationError } =
        await supabase
          .from("tournament_registrations")
          .select("user_id, team_id")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: true });

      if (registrationError) throw registrationError;

      if (!registrationData || registrationData.length === 0) {
        setPlayers([]);
        setBattleResults({});
        setFootballResults({});
        return;
      }

      const userIds = registrationData.map((item) => item.user_id);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", userIds);

      if (profileError) throw profileError;

      const profileMap = new Map(
        (profileData || []).map((profile) => [profile.id, profile])
      );

      const formattedPlayers: Player[] = registrationData.map(
        (registration) => {
          const profile = profileMap.get(registration.user_id);

          return {
            user_id: registration.user_id,
            username: profile?.username || "Unknown Player",
            full_name: profile?.full_name || null,
            team_id: registration.team_id || null,
          };
        }
      );

      setPlayers(formattedPlayers);

      const initialBattleResults: Record<string, BattleResult> = {};
      const initialFootballResults: Record<string, FootballResult> = {};

      formattedPlayers.forEach((player) => {
        initialBattleResults[player.user_id] = {
          placement: "",
          kills: "",
          prize: "",
        };

        initialFootballResults[player.user_id] = {
          result: "",
          goalsFor: "",
          goalsAgainst: "",
          prize: "",
        };
      });

      const { data: existingResults, error: existingResultsError } =
        await supabase
          .from("tournament_player_results")
          .select("user_id, placement, kills, prize_amount")
          .eq("tournament_id", tournamentId);

      if (existingResultsError) {
        console.warn("Existing result load warning:", existingResultsError);
      }

      (existingResults || []).forEach((result: SavedResult) => {
        initialBattleResults[result.user_id] = {
          placement: String(result.placement ?? ""),
          kills: String(result.kills ?? ""),
          prize: String(result.prize_amount ?? ""),
        };
      });

      setBattleResults(initialBattleResults);
      setFootballResults(initialFootballResults);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load tournament"
      );
    } finally {
      setLoading(false);
    }
  }

  function updateBattleResult(
    userId: string,
    field: keyof BattleResult,
    value: string
  ) {
    setBattleResults((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  }

  function updateFootballResult(
    userId: string,
    field: keyof FootballResult,
    value: string
  ) {
    setFootballResults((current) => ({
      ...current,
      [userId]: {
        ...current[userId],
        [field]: value,
      },
    }));
  }

  async function handleSaveBattleResults() {
    if (!tournament) return;

    setError("");
    setMessage("");

    const selected = players.filter((player) => {
      const result = battleResults[player.user_id];
      return result?.placement || result?.kills || result?.prize;
    });

    if (selected.length === 0) {
      setError("Please enter at least one player result.");
      return;
    }

    const placements = selected
      .map((player) => Number(battleResults[player.user_id]?.placement || 0))
      .filter((value) => value > 0);

    if (placements.length !== selected.length) {
      setError("Every selected player must have a valid placement.");
      return;
    }

    const duplicatePlacements = placements.filter(
      (value, index) => placements.indexOf(value) !== index
    );

    if (duplicatePlacements.length > 0 && tournament.tournament_mode === "solo") {
      setError("Solo tournament placements cannot be duplicated.");
      return;
    }

    for (const player of selected) {
      const result = battleResults[player.user_id];
      const kills = Number(result.kills || 0);
      const prize = Number(result.prize || 0);

      if (!Number.isFinite(kills) || kills < 0) {
        setError(`Enter a valid kills value for @${player.username}.`);
        return;
      }

      if (!Number.isFinite(prize) || prize < 0) {
        setError(`Enter a valid prize amount for @${player.username}.`);
        return;
      }
    }

    const totalPrize = selected.reduce(
      (sum, player) => sum + Number(battleResults[player.user_id]?.prize || 0),
      0
    );

    if (totalPrize > Number(tournament.prize_pool)) {
      setError(
        `Player result prizes cannot exceed the tournament prize pool of ${formatMoney(
          Number(tournament.prize_pool)
        )}.`
      );
      return;
    }

    setSavingResults(true);

    try {
      for (const player of selected) {
        const result = battleResults[player.user_id];

        const { error: saveError } = await supabase.rpc(
          "admin_save_tournament_player_result",
          {
            target_tournament_id: tournament.id,
            target_user_id: player.user_id,
            target_placement: Number(result.placement),
            target_kills: Number(result.kills || 0),
            target_prize_amount: Number(result.prize || 0),
          }
        );

        if (saveError) throw saveError;
      }

      await loadTournament();
      setMessage("Tournament results saved successfully.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Unable to save tournament results."
      );
    } finally {
      setSavingResults(false);
    }
  }

  async function handleAwardPrize() {
    if (!tournament) return;

    setError("");
    setMessage("");

    const amount = Number(prizeAmount);

    if (!selectedWinner) {
      setError("Please select a player first.");
      return;
    }
    if (!selectedPlacement) {
      setError("Please enter the player's final position.");
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Please enter a valid prize amount.");
      return;
    }

    if (amount > Number(tournament.prize_pool)) {
      setError("Prize amount cannot exceed the tournament prize pool.");
      return;
    }

    const winner = players.find((player) => player.user_id === selectedWinner);

    const confirmed = window.confirm(
      `Credit ${formatMoney(amount)} to ${winner?.full_name || winner?.username || "the selected player"}?\n\nThis action should only be confirmed after you have verified the tournament result.`
    );

    if (!confirmed) return;

    setAwardingPrize(true);

    try {
      // Check first so an already-completed prize gets a clear message
      // instead of relying on the database duplicate-key error.
      const { data: existingPrize, error: existingPrizeError } =
        await supabase
          .from("wallet_transactions")
          .select("id, amount, status, created_at")
          .eq("user_id", selectedWinner)
          .eq("reference_id", tournament.id)
          .eq("type", "prize")
          .eq("status", "completed")
          .maybeSingle();

      if (existingPrizeError) throw existingPrizeError;

      if (existingPrize) {
        setError(
          "Prize already credited to this player for this tournament."
        );
        return;
      }

      const { error: awardError } = await supabase.rpc(
        "admin_credit_tournament_prize",
        {
          target_tournament_id: tournament.id,
          target_user_id: selectedWinner,
          target_placement: Number(selectedPlacement),
          target_amount: amount,
        }
      );

      if (awardError) throw awardError;

      setMessage(
        `${formatMoney(amount)} was credited to @${winner?.username || "player"}.`
      );
      setPrizeAmount("");
      setSelectedWinner("");
      setSelectedPlacement("");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to credit the tournament prize."
      );
    } finally {
      setAwardingPrize(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <Loader2 className="mx-auto animate-spin text-yellow-600" size={30} />
            <p className="mt-4 font-bold text-slate-500">Loading tournament...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error && !tournament) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <button
            onClick={() => router.push("/admin/results")}
            className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
          >
            <ArrowLeft size={16} />
            Back to Results
          </button>

          <div className="rounded-3xl border border-red-200 bg-white p-10 shadow-sm">
            <AlertCircle className="text-red-500" size={32} />
            <h1 className="mt-4 text-xl font-black text-red-600">
              Failed to load tournament
            </h1>
            <p className="mt-3 text-sm text-slate-500">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!tournament) return null;

  const selectedWinnerPlayer = players.find(
    (player) => player.user_id === selectedWinner
  );

  const battleTotalPrize = players.reduce(
    (sum, player) => sum + Number(battleResults[player.user_id]?.prize || 0),
    0
  );

  const remainingPrize = Math.max(
    Number(tournament.prize_pool) - battleTotalPrize,
    0
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={() => router.push("/admin/results")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to Results
        </button>

        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={19} />
            <p className="text-sm font-bold">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle className="mt-0.5 shrink-0 text-red-600" size={19} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        {/* Tournament Header */}
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-600">
                Admin Results
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                {tournament.title}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Enter, review and save the official tournament results.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-950 px-5 py-4 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Game
              </p>
              <p className="mt-1 text-lg font-black">{tournament.game}</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-5">
            <Stat label="Mode" value={tournament.tournament_mode} />
            <Stat label="Team Size" value={String(tournament.team_size)} />
            <Stat
              label="Players"
              value={`${players.length} / ${tournament.max_players}`}
            />
            <Stat label="Prize Pool" value={formatMoney(Number(tournament.prize_pool))} />
            <Stat label="Status" value={tournament.status} />
          </div>
        </section>

        {/* Point System */}
        {!isEfootball ? (
          <section className="mt-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-white p-2.5 text-yellow-600 shadow-sm">
                <Trophy size={20} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-700">
                  {tournament.game} Point System
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  Placement + Kill Points
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <PointCard title="1st Place" value="10 pts" />
              <PointCard title="2nd Place" value="6 pts" />
              <PointCard title="3rd–5th" value="5 pts" />
              <PointCard title="Each Kill" value="+1 pt" />
            </div>

            <p className="mt-4 text-sm font-medium leading-6 text-yellow-900">
              Placement points are awarded to every player on the team. Kill points
              are awarded only to the player who made the kill.
            </p>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-yellow-700">
              eFootball Point System
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <PointCard title="Win" value="3 pts" />
              <PointCard title="Draw" value="1 pt" />
              <PointCard title="Loss" value="0 pts" />
            </div>
            <p className="mt-4 text-sm font-medium leading-6 text-yellow-900">
              eFootball uses the football-style match scoring shown above. Goals for
              and goals against are recorded for the match entry.
            </p>
          </section>
        )}

        {/* Game Results */}
        {isEfootball ? (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-600">
                  eFootball Results
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Match Results
                </h2>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
                {players.length} Players
              </div>
            </div>

            {players.length === 0 ? (
              <EmptyPlayers />
            ) : (
              <div className="mt-6 space-y-4">
                {players.map((player, index) => {
                  const result = footballResults[player.user_id] || {
                    result: "",
                    goalsFor: "",
                    goalsAgainst: "",
                    prize: "",
                  };

                  return (
                    <div
                      key={player.user_id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <PlayerIdentity player={player} index={index} />

                        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-4 xl:max-w-[720px]">
                          <Field label="Result">
                            <select
                              value={result.result}
                              onChange={(e) =>
                                updateFootballResult(
                                  player.user_id,
                                  "result",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                            >
                              <option value="">Select</option>
                              <option value="win">Win</option>
                              <option value="draw">Draw</option>
                              <option value="loss">Loss</option>
                            </select>
                          </Field>

                          <Field label="Goals For">
                            <input
                              type="number"
                              min="0"
                              value={result.goalsFor}
                              onChange={(e) =>
                                updateFootballResult(
                                  player.user_id,
                                  "goalsFor",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                              placeholder="0"
                            />
                          </Field>

                          <Field label="Goals Against">
                            <input
                              type="number"
                              min="0"
                              value={result.goalsAgainst}
                              onChange={(e) =>
                                updateFootballResult(
                                  player.user_id,
                                  "goalsAgainst",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                              placeholder="0"
                            />
                          </Field>

                          <Field label="Prize">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={result.prize}
                              onChange={(e) =>
                                updateFootballResult(
                                  player.user_id,
                                  "prize",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                              placeholder="NPR 0"
                            />
                          </Field>
                        </div>

                        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-white xl:min-w-[110px]">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Points
                          </p>
                          <p className="mt-1 text-2xl font-black">
                            {getFootballPoints(result)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={19} />
              <div>
                <p className="text-sm font-bold text-blue-900">
                  eFootball match data is currently UI-only
                </p>
                <p className="mt-1 text-xs leading-5 text-blue-700">
                  The current tournament result database stores placement, kills and
                  prize amount. It does not yet have dedicated eFootball goal/result
                  columns, so this section keeps the existing eFootball UI without
                  writing incompatible data into the leaderboard table.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-yellow-600">
                  Tournament Results
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">
                  Player Results
                </h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">
                <Users size={16} />
                {players.length} Players
              </div>
            </div>

            {players.length === 0 ? (
              <EmptyPlayers />
            ) : (
              <div className="mt-6 space-y-4">
                {players.map((player, index) => {
                  const result = battleResults[player.user_id] || {
                    placement: "",
                    kills: "",
                    prize: "",
                  };

                  const points = getBattlePoints(
                    result.placement,
                    result.kills
                  );

                  return (
                    <div
                      key={player.user_id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                        <PlayerIdentity player={player} index={index} />

                        <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 xl:max-w-[620px]">
                          <Field label="Placement">
                            <input
                              type="number"
                              min="1"
                              value={result.placement}
                              onChange={(e) =>
                                updateBattleResult(
                                  player.user_id,
                                  "placement",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                              placeholder="1"
                            />
                          </Field>

                          <Field label="Kills">
                            <input
                              type="number"
                              min="0"
                              value={result.kills}
                              onChange={(e) =>
                                updateBattleResult(
                                  player.user_id,
                                  "kills",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                              placeholder="0"
                            />
                          </Field>

                          <Field label="Prize">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={result.prize}
                              onChange={(e) =>
                                updateBattleResult(
                                  player.user_id,
                                  "prize",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                              placeholder="NPR 0"
                            />
                          </Field>
                        </div>

                        <div className="rounded-2xl bg-slate-950 px-5 py-4 text-center text-white xl:min-w-[120px]">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            Total Points
                          </p>
                          <p className="mt-1 text-2xl font-black">{points}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Result Prize Allocation
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Assigned: <span className="font-black text-slate-900">{formatMoney(battleTotalPrize)}</span>
                  <span className="mx-2">•</span>
                  Remaining: <span className="font-black text-emerald-700">{formatMoney(remainingPrize)}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={handleSaveBattleResults}
                disabled={savingResults || players.length === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-yellow-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingResults ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Save size={17} />
                )}
                {savingResults ? "Saving Results..." : "Save Tournament Results"}
              </button>
            </div>
          </section>
        )}

        {/* Prize Distribution */}
        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-yellow-50 p-2.5 text-yellow-600">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-600">
                Prize Distribution
              </p>
              <h2 className="mt-1 text-2xl font-black text-slate-950">
                Distribute Tournament Prize
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Select a registered player and enter the prize amount. After confirmation,
                the secure admin wallet function will credit the player's Play & Win wallet.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            

            <Field label="Winner">
              <select
                value={selectedWinner}
                onChange={(e) => setSelectedWinner(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              >
                <option value="">Select winner</option>
                {players.map((player) => (
                  <option key={player.user_id} value={player.user_id}>
                    {player.full_name || player.username} (@{player.username})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Prize Amount">
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="NPR 0"
                value={prizeAmount}
                onChange={(e) => setPrizeAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-950 outline-none transition focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
              />
            </Field>
          </div>

          <div className="mt-6 rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Prize Summary
            </p>
            <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-black text-slate-950">
                  {selectedWinnerPlayer
                    ? selectedWinnerPlayer.full_name || selectedWinnerPlayer.username
                    : "No winner selected"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedWinnerPlayer
                    ? `@${selectedWinnerPlayer.username}`
                    : "Select a registered player above."}
                </p>
              </div>
              <p className="text-3xl font-black text-slate-950">
                {formatMoney(Number(prizeAmount || 0))}
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 p-4">
            <ShieldCheck className="mt-0.5 shrink-0 text-orange-600" size={19} />
            <div>
              <p className="text-sm font-bold text-orange-900">
                Verify before confirming
              </p>
              <p className="mt-1 text-xs leading-5 text-orange-700">
                Prize credit is a wallet-changing action. Confirm the correct player,
                amount and tournament before proceeding.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAwardPrize}
            disabled={awardingPrize || !selectedWinner || !prizeAmount}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-yellow-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {awardingPrize ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <Wallet size={17} />
            )}
            {awardingPrize ? "Crediting Prize..." : "Confirm & Credit Prize"}
          </button>
        </section>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <ShieldCheck className="mt-0.5 shrink-0 text-blue-600" size={19} />
          <div>
            <p className="text-sm font-bold text-blue-900">Admin-only result entry</p>
            <p className="mt-1 text-xs leading-5 text-blue-700">
              Result writes use the secure admin RPC. The point trigger in Supabase
              calculates placement and kill points automatically when results are saved.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 truncate font-black capitalize text-slate-950">{value}</p>
    </div>
  );
}

function PointCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-400">{title}</p>
      <p className="mt-1 text-xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function PlayerIdentity({ player, index }: { player: Player; index: number }) {
  return (
    <div className="flex items-center gap-4 xl:min-w-[250px]">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-sm font-black text-white">
        {index + 1}
      </div>
      <div className="min-w-0">
        <p className="truncate font-black text-slate-950">
          {player.full_name || player.username}
        </p>
        <p className="truncate text-sm text-slate-500">@{player.username}</p>
        {player.team_id && (
          <p className="mt-0.5 text-[11px] font-bold uppercase tracking-wide text-yellow-600">
            Team registered
          </p>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-black uppercase tracking-wide text-slate-400">
        {label}
      </label>
      {children}
    </div>
  );
}

function EmptyPlayers() {
  return (
    <div className="mt-6 rounded-2xl bg-slate-50 p-8 text-center">
      <Users className="mx-auto text-slate-300" size={32} />
      <p className="mt-3 font-bold text-slate-500">No registered players found.</p>
    </div>
  );
}
