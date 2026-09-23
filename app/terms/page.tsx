import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 hover:text-slate-950"
        >
          ← Back to Home
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">

          <p className="text-sm font-bold uppercase tracking-widest text-yellow-600">
            Play & Win
          </p>

          <h1 className="mt-3 text-4xl font-black text-slate-950">
            Terms of Service
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Last updated: September 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-7 text-slate-600">

            <section>
              <h2 className="text-xl font-black text-slate-950">
                1. Acceptance of Terms
              </h2>

              <p className="mt-3">
                By accessing or using Play & Win, you agree to follow these
                Terms of Service. If you do not agree with these terms, please
                do not use the platform.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                2. User Accounts
              </h2>

              <p className="mt-3">
                Users are responsible for keeping their account information
                accurate and protecting their login credentials. You are
                responsible for activity performed through your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                3. Tournaments
              </h2>

              <p className="mt-3">
                Tournament rules, entry fees, player limits, schedules and
                prize information may vary between tournaments. Users must
                follow the rules displayed for each tournament.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                4. Payments and Wallet
              </h2>

              <p className="mt-3">
                Wallet deposits may require verification before funds are
                credited. Tournament entry fees and other wallet transactions
                are recorded in the user's account history.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                5. Fair Play
              </h2>

              <p className="mt-3">
                Players are expected to participate fairly and follow the
                applicable game and tournament rules. Suspicious or prohibited
                activity may result in account or tournament restrictions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                6. Changes to the Service
              </h2>

              <p className="mt-3">
                Play & Win may update features, tournament rules or these terms
                when necessary. Updated terms will be published on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                7. Contact
              </h2>

              <p className="mt-3">
                If you have questions regarding these terms, please contact
                Play & Win through the Support page.
              </p>
            </section>

          </div>

        </div>
      </div>
    </main>
  );
}