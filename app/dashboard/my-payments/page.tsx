import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DepositRequest = {
  id: string;
  amount: number;
  payment_method: string;
  transaction_id: string | null;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
};

type WalletTransaction = {
  id: string;
  amount: number;
  type:
    | "deposit"
    | "withdrawal"
    | "entry_fee"
    | "prize"
    | "refund"
    | "bonus";
  description: string | null;
  reference_id: string | null;
  status: "pending" | "completed" | "rejected" | "cancelled";
  created_at: string;
};

type OldPayment = {
  id: string;
  amount: number;
  payment_method: string | null;
  transaction_id: string | null;
  status: string;
  created_at: string;
  tournament_id: string;
};

type Tournament = {
  id: string;
  title: string;
  game: string;
};

type HistoryItem = {
  id: string;
  type: "deposit" | "withdrawal" | "entry_fee" | "prize" | "refund" | "bonus" | "payment";
  amount: number;
  status: string;
  paymentMethod: string | null;
  transactionId: string | null;
  description: string;
  adminNote: string | null;
  createdAt: string;
  tournamentId: string | null;
};

function getStatusStyle(status: string) {
  switch (status) {
    case "approved":
    case "paid":
    case "completed":
      return "bg-green-100 text-green-700";

    case "rejected":
    case "failed":
      return "bg-red-100 text-red-700";

    case "pending":
      return "bg-yellow-100 text-yellow-700";

    case "cancelled":
    case "refunded":
      return "bg-slate-100 text-slate-600";

    default:
      return "bg-slate-100 text-slate-700";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "approved":
      return "Approved";

    case "rejected":
      return "Rejected";

    case "paid":
      return "Paid";

    case "failed":
      return "Failed";

    case "pending":
      return "Pending";

    case "completed":
      return "Completed";

    case "cancelled":
      return "Cancelled";

    case "refunded":
      return "Refunded";

    default:
      return status;
  }
}

function getTypeLabel(type: HistoryItem["type"]) {
  switch (type) {
    case "deposit":
      return "Wallet Deposit";

    case "withdrawal":
      return "Wallet Withdrawal";

    case "entry_fee":
      return "Tournament Entry";

    case "prize":
      return "Tournament Prize";

    case "refund":
      return "Refund";

    case "bonus":
      return "Bonus";

    case "payment":
      return "Tournament Payment";

    default:
      return "Transaction";
  }
}

export default async function MyPaymentsPage() {
  const supabase = await createClient();

  // Check logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  /*
   * 1. Get wallet deposit requests
   *
   * IMPORTANT:
   * Rejected deposits are stored here.
   * This is why we query deposit_requests separately.
   */
  const { data: depositData, error: depositError } = await supabase
    .from("deposit_requests")
    .select(
      "id, amount, payment_method, transaction_id, status, admin_note, created_at, reviewed_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (depositError) {
    console.error("Deposit request error:", depositError);
  }

  const deposits = (depositData ?? []) as DepositRequest[];

  /*
   * 2. Get actual wallet transactions
   *
   * This includes:
   * - Tournament entry fees
   * - Approved deposits
   * - Withdrawals
   * - Prizes
   * - Refunds
   * - Bonuses
   */
  const { data: walletTransactionData, error: walletTransactionError } =
    await supabase
      .from("wallet_transactions")
      .select(
        "id, amount, type, description, reference_id, status, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

  if (walletTransactionError) {
    console.error(
      "Wallet transaction error:",
      walletTransactionError
    );
  }

  const walletTransactions =
    (walletTransactionData ?? []) as WalletTransaction[];

  /*
   * 3. Keep support for old tournament payments
   *
   * Some older/test tournament payments may still exist
   * in the payments table.
   */
  const { data: paymentData, error: paymentError } = await supabase
    .from("payments")
    .select(
      "id, amount, payment_method, transaction_id, status, created_at, tournament_id"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (paymentError) {
    console.error("Payment error:", paymentError);
  }

  const oldPayments = (paymentData ?? []) as OldPayment[];

  /*
   * 4. Get tournament information for old payments
   */
  const tournamentIds = oldPayments.map(
    (payment) => payment.tournament_id
  );

  let tournaments: Tournament[] = [];

  if (tournamentIds.length > 0) {
    const { data: tournamentData, error: tournamentError } =
      await supabase
        .from("tournaments")
        .select("id, title, game")
        .in("id", tournamentIds);

    if (tournamentError) {
      console.error("Tournament error:", tournamentError);
    }

    tournaments = (tournamentData ?? []) as Tournament[];
  }

  /*
   * 5. Combine everything into one payment history
   */
  const history: HistoryItem[] = [];

  // Wallet deposits
  deposits.forEach((deposit) => {
    history.push({
      id: `deposit-${deposit.id}`,
      type: "deposit",
      amount: Number(deposit.amount),
      status: deposit.status,
      paymentMethod: deposit.payment_method,
      transactionId: deposit.transaction_id,
      description: "Wallet deposit request",
      adminNote: deposit.admin_note,
      createdAt: deposit.created_at,
      tournamentId: null,
    });
  });

  // Wallet transactions
  walletTransactions.forEach((transaction) => {
    /*
     * Do not show wallet deposit transactions here because
     * the deposit request above already represents that deposit.
     *
     * This prevents the same approved deposit from appearing twice.
     */
    if (transaction.type === "deposit") {
      return;
    }

    history.push({
      id: `wallet-${transaction.id}`,
      type: transaction.type,
      amount: Number(transaction.amount),
      status: transaction.status,
      paymentMethod: null,
      transactionId: null,
      description:
        transaction.description || getTypeLabel(transaction.type),
      adminNote: null,
      createdAt: transaction.created_at,
      tournamentId: transaction.reference_id,
    });
  });

  // Old/test tournament payments
  oldPayments.forEach((payment) => {
    history.push({
      id: `payment-${payment.id}`,
      type: "payment",
      amount: Number(payment.amount),
      status: payment.status,
      paymentMethod: payment.payment_method,
      transactionId: payment.transaction_id,
      description:
        tournaments.find(
          (tournament) => tournament.id === payment.tournament_id
        )?.title || "Tournament Payment",
      adminNote: null,
      createdAt: payment.created_at,
      tournamentId: payment.tournament_id,
    });
  });

  /*
   * Sort everything by newest first.
   */
  history.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto max-w-5xl">

        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-5 text-4xl font-black text-slate-950">
            My Payments
          </h1>

          <p className="mt-2 text-slate-500">
            View your deposits, withdrawals, tournament payments and
            transaction history.
          </p>
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <span className="text-2xl">💳</span>
            </div>

            <h2 className="mt-5 text-2xl font-black text-slate-950">
              No transactions yet
            </h2>

            <p className="mt-2 text-slate-500">
              Your wallet deposits, withdrawals and tournament
              payments will appear here.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard/wallet/deposit"
                className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-yellow-500 hover:text-slate-950"
              >
                Add Money
              </Link>

              <Link
                href="/tournaments"
                className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
              >
                Browse Tournaments
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-5">

            {history.map((item) => {
              const tournament = item.tournamentId
                ? tournaments.find(
                    (tournament) =>
                      tournament.id === item.tournamentId
                  )
                : null;

              const isRejected =
                item.status === "rejected" ||
                item.status === "failed";

              const isDeposit = item.type === "deposit";

              return (
                <div
                  key={item.id}
                  className={`rounded-3xl border bg-white p-6 shadow-sm ${
                    isRejected
                      ? "border-red-200"
                      : "border-slate-200"
                  }`}
                >
                  {/* Top */}
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div>
                      <p
                        className={`text-xs font-black uppercase tracking-[0.18em] ${
                          isRejected
                            ? "text-red-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {getTypeLabel(item.type)}
                      </p>

                      <h2 className="mt-2 text-2xl font-black text-slate-950">
                        {isDeposit
                          ? "Wallet Deposit"
                          : tournament?.title ||
                            item.description}
                      </h2>

                      {tournament && (
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                          {tournament.game}
                        </p>
                      )}
                    </div>

                    <span
                      className={`w-fit rounded-full px-4 py-2 text-sm font-bold ${getStatusStyle(
                        item.status
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  {/* Rejected message */}
                  {isRejected && (
                    <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
                      <p className="text-sm font-bold text-red-700">
                        ❌ This transaction was rejected.
                      </p>

                      {item.adminNote && (
                        <p className="mt-1 text-sm text-red-600">
                          Admin note: {item.adminNote}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Pending message */}
                  {item.status === "pending" && (
                    <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
                      <p className="text-sm font-bold text-yellow-700">
                        ⏳ Your payment is waiting for admin review.
                      </p>

                      <p className="mt-1 text-sm text-yellow-700">
                        Your wallet will be updated after approval.
                      </p>
                    </div>
                  )}

                  {/* Details */}
                  <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Amount
                      </p>

                      <p className="mt-1 font-black text-slate-950">
                        NPR {item.amount.toLocaleString()}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Payment Method
                      </p>

                      <p className="mt-1 font-black capitalize text-slate-950">
                        {item.paymentMethod || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Transaction ID
                      </p>

                      <p className="mt-1 break-all text-sm font-bold text-slate-950">
                        {item.transactionId || "-"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-xs text-slate-500">
                        Date
                      </p>

                      <p className="mt-1 font-black text-slate-950">
                        {new Date(
                          item.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>

                  </div>

                  {/* Approved deposit information */}
                  {item.status === "approved" &&
                    isDeposit && (
                      <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
                        <p className="text-sm font-bold text-green-700">
                          ✅ Deposit approved
                        </p>

                        <p className="mt-1 text-sm text-green-700">
                          NPR {item.amount.toLocaleString()} has been
                          added to your wallet.
                        </p>
                      </div>
                    )}

                </div>
              );
            })}

          </div>
        )}

      </div>
    </main>
  );
}