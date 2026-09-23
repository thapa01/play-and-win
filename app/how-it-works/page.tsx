import Link from "next/link";
import {
  UserPlus,
  Trophy,
  CreditCard,
  LockKeyhole,
  Gamepad2,
  Medal,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Account",
    description:
      "Sign up for your Play & Win account using your name, username, email, and password.",
  },
  {
    number: "02",
    icon: Trophy,
    title: "Choose a Tournament",
    description:
      "Browse upcoming PUBG, Free Fire, eFootball, and Mobile Legends tournaments and choose the one you want to play.",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "Register & Pay",
    description:
      "Register for the tournament and complete the entry payment when the tournament requires a paid entry.",
  },
  {
    number: "04",
    icon: LockKeyhole,
    title: "Get Game Access",
    description:
      "Once your registration is confirmed, authorized room information becomes available through your dashboard.",
  },
  {
    number: "05",
    icon: Gamepad2,
    title: "Join & Play",
    description:
      "Use your authorized Room ID and Password to join the private game room and compete.",
  },
  {
    number: "06",
    icon: Medal,
    title: "Compete & Win",
    description:
      "Play your best, compete in tournaments, and win tournament prizes.",
  },
];

const features = [
  {
    icon: ShieldCheck,
    title: "Secure Access",
    description:
      "Tournament room credentials are available only to authorized registered players.",
  },
  {
    icon: Trophy,
    title: "Competitive Tournaments",
    description:
      "Compete in organized tournaments across multiple popular games.",
  },
  
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-slate-50">

      {/* HERO */}
      <section className="px-5 pb-16 pt-10 sm:pt-16">
        <div className="mx-auto max-w-6xl">

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Home
          </Link>

          <div className="mt-12 max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-600">
              PLAY & WIN
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">
              How It Works
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
              Joining a tournament is simple. Create your account,
              choose your game, register, get your private game access,
              and compete for the win.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-yellow-500 hover:text-slate-950"
              >
                Browse Tournaments
                <ArrowRight size={17} />
              </Link>

              <Link
                href="/games"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Explore Games
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* STEPS */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl">

          <div className="mb-8">
            <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
              THE PROCESS
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              From sign-up to competition
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                      <Icon size={23} />
                    </div>

                    <span className="text-sm font-black text-slate-200">
                      {step.number}
                    </span>
                  </div>

                  <h3 className="mt-6 text-xl font-black text-slate-950">
                    {step.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* SIMPLE FLOW */}
      <section className="border-y border-slate-200 bg-white px-5 py-16">
        <div className="mx-auto max-w-6xl">

          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
              SIMPLE FLOW
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Your tournament journey
            </h2>
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 md:flex-row md:flex-wrap">

            {[
              "Sign Up",
              "Choose Tournament",
              "Register",
              "Pay",
              "Get Access",
              "Play",
              "Win",
            ].map((item, index) => (
              <div
                key={item}
                className="flex items-center gap-3"
              >
                <div className="rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-800">
                  {item}
                </div>

                {index < 6 && (
                  <ArrowRight
                    size={16}
                    className="hidden text-slate-300 md:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="px-5 py-20">
        <div className="mx-auto max-w-6xl">

          <div className="grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon size={22} />
                  </div>

                  <h3 className="mt-5 text-lg font-black text-slate-950">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-20">
        <div className="mx-auto max-w-6xl rounded-3xl bg-slate-950 px-6 py-12 text-center sm:px-10">

          <p className="text-sm font-bold uppercase tracking-widest text-yellow-400">
            READY TO PLAY?
          </p>

          <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
            Find your next tournament.
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">
            Choose your game, join a tournament, and compete
            with other players.
          </p>

          <Link
            href="/tournaments"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-300"
          >
            View Tournaments
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

    </main>
  );
}