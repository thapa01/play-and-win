import Link from "next/link";

const faqs = [
  {
    question: "How do I join a tournament?",
    answer:
      "Open the Tournaments page, select a tournament and follow the registration process. Paid tournaments require sufficient wallet balance.",
  },
  {
    question: "How do I add money to my wallet?",
    answer:
      "Go to Dashboard → Wallet → Add Money. Select a payment method, make the payment and submit your transaction details for verification.",
  },
  {
    question: "How long does a deposit verification take?",
    answer:
      "Manual deposits are reviewed by the Play & Win administration team. Your wallet is updated after the payment has been verified and approved.",
  },
  {
    question: "What happens if my payment is rejected?",
    answer:
      "A rejected payment request does not add money to your wallet. The request status and available admin note can be shown in your payment history.",
  },
  {
    question: "What is the minimum wallet deposit?",
    answer:
      "The current minimum wallet deposit is NPR 50.",
  },
  {
    question: "Can I withdraw my wallet balance?",
    answer:
      "Yes. Eligible users can submit a withdrawal request from Dashboard → Wallet → Withdraw. Withdrawal requests are reviewed before the wallet balance is deducted.",
  },
  {
    question: "Where can I find my tournament room details?",
    answer:
      "After registering for a tournament, available room information can be accessed from the Game Access section when the tournament organizer releases it.",
  },
  {
    question: "How can I contact support?",
    answer:
      "Open the Support page and submit a support ticket with your issue and relevant details.",
  },
];

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-4xl">

        <Link
          href="/"
          className="text-sm font-semibold text-slate-500 hover:text-slate-950"
        >
          ← Back to Home
        </Link>

        <div className="mt-6">

          <div className="text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-yellow-600">
              Help Center
            </p>

            <h1 className="mt-3 text-4xl font-black text-slate-950">
              Frequently Asked Questions
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              Find answers to common questions about tournaments, payments,
              wallets and Play & Win.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-black text-slate-950">
                  {faq.question}
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl bg-slate-950 p-8 text-center text-white">
            <h2 className="text-2xl font-black">
              Still need help?
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Our support section is available for account, payment and
              tournament-related questions.
            </p>

            <Link
              href="/support"
              className="mt-6 inline-flex rounded-xl bg-yellow-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-yellow-500"
            >
              Contact Support
            </Link>
          </div>

        </div>
      </div>
    </main>
  );
}