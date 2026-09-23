"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  X,
  Trophy,
} from "lucide-react";
import Link from "next/link";

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
  image: string | null;
  tournament_mode: "solo" | "duo" | "squad";
  team_size: number;
};

type RegisteredPlayer = {
  user_id: string;
  full_name: string;
  username: string;
};

type FormData = {
  title: string;
  game: string;
  description: string;
  tournament_type: "free" | "paid";
  entry_fee: string;
  prize_pool: string;
  max_players: string;
  tournament_mode: "solo" | "duo" | "squad";
  team_size: string;
  start_date: string;
  status: "upcoming" | "live" | "completed" | "cancelled";
  image: string;
};

type ResultRow = {
  userId: string;
  prize: string;
};

const emptyForm: FormData = {
  title: "",
  game: "PUBG",
  description: "",
  tournament_type: "paid",
  entry_fee: "500",
  prize_pool: "15000",
  max_players: "100",
  tournament_mode: "solo",
  team_size: "1",
  start_date: "",
  status: "upcoming",
  image: "",
};

const emptyResults: ResultRow[] = [
  {
    userId: "",
    prize: "",
  },
  {
    userId: "",
    prize: "",
  },
  {
    userId: "",
    prize: "",
  },
];

export default function AdminTournamentsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>(emptyForm);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Result modal
  const [showPrizeModal, setShowPrizeModal] = useState(false);
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);

  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [results, setResults] =
    useState<ResultRow[]>(emptyResults);

  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [savingResults, setSavingResults] = useState(false);

  async function loadTournaments() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setTournaments((data || []) as Tournament[]);
    }

    setLoading(false);
  }

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

  function openCreateForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setShowForm(true);
  }

  function openEditForm(tournament: Tournament) {
    setEditingId(tournament.id);

    const localDate = new Date(tournament.start_date);

    const formattedDate = new Date(
      localDate.getTime() -
        localDate.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);

    setForm({
      title: tournament.title,
      game: tournament.game,
      description: tournament.description || "",
      tournament_type: tournament.tournament_type,
      entry_fee: String(tournament.entry_fee),
      prize_pool: String(tournament.prize_pool),
      max_players: String(tournament.max_players),
      tournament_mode: tournament.tournament_mode || "solo",
      team_size: String(tournament.team_size || 1),
      start_date: formattedDate,
      status: tournament.status,
      image: tournament.image || "",
    });

    setMessage("");
    setError("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    if (!form.title.trim()) {
      setError("Tournament title is required.");
      setSaving(false);
      return;
    }

    if (!form.start_date) {
      setError("Tournament date and time are required.");
      setSaving(false);
      return;
    }

    const entryFee =
      form.tournament_type === "free"
        ? 0
        : Number(form.entry_fee);

    const prizePool = Number(form.prize_pool);
    const maxPlayers = Number(form.max_players);

    if (entryFee < 0) {
      setError("Entry fee cannot be negative.");
      setSaving(false);
      return;
    }

    if (prizePool < 0) {
      setError("Prize pool cannot be negative.");
      setSaving(false);
      return;
    }

    if (!Number.isInteger(maxPlayers) || maxPlayers < 1) {
      setError("Maximum players must be at least 1.");
      setSaving(false);
      return;
    }

    const selectedMode = form.tournament_mode;
    const teamSize = Number(form.team_size);

    if (selectedMode === "solo" && teamSize !== 1) {
      setError("Solo tournaments must have a team size of 1.");
      setSaving(false);
      return;
    }

    if (selectedMode === "duo" && teamSize !== 2) {
      setError("Duo tournaments must have a team size of 2.");
      setSaving(false);
      return;
    }

    if (
      selectedMode === "squad" &&
      (!Number.isInteger(teamSize) || teamSize < 2 || teamSize > 10)
    ) {
      setError("Squad team size must be between 2 and 10.");
      setSaving(false);
      return;
    }

    if (maxPlayers < teamSize) {
      setError("Maximum players cannot be smaller than the team size.");
      setSaving(false);
      return;
    }

    const tournamentData = {
      title: form.title.trim(),
      game: form.game,
      description: form.description.trim() || null,
      tournament_type: form.tournament_type,
      entry_fee: entryFee,
      prize_pool: prizePool,
      max_players: maxPlayers,
      tournament_mode: selectedMode,
      team_size: teamSize,
      start_date: new Date(form.start_date).toISOString(),
      status: form.status,
      image: form.image.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("tournaments")
        .update(tournamentData)
        .eq("id", editingId);

      if (error) {
        setError(error.message);
      } else {
        setMessage("Tournament updated successfully.");
        closeForm();
        await loadTournaments();
      }
    } else {
      const { error } = await supabase
        .from("tournaments")
        .insert(tournamentData);

      if (error) {
        setError(error.message);
      } else {
        setMessage("Tournament created successfully.");
        closeForm();
        await loadTournaments();
      }
    }

    setSaving(false);
  }

  async function handleDelete(
    id: string,
    title: string
  ) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${title}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Tournament deleted successfully.");
      await loadTournaments();
    }
  }

  async function handleCancel(
    tournament: Tournament
  ) {
    const confirmed = window.confirm(
      `Cancel "${tournament.title}"?`
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .update({
        status: "cancelled",
      })
      .eq("id", tournament.id);

    if (error) {
      setError(error.message);
    } else {
      setMessage("Tournament cancelled.");
      await loadTournaments();
    }
  }

  // --------------------------------------------------
  // RESULT MODAL
  // --------------------------------------------------

  async function openPrizeModal(
    tournament: Tournament
  ) {
    setSelectedTournament(tournament);

    setResults(
      emptyResults.map((row) => ({
        ...row,
      }))
    );

    setPlayers([]);

    setMessage("");
    setError("");

    setShowPrizeModal(true);
    setLoadingPlayers(true);

    const { data, error } = await supabase.rpc(
      "get_tournament_registered_players",
      {
        target_tournament_id: tournament.id,
      }
    );

    if (error) {
      setError(error.message);
      setLoadingPlayers(false);
      return;
    }

    setPlayers(
      (data || []) as RegisteredPlayer[]
    );

    setLoadingPlayers(false);
  }

  function closePrizeModal() {
    if (savingResults) return;

    setShowPrizeModal(false);
    setSelectedTournament(null);
    setPlayers([]);

    setResults(
      emptyResults.map((row) => ({
        ...row,
      }))
    );
  }

  function updateResult(
    index: number,
    field: keyof ResultRow,
    value: string
  ) {
    setResults((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  }

  function getAvailablePlayers(
    currentIndex: number
  ) {
    const selectedByOtherRows = results
      .map((result, index) =>
        index !== currentIndex
          ? result.userId
          : ""
      )
      .filter(Boolean);

    return players.filter(
      (player) =>
        !selectedByOtherRows.includes(
          player.user_id
        )
    );
  }

  function getTotalPrize() {
    return results.reduce((total, result) => {
      if (!result.userId) return total;

      const prize = Number(result.prize);

      if (Number.isNaN(prize)) return total;

      return total + prize;
    }, 0);
  }

  async function handleSaveResults() {
    if (!selectedTournament) return;

    setError("");
    setMessage("");

    // ----------------------------------------------
    // At least one winner
    // ----------------------------------------------

    const selectedResults = results.filter(
      (result) => result.userId
    );

    if (selectedResults.length === 0) {
      setError(
        "Please select at least one winner."
      );
      return;
    }

    // ----------------------------------------------
    // Check duplicate players
    // ----------------------------------------------

    const selectedPlayerIds = selectedResults.map(
      (result) => result.userId
    );

    const uniquePlayerIds = new Set(
      selectedPlayerIds
    );

    if (
      uniquePlayerIds.size !==
      selectedPlayerIds.length
    ) {
      setError(
        "The same player cannot be selected more than once."
      );
      return;
    }

    // ----------------------------------------------
    // Validate selected rows
    // ----------------------------------------------

    for (let index = 0; index < results.length; index++) {
      const result = results[index];

      // Empty position = ignore completely
      if (!result.userId) {
        continue;
      }

      const prize =
        result.prize === ""
          ? NaN
          : Number(result.prize);

      if (
        !Number.isFinite(prize) ||
        prize <= 0
      ) {
        setError(
          `Enter a valid prize amount for ${index + 1}${getOrdinal(index + 1)} position.`
        );
        return;
      }
    }

    // ----------------------------------------------
    // Total prize pool check
    // ----------------------------------------------

    const totalPrize = getTotalPrize();

    if (
      totalPrize >
      Number(selectedTournament.prize_pool)
    ) {
      setError(
        `Total prizes cannot exceed the tournament prize pool of NPR ${Number(
          selectedTournament.prize_pool
        ).toLocaleString()}.`
      );
      return;
    }

    // ----------------------------------------------
    // Confirmation
    // ----------------------------------------------

    const winnerSummary = results
      .map((result, index) => {
        if (!result.userId) return null;

        const player = players.find(
          (p) => p.user_id === result.userId
        );

        return `${index + 1}${getOrdinal(
          index + 1
        )}: ${
          player?.full_name ||
          player?.username ||
          "Player"
        } — NPR ${Number(
          result.prize
        ).toLocaleString()}`;
      })
      .filter(Boolean)
      .join("\n");

    const confirmed = window.confirm(
      `Save tournament results?\n\n${winnerSummary}\n\nTotal prize: NPR ${totalPrize.toLocaleString()}\n\nPrize payments are permanent. Please verify everything carefully.`
    );

    if (!confirmed) return;

    // ----------------------------------------------
    // Save
    // ----------------------------------------------

    setSavingResults(true);

    const first = results[0];
    const second = results[1];
    const third = results[2];

    const { error } = await supabase.rpc(
      "save_top_three_results",
      {
        target_tournament_id:
          selectedTournament.id,

        first_user_id:
          first.userId || null,
        first_kills: 0,
        first_points: 0,
        first_prize:
          first.userId && first.prize !== ""
            ? Number(first.prize)
            : 0,

        second_user_id:
          second.userId || null,
        second_kills: 0,
        second_points: 0,
        second_prize:
          second.userId && second.prize !== ""
            ? Number(second.prize)
            : 0,

        third_user_id:
          third.userId || null,
        third_kills: 0,
        third_points: 0,
        third_prize:
          third.userId && third.prize !== ""
            ? Number(third.prize)
            : 0,
      }
    );

    if (error) {
      setError(error.message);
      setSavingResults(false);
      return;
    }

    setMessage(
      `${selectedResults.length} winner${
        selectedResults.length > 1 ? "s" : ""
      } saved successfully.`
    );

    setSavingResults(false);
    closePrizeModal();
  }

  function getOrdinal(position: number) {
    if (position === 1) return "st";
    if (position === 2) return "nd";
    if (position === 3) return "rd";
    return "th";
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString(
      "en-IN",
      {
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <Link
              href="/admin"
              className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft size={16} />
              Back to Admin Dashboard
            </Link>

            <h1 className="text-3xl font-black text-slate-950">
              Tournament Management
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create and manage your gaming tournaments.
            </p>
          </div>

          <button
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-500 hover:text-slate-950"
          >
            <Plus size={18} />
            Create Tournament
          </button>
        </div>

        {/* MESSAGES */}
        {message && (
          <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
            {message}
          </div>
        )}

        {error && !showPrizeModal && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* TOURNAMENT LIST */}
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading tournaments...
          </div>
        ) : tournaments.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-xl font-bold text-slate-900">
              No tournaments yet
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Create your first tournament.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {tournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                  {/* INFO */}
                  <div className="flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-700">
                        {tournament.game}
                      </span>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
                        {(tournament.tournament_mode || "solo").toUpperCase()}
                        {tournament.tournament_mode === "squad"
                          ? ` • ${tournament.team_size}-PLAYER`
                          : ""}
                      </span>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          tournament.status ===
                          "upcoming"
                            ? "bg-blue-100 text-blue-700"
                            : tournament.status ===
                              "live"
                            ? "bg-green-100 text-green-700"
                            : tournament.status ===
                              "completed"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {tournament.status.toUpperCase()}
                      </span>
                    </div>

                    <h2 className="text-xl font-black text-slate-950">
                      {tournament.title}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {tournament.description ||
                        "No description added."}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-400">
                          Entry Fee
                        </p>

                        <p className="font-bold text-slate-900">
                          {tournament.entry_fee ===
                          0
                            ? "FREE"
                            : `NPR ${tournament.entry_fee}`}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Prize Pool
                        </p>

                        <p className="font-bold text-slate-900">
                          NPR{" "}
                          {Number(
                            tournament.prize_pool
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Players
                        </p>

                        <p className="font-bold text-slate-900">
                          {
                            tournament.registered_players
                          }
                          /
                          {tournament.max_players}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Start
                        </p>

                        <p className="font-bold text-slate-900">
                          {formatDate(
                            tournament.start_date
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ACTIONS */}
                  <div className="flex flex-wrap gap-2 lg:w-52 lg:flex-col">
                    <button
                      onClick={() =>
                        openEditForm(tournament)
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 lg:flex-none"
                    >
                      <Edit size={16} />
                      Edit
                    </button>

                    {tournament.status !==
                      "cancelled" &&
                      tournament.status !==
                        "completed" && (
                        <button
                          onClick={() =>
                            handleCancel(
                              tournament
                            )
                          }
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-orange-200 px-4 py-2.5 text-sm font-bold text-orange-600 transition hover:bg-orange-50 lg:flex-none"
                        >
                          Cancel
                        </button>
                      )}

                    <button
                      onClick={() =>
                        handleDelete(
                          tournament.id,
                          tournament.title
                        )
                      }
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50 lg:flex-none"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>

                    {tournament.status ===
                      "completed" && (
                      <button
                        onClick={() =>
                          openPrizeModal(
                            tournament
                          )
                        }
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-yellow-200 px-4 py-2.5 text-sm font-bold text-yellow-700 transition hover:bg-yellow-50 lg:flex-none"
                      >
                        <Trophy size={16} />
                        Results & Prize
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CREATE / EDIT MODAL */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

              {/* HEADER */}
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    {editingId
                      ? "Edit Tournament"
                      : "Create Tournament"}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Enter tournament details below.
                  </p>
                </div>

                <button
                  onClick={closeForm}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950"
                >
                  <X size={20} />
                </button>
              </div>

              {/* FORM */}
              <form
                onSubmit={handleSubmit}
                className="space-y-5 p-6"
              >
                {/* TITLE */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Tournament Name
                  </label>

                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        title: e.target.value,
                      })
                    }
                    placeholder="e.g. Battle Zone Cup"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>

                {/* GAME */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Game
                  </label>

                  <select
                    value={form.game}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        game: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="PUBG">
                      PUBG
                    </option>

                    <option value="FREE FIRE">
                      FREE FIRE
                    </option>

                    <option value="eFOOTBALL">
                      eFOOTBALL
                    </option>

                    <option value="MOBILE LEGENDS">
                      MOBILE LEGENDS
                    </option>

                    <option value="LUDO">
                      LUDO
                    </option>
                  </select>
                </div>

                {/* DESCRIPTION */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description:
                          e.target.value,
                      })
                    }
                    placeholder="Tournament description..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>

                {/* TYPE */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Tournament Type
                  </label>

                  <select
                    value={form.tournament_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tournament_type:
                          e.target.value as
                            | "free"
                            | "paid",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="paid">
                      Paid
                    </option>

                    <option value="free">
                      Free
                    </option>
                  </select>
                </div>

                {/* FEE + PRIZE */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Entry Fee (NPR)
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.entry_fee}
                      disabled={
                        form.tournament_type ===
                        "free"
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          entry_fee:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500 disabled:bg-slate-100"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Prize Pool (NPR)
                    </label>

                    <input
                      type="number"
                      min="0"
                      value={form.prize_pool}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          prize_pool:
                            e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                    />
                  </div>
                </div>

                {/* PLAYERS */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Maximum Players
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.max_players}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        max_players:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>

                {/* MODE + TEAM SIZE */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Tournament Mode
                    </label>

                    <select
                      value={form.tournament_mode}
                      onChange={(e) => {
                        const mode =
                          e.target.value as FormData["tournament_mode"];

                        setForm({
                          ...form,
                          tournament_mode: mode,
                          team_size:
                            mode === "solo"
                              ? "1"
                              : mode === "duo"
                                ? "2"
                                : form.team_size === "1"
                                  ? "4"
                                  : form.team_size,
                        });
                      }}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                    >
                      <option value="solo">Solo — 1 Player</option>
                      <option value="duo">Duo — 2 Players</option>
                      <option value="squad">Squad — Team</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold text-slate-700">
                      Team Size
                    </label>

                    <select
                      value={form.team_size}
                      disabled={
                        form.tournament_mode === "solo" ||
                        form.tournament_mode === "duo"
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          team_size: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500 disabled:bg-slate-100"
                    >
                      {form.tournament_mode === "squad" ? (
                        <>
                          {Array.from({ length: 9 }, (_, i) => i + 2).map(
                            (size) => (
                              <option key={size} value={size}>
                                {size} Players
                              </option>
                            )
                          )}
                        </>
                      ) : (
                        <option value={form.team_size}>
                          {form.team_size} Player
                        </option>
                      )}
                    </select>

                    <p className="mt-1 text-xs text-slate-400">
                      Solo = 1, Duo = 2, Squad = configurable team size.
                    </p>
                  </div>
                </div>

                {/* DATE */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Start Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        start_date:
                          e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  />
                </div>

                {/* STATUS */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Status
                  </label>

                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status:
                          e.target.value as FormData["status"],
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  >
                    <option value="upcoming">
                      Upcoming
                    </option>

                    <option value="live">
                      Live
                    </option>

                    <option value="completed">
                      Completed
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>
                  </select>
                </div>

                {/* IMAGE */}
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Tournament Image URL
                  </label>

                  <input
                    type="text"
                    value={form.image}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        image: e.target.value,
                      })
                    }
                    placeholder="https://..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-500"
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Direct image uploading can be added later.
                  </p>
                </div>

                {/* BUTTONS */}
                <div className="flex gap-3 border-t border-slate-100 pt-5">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Update Tournament"
                      : "Create Tournament"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================================================
            RESULTS / PRIZE MODAL
        ================================================== */}

        {showPrizeModal &&
          selectedTournament && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
              <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">

                {/* MODAL HEADER */}
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <Trophy
                        className="text-yellow-600"
                        size={21}
                      />

                      <h2 className="text-xl font-black text-slate-950">
                        Tournament Results & Prize
                      </h2>
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {selectedTournament.title} • Select placement and prize
                    </p>
                  </div>

                  <button
                    onClick={closePrizeModal}
                    disabled={savingResults}
                    className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* CONTENT */}
                <div className="space-y-5 p-6">

                  {/* PRIZE POOL */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-yellow-700">
                        Tournament Prize Pool
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-950">
                        NPR{" "}
                        {Number(
                          selectedTournament.prize_pool
                        ).toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Total Selected Prize
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-950">
                        NPR{" "}
                        {getTotalPrize().toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* ERROR */}
                  {error && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                      {error}
                    </div>
                  )}

                  {/* INFO */}
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-bold text-blue-800">
                      Select 1, 2, or 3 winners
                    </p>

                    <p className="mt-1 text-xs text-blue-700">
                      Select the player for each placement and enter
                      the prize amount. Only selected positions will be saved and paid.
                    </p>
                  </div>

                  {/* PLAYERS */}
                  {loadingPlayers ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      Loading registered players...
                    </div>
                  ) : players.length === 0 ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700">
                      No registered players found for this
                      tournament.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {results.map(
                        (result, index) => {
                          const availablePlayers =
                            getAvailablePlayers(
                              index
                            );

                          return (
                            <div
                              key={index}
                              className={`rounded-2xl border p-5 ${
                                index === 0
                                  ? "border-yellow-300 bg-yellow-50/40"
                                  : "border-slate-200 bg-white"
                              }`}
                            >

                              {/* POSITION HEADER */}
                              <div className="mb-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-black ${
                                      index === 0
                                        ? "bg-yellow-400 text-slate-950"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {index + 1}
                                  </div>

                                  <div>
                                    <h3 className="font-black text-slate-950">
                                      {index + 1}
                                      {getOrdinal(
                                        index + 1
                                      )}{" "}
                                      Place
                                    </h3>

                                    <p className="text-xs text-slate-500">
                                      Optional
                                    </p>
                                  </div>
                                </div>

                                {result.userId && (
                                  <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
                                    Selected
                                  </span>
                                )}
                              </div>

                              {/* PLAYER */}
                              <div>
                                <label className="mb-2 block text-sm font-bold text-slate-700">
                                  Player
                                </label>

                                <select
                                  value={
                                    result.userId
                                  }
                                  onChange={(e) =>
                                    updateResult(
                                      index,
                                      "userId",
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    savingResults
                                  }
                                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-yellow-500 disabled:bg-slate-100"
                                >
                                  <option value="">
                                    No winner / Leave empty
                                  </option>

                                  {availablePlayers.map(
                                    (player) => (
                                      <option
                                        key={
                                          player.user_id
                                        }
                                        value={
                                          player.user_id
                                        }
                                      >
                                        {
                                          player.full_name
                                        }{" "}
                                        (@
                                        {
                                          player.username
                                        }
                                        )
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>

                              {/* PRIZE ONLY */}
                              <div className="mt-4">
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">
                                  Prize (NPR)
                                </label>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={result.prize}
                                  onChange={(e) =>
                                    updateResult(
                                      index,
                                      "prize",
                                      e.target.value
                                    )
                                  }
                                  disabled={
                                    savingResults ||
                                    !result.userId
                                  }
                                  placeholder="Enter prize amount"
                                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-yellow-500 disabled:bg-slate-100"
                                />
                              </div>
                            </div>
                          );
                        }
                      )}
                    </div>
                  )}

                  {/* TOTAL */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-600">
                        Total Prize Distribution
                      </span>

                      <span
                        className={`text-lg font-black ${
                          getTotalPrize() >
                          Number(
                            selectedTournament.prize_pool
                          )
                            ? "text-red-600"
                            : "text-slate-950"
                        }`}
                      >
                        NPR{" "}
                        {getTotalPrize().toLocaleString()}
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full transition-all ${
                          getTotalPrize() >
                          Number(
                            selectedTournament.prize_pool
                          )
                            ? "bg-red-500"
                            : "bg-yellow-400"
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Number(
                              selectedTournament
                                .prize_pool
                            ) > 0
                              ? (getTotalPrize() /
                                  Number(
                                    selectedTournament.prize_pool
                                  )) *
                                  100
                              : 0
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* WARNING */}
                  <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4">
                    <p className="text-sm font-bold text-orange-700">
                      ⚠️ Prize payments are permanent.
                    </p>

                    <p className="mt-1 text-xs text-orange-600">
                      Verify all selected players, placements and
                      prize amounts before saving.
                    </p>
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-3 border-t border-slate-100 pt-5">
                    <button
                      type="button"
                      onClick={closePrizeModal}
                      disabled={savingResults}
                      className="flex-1 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveResults}
                      disabled={
                        savingResults ||
                        loadingPlayers ||
                        players.length === 0
                      }
                      className="flex-1 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-500 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingResults
                        ? "Saving Results..."
                        : "Save Results & Prize"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </main>
  );
}