import Link from "next/link";
import { Gift, Wallet } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LogoutButton from "@/app/components/LogoutButton";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not logged in, send them to login
  if (!user) {
    redirect("/login");
  }

  // Get profile information
  const { data: profile } = await supabase
    .from("profiles")
    .select("email, full_name, username, role, created_at")
    .eq("id", user.id)
    .single();

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-20 items-center justify-between gap-6">
            {/* Logo */}
            <Link href="/" className="shrink-0">
              <p className="text-xl font-black tracking-tight text-slate-950">
                PLAY <span className="text-yellow-500">&</span> WIN
              </p>

              <p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">
                GAMING TOURNAMENTS
              </p>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden items-center gap-6 lg:flex">
              <Link
                href="/"
                className="text-sm font-semibold text-yellow-600 transition hover:text-slate-950"
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

            {/* Logout */}
            <div className="shrink-0">
              <LogoutButton />
            </div>
          </div>

          {/* Mobile Navigation */}
          <nav className="flex gap-5 overflow-x-auto border-t border-slate-100 py-3 lg:hidden">
            <Link
              href="/"
              className="whitespace-nowrap text-xs font-bold text-yellow-600"
            >
              Home
            </Link>

            <Link
              href="/tournaments"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              Tournaments
            </Link>

            <Link
              href="/games"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              Games
            </Link>

            
            <Link
              href="/how-it-works"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              How It Works
            </Link>

            <Link
              href="/support"
              className="whitespace-nowrap text-xs font-semibold text-slate-600"
            >
              Support
            </Link>
          </nav>
        </div>
      </header>

      {/* Dashboard Content */}
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-yellow-600">
              PLAYER DASHBOARD
            </p>

            <h1 className="mt-2 text-4xl font-black text-slate-950">
              Welcome, {profile?.full_name || "Player"} 👋
            </h1>

            <p className="mt-2 text-slate-500">
              Manage your tournaments, games, wallet, promotions and account.
            </p>
          </div>
        </div>

        {/* Profile Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-black text-slate-950">
              Your Profile
            </h2>

            <Link
              href="/dashboard/profile"
              className="text-sm font-bold text-yellow-600 transition hover:text-slate-950"
            >
              Edit Profile →
            </Link>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-500">Full Name</p>

              <p className="mt-1 font-bold text-slate-950">
                {profile?.full_name || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Username</p>

              <p className="mt-1 font-bold text-slate-950">
                @{profile?.username || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Email</p>

              <p className="mt-1 break-all font-bold text-slate-950">
                {profile?.email || user.email || "-"}
              </p>
            </div>

            <div>
              <p className="text-sm text-slate-500">Role</p>

              <p className="mt-1 font-bold capitalize text-slate-950">
                {profile?.role || "user"}
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Options */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Wallet */}
          <Link
            href="/dashboard/wallet"
            className="group rounded-2xl border border-yellow-200 bg-yellow-50 p-6 transition hover:-translate-y-1 hover:border-yellow-400 hover:shadow-lg"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
              <Wallet size={22} />
            </div>

            <h3 className="mt-4 font-black text-slate-950">
              Wallet
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Add money, withdraw funds and view your wallet transactions.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              Open Wallet →
            </p>
          </Link>

          {/* My Tournaments */}
          <Link
            href="/dashboard/my-tournaments"
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
          >
            <h3 className="font-black text-slate-950">
              My Tournaments
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              View your tournament registrations.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              View Tournaments →
            </p>
          </Link>

          {/* My Payments */}
          <Link
            href="/dashboard/my-payments"
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
          >
            <h3 className="font-black text-slate-950">
              My Payments
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Check your payment history.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              View Payments →
            </p>
          </Link>

          {/* Game Access */}
          <Link
            href="/dashboard/game-access"
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
          >
            <h3 className="font-black text-slate-950">
              Game Access
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Access your paid game rooms.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              Open Game Access →
            </p>
          </Link>

          {/* Promo Codes */}
          <Link
            href="/dashboard/promo-codes"
            className="group rounded-2xl border border-yellow-200 bg-yellow-50 p-6 transition hover:-translate-y-1 hover:border-yellow-400 hover:shadow-lg"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
              <Gift size={22} />
            </div>

            <h3 className="mt-4 font-black text-slate-950">
              Promo Codes
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Discover available offers and wallet bonuses.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              View Promotions →
            </p>
          </Link>

          {/* Rewards */}
<Link
  href="/rewards"
  className="group rounded-2xl border border-yellow-200 bg-yellow-50 p-6 transition hover:-translate-y-1 hover:border-yellow-400 hover:shadow-lg"
>
  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
    <Gift size={22} />
  </div>

  <h3 className="mt-4 font-black text-slate-950">
    Rewards
  </h3>

  <p className="mt-2 text-sm text-slate-500">
    Earn rewards, invite friends and claim bonuses.
  </p>

  <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
    View Rewards →
  </p>
</Link>

          {/* Gaming IDs */}
          <Link
            href="/dashboard/gaming-ids"
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
          >
            <h3 className="font-black text-slate-950">
              Gaming IDs
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Save and manage your gaming IDs and in-game names.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              Manage Gaming IDs →
            </p>
          </Link>

          {/* My Squads */}
          <Link
            href="/dashboard/squads"
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
          >
            <h3 className="font-black text-slate-950">
              My Squads
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Create squads, invite players and manage your teams.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              Manage Squads →
            </p>
          </Link>

          {/* Profile */}
          <Link
            href="/dashboard/profile"
            className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:-translate-y-1 hover:border-yellow-300 hover:shadow-lg"
          >
            <h3 className="font-black text-slate-950">
              Profile
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              Manage your account details.
            </p>

            <p className="mt-4 text-sm font-bold text-yellow-600 transition group-hover:text-slate-950">
              Manage Profile →
            </p>
          </Link>
        </div>

        {/* Back to Website */}
        <div className="mt-8 rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
          <h3 className="text-lg font-black text-slate-950">
            Want to explore more?
          </h3>

          <p className="mt-1 text-sm text-slate-600">
            Browse upcoming tournaments and find your next competition.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/tournaments"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
            >
              Browse Tournaments
            </Link>

            <Link
              href="/games"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
            >
              Explore Games
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}