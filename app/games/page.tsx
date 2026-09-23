import Link from "next/link";
import { ArrowRight, Gamepad2 } from "lucide-react";

const games = [
  {
    title: "PUBG",
    description: "Strategy. Survival. Victory.",
    href: "/games/pubg",
    image:
      "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "FREE FIRE",
    description: "Fast Matches. Bigger Rewards.",
    href: "/games/free-fire",
    image:
      "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "eFOOTBALL",
    description: "Skill. Strategy. Glory.",
    href: "/games/efootball",
    image:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1000&q=85",
  },
  {
    title: "MOBILE LEGENDS",
    description: "Teamwork. Strategy. Victory.",
    href: "/games/mobile-legends",
    image:
      "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1000&q=85",
  },
];

export default function GamesPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Home
          </Link>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400 text-slate-950">
              <Gamepad2 size={22} />
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Play & Compete
              </p>

              <h1 className="mt-1 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Choose Your Game
              </h1>
            </div>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Pick your favourite game, find a tournament and compete against
            other players for exciting rewards.
          </p>
        </div>
      </section>

      {/* Games */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {games.map((game) => (
              <Link
                key={game.title}
                href={game.href}
                className="group relative h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <img
                  src={game.image}
                  alt={game.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-6">
                  <h2 className="text-2xl font-black text-white">
                    {game.title}
                  </h2>

                  <p className="mt-1 text-sm text-white/80">
                    {game.description}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-bold text-slate-950">
                    View Tournaments
                    <ArrowRight
                      size={17}
                      className="transition group-hover:translate-x-1"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}