import Link from "next/link";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>

          <p className="mt-3 text-sm text-slate-500">
            Last updated: September 2026
          </p>

          <div className="mt-10 space-y-8 text-sm leading-7 text-slate-600">

            <section>
              <h2 className="text-xl font-black text-slate-950">
                1. Information We Collect
              </h2>

              <p className="mt-3">
                Play & Win may collect information required to create and
                manage your account, including your name, username and email
                address.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                2. Account Information
              </h2>

              <p className="mt-3">
                Account information is used to provide access to tournaments,
                wallet features, game access and other platform services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                3. Payment Information
              </h2>

              <p className="mt-3">
                Payment-related information submitted by users may include
                payment method, transaction ID and payment verification
                information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                4. How Information Is Used
              </h2>

              <p className="mt-3">
                Information may be used to operate accounts, process
                tournament registrations, verify payments, provide support and
                maintain platform security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                5. Security
              </h2>

              <p className="mt-3">
                We take reasonable measures to protect account and transaction
                information. Users should also protect their passwords and
                account credentials.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                6. Updates
              </h2>

              <p className="mt-3">
                This Privacy Policy may be updated as the platform develops.
                Changes will be published on this page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-slate-950">
                7. Contact
              </h2>

              <p className="mt-3">
                For privacy-related questions, please contact us through the
                Support page.
              </p>
            </section>

          </div>

        </div>
      </div>
    </main>
  );
}