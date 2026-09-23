"use client";

import NotificationBell from "./components/NotificationBell";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

import {
  ArrowRight,
  Gamepad2,
  Menu,
  Search,
  ShieldCheck,
  Trophy,
  Users,
  Wallet,
  X,
} from "lucide-react";

import GameCard from "./components/GameCard";
import TournamentCard from "./components/TournamentCard";

type HomepageStats = {
  total_players: number;
  total_tournaments: number;
  completed_tournaments: number;
  total_prizes: number;
};

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
};

export default function Home() {
  const supabase = createClient();

  const [loggedIn, setLoggedIn] = useState(false);

  const [stats, setStats] = useState<HomepageStats>({
    total_players: 0,
    total_tournaments: 0,
    completed_tournaments: 0,
    total_prizes: 0,
  });

  const [statsLoading, setStatsLoading] = useState(true);

  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [tournamentsLoading, setTournamentsLoading] = useState(true);

  // Homepage search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setLoggedIn(!!user);
    }

    async function loadHomepageStats() {
      setStatsLoading(true);

      const { data, error } = await supabase.rpc(
        "get_homepage_statistics"
      );

      if (!error && data) {
        setStats({
          total_players: Number(data.total_players || 0),
          total_tournaments: Number(data.total_tournaments || 0),
          completed_tournaments: Number(
            data.completed_tournaments || 0
          ),
          total_prizes: Number(data.total_prizes || 0),
        });
      }

      setStatsLoading(false);
    }

    async function loadUpcomingTournaments() {
      setTournamentsLoading(true);

      const { data, error } = await supabase
        .from("tournaments")
        .select(`
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
          image
        `)
        .eq("status", "upcoming")
        .order("start_date", { ascending: true })
        .limit(3);

      if (!error && data) {
        setTournaments(data as Tournament[]);
      } else {
        console.error(
          "Error loading upcoming tournaments:",
          error
        );
        setTournaments([]);
      }

      setTournamentsLoading(false);
    }

    checkUser();
    loadHomepageStats();
    loadUpcomingTournaments();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session?.user);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  function formatNumber(value: number) {
    return new Intl.NumberFormat("en-IN").format(value);
  }

  function formatPrize(value: number) {
    if (value >= 10000000) {
      return `NPR ${(value / 10000000).toFixed(1)}Cr+`;
    }

    if (value >= 100000) {
      return `NPR ${(value / 100000).toFixed(1)}L+`;
    }

    if (value >= 1000) {
      return `NPR ${(value / 1000).toFixed(1)}K+`;
    }

    return `NPR ${formatNumber(value)}`;
  }

  function formatTournamentDate(date: string) {
    return new Intl.DateTimeFormat("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(date));
  }

  function getTournamentGame(game: string) {
    const normalized = game.toLowerCase();

    if (normalized.includes("free")) {
      return "FREE FIRE";
    }

    if (normalized.includes("efootball")) {
      return "eFOOTBALL";
    }

    if (normalized.includes("mobile")) {
      return "MOBILE LEGENDS";
    }

    if (normalized.includes("ludo")) {
      return "LUDO";
    }

    return "PUBG";
  }

  function getTournamentType(tournament: Tournament) {
    if (tournament.tournament_type === "free") {
      return "FREE";
    }

    return "PAID";
  }

  function getTournamentImage(tournament: Tournament) {
    if (tournament.image) {
      return tournament.image;
    }

    const game = tournament.game.toLowerCase();

    if (game.includes("free")) {
      return "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=85";
    }

    if (game.includes("efootball")) {
      return "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85";
    }

    if (game.includes("mobile")) {
      return "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85";
    }

    if (game.includes("ludo")) {
      return "https://images.unsplash.com/photo-1606503153255-59d8b8b6b7d7?auto=format&fit=crop&w=900&q=85";
    }

    return "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=900&q=85";
  }

  function getTournamentHref(tournament: Tournament) {
    return `/tournaments/${tournament.id}`;
  }

  const searchableGames = [
    {
      title: "PUBG",
      description: "Battle Royale",
      href: "/games/pubg",
      keywords: "pubg bgmi playerunknown battlegrounds battle royale",
    },
    {
      title: "FREE FIRE",
      description: "Survival Shooter",
      href: "/games/free-fire",
      keywords: "free fire garena survival shooter",
    },
    {
      title: "eFOOTBALL",
      description: "Football Game",
      href: "/games/efootball",
      keywords: "efootball football soccer pes",
    },
    {
      title: "MOBILE LEGENDS",
      description: "5v5 MOBA",
      href: "/games/mobile-legends",
      keywords: "mobile legends mlbb moba 5v5",
    },
  ];

  const searchablePages = [
    {
      title: "Tournaments",
      description: "Browse all tournaments",
      href: "/tournaments",
      keywords: "tournament tournaments competition compete",
    },
    {
      title: "How It Works",
      description: "Learn how Play & Win works",
      href: "/how-it-works",
      keywords: "how works guide process",
    },
    {
      title: "Support",
      description: "Get help and contact support",
      href: "/support",
      keywords: "support help contact faq",
    },
  ];

  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredGames = searchableGames.filter((game) => {
    if (!normalizedSearch) return true;

    return `${game.title} ${game.description} ${game.keywords}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const filteredTournaments = tournaments.filter((tournament) => {
    if (!normalizedSearch) return true;

    return [
      tournament.title,
      tournament.game,
      tournament.description || "",
      tournament.tournament_type,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const filteredPages = searchablePages.filter((page) => {
    if (!normalizedSearch) return true;

    return `${page.title} ${page.description} ${page.keywords}`
      .toLowerCase()
      .includes(normalizedSearch);
  });

  const totalSearchResults =
    filteredGames.length +
    filteredTournaments.length +
    filteredPages.length;

  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* =====================================================
          NAVBAR
      ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6">

          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-slate-950">
              <Gamepad2 size={21} strokeWidth={2.5} />
            </div>

            <span className="text-lg font-extrabold tracking-tight sm:text-xl">
              PLAY<span className="text-yellow-500">&</span>WIN
            </span>
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            <Link
              href="/"
              className="text-sm font-semibold text-yellow-600"
            >
              Home
            </Link>

            <Link
              href="/tournaments"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Tournaments
            </Link>

            <Link
              href="/games"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Games
            </Link>


            <Link
              href="/how-it-works"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              How It Works
            </Link>

            <Link
              href="/support"
              className="text-sm font-medium text-slate-600 transition hover:text-slate-950"
            >
              Support
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">

            <button
              type="button"
              aria-label="Search"
              onClick={() => {
                setSearchOpen((open) => !open);
                setSearchQuery("");
              }}
              className={`hidden rounded-full p-2 transition sm:block ${
                searchOpen
                  ? "bg-yellow-100 text-yellow-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Search size={19} />
            </button>

            <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <button
  type="button"
  aria-label="Open menu"
  onClick={() => setMobileMenuOpen((open) => !open)}
  className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 sm:hidden"
>
  {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
</button>
  {loggedIn && <NotificationBell />}

  {loggedIn ? (
    <>
      <Link
        href="/dashboard"
        className="hidden rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 sm:block"
      >
        Dashboard
      </Link>

      <Link
        href="/dashboard/wallet"
        className="hidden items-center gap-2 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm font-bold text-yellow-700 transition hover:border-yellow-400 hover:bg-yellow-100 sm:flex"
      >
        <Wallet size={17} />
        Wallet
      </Link>

      <Link
        href="/dashboard/profile"
        className="hidden shrink-0 rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-yellow-300 sm:block sm:px-4"
      >
        <span className="sm:hidden">Profile</span>
        <span className="hidden sm:inline">Profile</span>
      </Link>
    </>
  ) : (
    <>
      <Link
        href="/login"
        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950 sm:px-4"
      >
        Login
      </Link>

      <Link
        href="/sign-up"
        className="rounded-xl bg-yellow-400 px-3 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-yellow-300 sm:px-4"
      >
        Sign Up
      </Link>
    </>
  )}
</div>
          </div>
        </div>
      </header>
      {mobileMenuOpen && (
  <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-200 bg-white shadow-lg sm:hidden">
    <div className="mx-auto max-w-7xl px-5 py-4">
      <div className="space-y-1">
        <Link
          href="/"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
        >
          Home
        </Link>

        <Link
          href="/tournaments"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
        >
          Tournaments
        </Link>

        <Link
          href="/games"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
        >
          Games
        </Link>

        {loggedIn && (
          <>
            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
            >
              Dashboard
            </Link>

            <Link
              href="/dashboard/wallet"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
            >
              Wallet
            </Link>

            <Link
              href="/dashboard/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
            >
              Profile
            </Link>
          </>
        )}

        <Link
          href="/how-it-works"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
        >
          How It Works
        </Link>

        <Link
          href="/support"
          onClick={() => setMobileMenuOpen(false)}
          className="block rounded-xl px-4 py-3 text-sm font-bold text-slate-700 hover:bg-yellow-50 hover:text-yellow-700"
        >
          Support
        </Link>
      </div>
    </div>
  </div>
)}

      {/* SEARCH */}
      {searchOpen && (
        <div className="sticky top-16 z-40 border-b border-slate-200 bg-white/95 shadow-lg backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-5 py-4 sm:px-6">
            <div className="relative">
              <Search
                size={19}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                autoFocus
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    closeSearch();
                    return;
                  }

                  if (event.key === "Enter") {
                    const firstResult =
                      filteredGames[0]?.href ||
                      (filteredTournaments[0]
                        ? `/tournaments/${filteredTournaments[0].id}`
                        : filteredPages[0]?.href);

                    if (firstResult) {
                      window.location.href = firstResult;
                    }
                  }
                }}
                placeholder="Search games, tournaments, players..."
                className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm font-medium text-slate-900 outline-none transition focus:border-yellow-400 focus:bg-white focus:ring-4 focus:ring-yellow-100"
              />

              <button
                type="button"
                aria-label="Close search"
                onClick={closeSearch}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <div className="mt-3 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
              {!normalizedSearch ? (
                <div className="p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Quick Search
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {searchableGames.map((game) => (
                      <Link
                        key={game.href}
                        href={game.href}
                        onClick={closeSearch}
                        className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700"
                      >
                        {game.title}
                      </Link>
                    ))}
                    <Link
                      href="/tournaments"
                      onClick={closeSearch}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition hover:border-yellow-300 hover:bg-yellow-50 hover:text-yellow-700"
                    >
                      Tournaments
                    </Link>
                  </div>
                </div>
              ) : totalSearchResults === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <Search size={21} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">
                    No results found
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Try searching for PUBG, Free Fire, eFootball, Mobile Legends or a tournament.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredGames.length > 0 && (
                    <div className="p-3">
                      <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        Games
                      </p>

                      <div className="grid gap-1 sm:grid-cols-2">
                        {filteredGames.map((game) => (
                          <Link
                            key={game.href}
                            href={game.href}
                            onClick={closeSearch}
                            className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-yellow-50"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900">
                                {game.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {game.description}
                              </p>
                            </div>
                            <ArrowRight size={15} className="text-slate-400" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTournaments.length > 0 && (
                    <div className="p-3">
                      <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        Tournaments
                      </p>

                      <div className="space-y-1">
                        {filteredTournaments.slice(0, 6).map((tournament) => (
                          <Link
                            key={tournament.id}
                            href={`/tournaments/${tournament.id}`}
                            onClick={closeSearch}
                            className="flex items-center justify-between rounded-xl px-3 py-3 transition hover:bg-yellow-50"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-bold text-slate-900">
                                {tournament.title}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {getTournamentGame(tournament.game)} • NPR{" "}
                                {formatNumber(Number(tournament.prize_pool))} Prize Pool
                              </p>
                            </div>
                            <ArrowRight size={15} className="ml-3 shrink-0 text-slate-400" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredPages.length > 0 && (
                    <div className="p-3">
                      <p className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-slate-400">
                        Pages
                      </p>

                      <div className="grid gap-1 sm:grid-cols-3">
                        {filteredPages.map((page) => (
                          <Link
                            key={page.href}
                            href={page.href}
                            onClick={closeSearch}
                            className="rounded-xl px-3 py-3 transition hover:bg-yellow-50"
                          >
                            <p className="text-sm font-bold text-slate-900">
                              {page.title}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {page.description}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        id="home"
        className="relative overflow-hidden border-b border-slate-200"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(248,250,252,0.98) 0%, rgba(248,250,252,0.94) 35%, rgba(248,250,252,0.50) 65%, rgba(248,250,252,0.20) 100%), url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1800&q=85')",
          }}
        />

        <div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center px-5 py-14 sm:px-6 lg:grid-cols-2 lg:py-16">

          <div className="max-w-2xl">

            <p className="mb-4 text-xs font-bold uppercase tracking-[0.25em] text-slate-500 sm:text-sm">
              Play. Compete. Win.
            </p>

            <h1 className="text-4xl font-black leading-[1.05] tracking-tight text-slate-950 sm:text-5xl md:text-6xl lg:text-7xl">
              Turn Your
              <br />
              Gaming Skills
              <br />
              Into{" "}
              <span className="text-yellow-500">
                Rewards
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-600 sm:text-base sm:leading-7 lg:text-lg">
              Join exciting tournaments in PUBG, Free Fire and eFootball.
              Play your game, prove your skills and compete for real rewards.
            </p>

            <div className="mt-7 flex flex-wrap gap-3 sm:gap-4">

              <Link
                href={loggedIn ? "/tournaments" : "/sign-up"}
                className="group flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-yellow-200 transition hover:-translate-y-0.5 hover:bg-yellow-500"
              >
                Get Started

                <ArrowRight
                  size={18}
                  className="transition group-hover:translate-x-1"
                />
              </Link>

              <Link
                href="/how-it-works"
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white/90 px-6 py-3.5 text-sm font-bold text-slate-800 backdrop-blur transition hover:bg-white"
              >
                How It Works
              </Link>

            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-3 lg:mt-12">

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md">
                  <Users size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Fair Play
                  </p>

                  <p className="text-xs text-slate-500">
                    Verified Players
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Secure
                  </p>

                  <p className="text-xs text-slate-500">
                    Safe Transactions
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white shadow-md">
                  <Trophy
                    size={20}
                    className="text-yellow-500"
                  />
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">
                    Real Rewards
                  </p>

                  <p className="text-xs text-slate-500">
                    Win Exciting Prizes
                  </p>
                </div>
              </div>

            </div>
          </div>

          <div className="relative mx-auto mt-12 hidden h-[500px] w-full max-w-xl lg:block">

            <div
              className="absolute right-[42%] top-12 h-[430px] w-[230px] rotate-[-4deg] overflow-hidden rounded-[28px] border-4 border-white shadow-2xl"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(0,0,0,.85), transparent 60%), url('https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=700&q=85')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute bottom-6 left-5">
                <p className="text-2xl font-black text-white">
                  PUBG
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Strategy. Survival. Victory.
                </p>
              </div>
            </div>

            <div
              className="absolute right-[17%] top-3 h-[430px] w-[230px] rotate-[2deg] overflow-hidden rounded-[28px] border-4 border-white shadow-2xl"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(0,0,0,.85), transparent 60%), url('https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=700&q=85')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute bottom-6 left-5">
                <p className="text-2xl font-black text-white">
                  FREE FIRE
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Fast Matches. Bigger Rewards.
                </p>
              </div>
            </div>

            <div
              className="absolute right-[-7%] top-16 h-[430px] w-[230px] rotate-[7deg] overflow-hidden rounded-[28px] border-4 border-white shadow-2xl"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(0,0,0,.85), transparent 60%), url('https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=700&q=85')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute bottom-6 left-5">
                <p className="text-2xl font-black text-white">
                  eFOOTBALL
                </p>
                <p className="mt-1 text-xs text-white/80">
                  Skill. Strategy. Glory.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          CHOOSE YOUR GAME
      ===================================================== */}

      <section
        id="games"
        className="bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6">

          <div className="mb-8 flex flex-col justify-between gap-4 sm:mb-10 sm:flex-row sm:items-end">

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-500 sm:text-sm">
                Featured Games
              </p>

              <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Choose Your Game
              </h2>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Pick your game. Join a tournament. Show your skills.
              </p>
            </div>

            <Link
              href="/games"
              className="flex items-center gap-2 self-start text-sm font-bold text-slate-800 transition hover:text-yellow-600 sm:self-auto"
            >
              View All Games
              <ArrowRight size={17} />
            </Link>

          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

            <GameCard
              title="PUBG"
              description="Strategy. Survival. Victory."
              image="https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=900&q=85"
              href="/games/pubg"
            />

            <GameCard
              title="FREE FIRE"
              description="Fast Matches. Bigger Rewards."
              image="https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=900&q=85"
              href="/games/free-fire"
            />

            <GameCard
              title="eFOOTBALL"
              description="Skill. Strategy. Glory."
              image="https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=85"
              href="/games/efootball"
            />

            <GameCard
              title="MOBILE LEGENDS"
              description="Teamwork. Strategy. Victory."
              image="https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=85"
              href="/games/mobile-legends"
            />

          </div>
        </div>
      </section>

      {/* =====================================================
          HOW IT WORKS
      ===================================================== */}

      <section
        id="how-it-works"
        className="bg-slate-50 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6">

          <div className="mb-10">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
              Simple Process
            </p>

            <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
              How It Works
            </h2>

            <p className="mt-2 text-slate-500">
              Get started in just a few simple steps.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <Users size={26} />
              </div>

              <span className="text-xs font-bold text-slate-400">
                STEP 01
              </span>

              <h3 className="mt-1 text-lg font-bold">
                Create Account
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Sign up and complete your player profile.
              </p>
            </div>

            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <Gamepad2 size={26} />
              </div>

              <span className="text-xs font-bold text-slate-400">
                STEP 02
              </span>

              <h3 className="mt-1 text-lg font-bold">
                Join Tournament
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Choose your game and register for a room.
              </p>
            </div>

            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-green-600">
                <Trophy size={26} />
              </div>

              <span className="text-xs font-bold text-slate-400">
                STEP 03
              </span>

              <h3 className="mt-1 text-lg font-bold">
                Compete
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Play your best and compete with other players.
              </p>
            </div>

            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <Trophy size={26} />
              </div>

              <span className="text-xs font-bold text-slate-400">
                STEP 04
              </span>

              <h3 className="mt-1 text-lg font-bold">
                Win Rewards
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Winners receive their eligible rewards.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* =====================================================
          UPCOMING TOURNAMENTS - DATABASE
      ===================================================== */}

      <section
        id="tournaments"
        className="bg-white py-16 sm:py-20"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-6">

          <div className="mb-8 flex items-end justify-between gap-4">

            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Upcoming
              </p>

              <h2 className="text-3xl font-black text-slate-950 sm:text-4xl">
                Tournaments
              </h2>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">
                Join the next big battles.
              </p>
            </div>

            <Link
              href="/tournaments"
              className="hidden items-center gap-2 text-sm font-bold transition hover:text-yellow-600 sm:flex"
            >
              View All
              <ArrowRight size={17} />
            </Link>

          </div>

          {tournamentsLoading ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[360px] animate-pulse rounded-2xl bg-slate-100"
                />
              ))}

            </div>
          ) : tournaments.length === 0 ? (

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">

              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                <Trophy size={26} />
              </div>

              <h3 className="mt-4 text-lg font-bold text-slate-900">
                No Upcoming Tournaments
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Check back soon for the next tournament.
              </p>

              <Link
                href="/tournaments"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Browse Tournaments
                <ArrowRight size={17} />
              </Link>

            </div>

          ) : (

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

              {tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  game={getTournamentGame(tournament.game)}
                  title={tournament.title}
                  type={getTournamentType(tournament)}
                  date={formatTournamentDate(tournament.start_date)}
                  players={`${tournament.registered_players} / ${tournament.max_players}`}
                  prize={`NPR ${formatNumber(
                    Number(tournament.prize_pool)
                  )}`}
                  image={getTournamentImage(tournament)}
                  href={getTournamentHref(tournament)}
                />
              ))}

            </div>
          )}

          <div className="mt-6 sm:hidden">
            <Link
              href="/tournaments"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              View All Tournaments
              <ArrowRight size={17} />
            </Link>
          </div>

        </div>
      </section>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section
        className="border-y border-slate-200 bg-slate-50"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-5 py-10 sm:px-6 md:grid-cols-4">

          <div className="border-b border-slate-200 p-5 text-center md:border-b-0 md:border-r">
            <p className="text-3xl font-black text-slate-950">
              {statsLoading
                ? "—"
                : formatNumber(stats.total_players)}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Players
            </p>
          </div>

          <div className="border-b border-slate-200 p-5 text-center md:border-b-0 md:border-r">
            <p className="text-3xl font-black text-slate-950">
              {statsLoading
                ? "—"
                : formatNumber(stats.total_tournaments)}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Tournaments Hosted
            </p>
          </div>

          <div className="border-b border-slate-200 p-5 text-center md:border-b-0 md:border-r">
            <p className="text-3xl font-black text-slate-950">
              {statsLoading
                ? "—"
                : formatPrize(stats.total_prizes)}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Rewards Distributed
            </p>
          </div>

          <div className="p-5 text-center">
            <p className="text-3xl font-black text-slate-950">
              {statsLoading
                ? "—"
                : formatNumber(stats.completed_tournaments)}
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Completed Tournaments
            </p>
          </div>

        </div>
      </section>

      {/* =====================================================
          COMMUNITY
      ===================================================== */}

      <section className="bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">

          <div
            className="relative overflow-hidden rounded-3xl bg-cover bg-center"
            style={{
              backgroundImage:
                "linear-gradient(90deg, rgba(255,244,220,.97), rgba(255,244,220,.72), rgba(255,244,220,.25)), url('https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1600&q=85')",
            }}
          >

            <div className="relative max-w-xl px-6 py-12 sm:px-10 sm:py-16">

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">
                Be Part Of Something Bigger
              </p>

              <h2 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
                A Community of Gamers
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Meet players, make friends and compete together.
              </p>

              <Link
                href={loggedIn ? "/dashboard" : "/sign-up"}
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Join Our Community
                <ArrowRight size={17} />
              </Link>

            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <footer
        id="support"
        className="border-t border-slate-200 bg-slate-950 text-white"
      >

        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-4">

          <div>
            <div className="flex items-center gap-2">

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-slate-950">
                <Gamepad2 size={21} />
              </div>

              <span className="text-xl font-black">
                PLAY<span className="text-yellow-400">&</span>WIN
              </span>

            </div>

            <p className="mt-4 max-w-xs text-sm leading-6 text-slate-400">
              A platform for gamers to compete, grow and win.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Play Fair. Play Safe. Play & Win.
            </p>
          </div>

          <div>
            <h3 className="font-bold">
              Quick Links
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-400">

              <Link
                href="/"
                className="block hover:text-white"
              >
                Home
              </Link>

              <Link
                href="/tournaments"
                className="block hover:text-white"
              >
                Tournaments
              </Link>

              <Link
                href="/games"
                className="block hover:text-white"
              >
                Games
              </Link>

              <Link
                href="/how-it-works"
                className="block hover:text-white"
              >
                How It Works
              </Link>

            </div>
          </div>

          <div>

            <h3 className="font-bold">
              Support
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-400">

              <Link
                href="/support"
                className="block transition hover:text-white"
              >
                Help Center
              </Link>

              <Link
                href="/support"
                className="block transition hover:text-white"
              >
                Contact Us
              </Link>

              <Link
                href="/terms"
                className="block transition hover:text-white"
              >
                Terms of Service
              </Link>

              <Link
                href="/privacy"
                className="block transition hover:text-white"
              >
                Privacy Policy
              </Link>

              <Link
                href="/faq"
                className="block transition hover:text-white"
              >
                FAQs
              </Link>

            </div>
          </div>

          <div>

            <h3 className="font-bold">
              Stay Updated
            </h3>

            <p className="mt-3 text-sm text-slate-400">
              Get the latest tournaments and updates.
            </p>

            <div className="mt-5 flex overflow-hidden rounded-xl border border-slate-700">

              <input
                type="email"
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-slate-500"
              />

              <button className="bg-yellow-400 px-4 text-sm font-bold text-slate-950 transition hover:bg-yellow-500">
                Subscribe
              </button>

            </div>

          </div>

        </div>

        <div className="border-t border-slate-800">

          <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 px-5 py-6 text-xs text-slate-500 sm:px-6 md:flex-row">

            <p>
              © 2026 Play & Win. All rights reserved.
            </p>

            <p>
              Play Fair. Play Safe. Play & Win.
            </p>

          </div>

        </div>

      </footer>

    </main>
  );
}