"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowDownToLine,
  ShieldCheck,
  Upload,
  X,
  Image as ImageIcon,
  Gift,
  CheckCircle2,
  Copy,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PaymentMethod = "eSewa" | "Khalti" | "Bank Transfer";

const PAYMENT_METHODS: PaymentMethod[] = [
  "eSewa",
  "Khalti",
  "Bank Transfer",
];

/*
 * ============================================================
 * PAYMENT IMAGES
 * ============================================================
 *
 * Your files should be inside:
 *
 * public/images/
 *
 * If your filenames are different, ONLY change these 3 paths.
 */
const PAYMENT_DETAILS: Record<
  PaymentMethod,
  {
    title: string;
    description: string;
    image: string;
    label: string;
  }
> = {
  eSewa: {
    title: "Pay with eSewa",
    description:
      "Open your eSewa app and scan the QR code below to complete your payment.",
    image: "/payment/esewa-qr.png",
    label: "eSewa QR",
  },

  Khalti: {
    title: "Pay with Khalti",
    description:
      "Open your Khalti app and scan the QR code below to complete your payment.",
    image: "/payment/khalti-qr.png",
    label: "Khalti QR",
  },

  "Bank Transfer": {
    title: "Bank Transfer",
    description:
      "Scan the account-details QR below to view the bank payment information.",
    image: "/payment/bank-qr.png",
    label: "Bank Details",
  },
};

export default function DepositPage() {
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("eSewa");

  const [transactionId, setTransactionId] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);

  const [promoCode, setPromoCode] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const [imageError, setImageError] = useState(false);

  const selectedPayment = PAYMENT_DETAILS[paymentMethod];

  /*
   * ============================================================
   * SCREENSHOT HANDLING
   * ============================================================
   */

  function handleScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      setError("Screenshot must be smaller than 5MB.");
      return;
    }

    setScreenshot(file);
  }

  function removeScreenshot() {
    setScreenshot(null);
  }

  /*
   * ============================================================
   * PAYMENT METHOD CHANGE
   * ============================================================
   */

  function handlePaymentMethodChange(method: PaymentMethod) {
    setPaymentMethod(method);
    setImageError(false);
    setError("");
  }

  /*
   * ============================================================
   * SUBMIT DEPOSIT
   * ============================================================
   */

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    /*
     * Amount validation
     */
    if (!numericAmount || numericAmount < 50) {
      setError("Minimum deposit amount is NPR 50.");
      return;
    }

    if (!Number.isFinite(numericAmount)) {
      setError("Please enter a valid deposit amount.");
      return;
    }

    /*
     * Payment proof validation
     *
     * User must provide either:
     * - Transaction ID
     * OR
     * - Payment screenshot
     */
    if (!transactionId.trim() && !screenshot) {
      setError(
        "Please provide either a transaction ID or a payment screenshot."
      );
      return;
    }

    /*
     * Promo code is optional.
     */
    const cleanPromoCode = promoCode.trim().toUpperCase();

    setLoading(true);

    try {
      const supabase = createClient();

      /*
       * Get logged-in user
       */
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in to add money.");
      }

      let paymentProofPath: string | null = null;

      /*
       * ========================================================
       * UPLOAD PAYMENT SCREENSHOT
       * ========================================================
       */

      if (screenshot) {
        const fileExtension =
          screenshot.name
            .split(".")
            .pop()
            ?.toLowerCase() || "jpg";

        const filePath = `${user.id}/${Date.now()}.${fileExtension}`;

        const { error: uploadError } =
          await supabase.storage
            .from("payment-proofs")
            .upload(filePath, screenshot, {
              cacheControl: "3600",
              upsert: false,
              contentType: screenshot.type,
            });

        if (uploadError) {
          console.error(uploadError);

          throw new Error(
            "Unable to upload payment screenshot. Please try again."
          );
        }

        paymentProofPath = filePath;
      }

      /*
       * ========================================================
       * CREATE PENDING DEPOSIT REQUEST
       * ========================================================
       */

      const { data: depositRequest, error: insertError } =
        await supabase
          .from("deposit_requests")
          .insert({
            user_id: user.id,
            amount: numericAmount,
            payment_method: paymentMethod,
            transaction_id:
              transactionId.trim() || null,
            payment_proof: paymentProofPath,
            status: "pending",
          })
          .select("id")
          .single();

      if (insertError || !depositRequest) {
        console.error(insertError);

        /*
         * If database insertion fails after uploading
         * screenshot, delete the uploaded screenshot.
         */
        if (paymentProofPath) {
          await supabase.storage
            .from("payment-proofs")
            .remove([paymentProofPath]);
        }

        throw new Error(
          "Unable to submit your deposit request."
        );
      }

      /*
       * ========================================================
       * APPLY PROMO CODE
       * ========================================================
       *
       * Promo is attached to the pending deposit.
       *
       * The actual wallet credit + promo bonus happens
       * when the admin approves the deposit.
       */

      if (cleanPromoCode) {
        const { error: promoError } =
          await supabase.rpc(
            "apply_promo_code_to_deposit",
            {
              target_deposit_id: depositRequest.id,
              promo_code_input: cleanPromoCode,
            }
          );

        if (promoError) {
          console.error(promoError);

          /*
           * Remove the pending deposit if the promo
           * code could not be applied.
           */
          await supabase.rpc(
            "cancel_my_pending_deposit",
            {
              target_deposit_id: depositRequest.id,
            }
          );

          if (paymentProofPath) {
            await supabase.storage
              .from("payment-proofs")
              .remove([paymentProofPath]);
          }

          throw new Error(
            promoError.message ||
              "Unable to apply this promo code."
          );
        }
      }

      /*
       * ========================================================
       * RESET FORM
       * ========================================================
       */

      setAmount("");
      setTransactionId("");
      setScreenshot(null);
      setPromoCode("");

      /*
       * Success message
       */
      if (cleanPromoCode) {
        setSuccess(
          `Deposit request submitted successfully with promo code ${cleanPromoCode}. Your payment and promo bonus will be reviewed by the admin.`
        );
      } else {
        setSuccess(
          "Deposit request submitted successfully. Your payment will be reviewed by the admin."
        );
      }

      // Switch to the dedicated success interface after a successful submission.
      setSubmitted(true);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * UI
   * ============================================================
   */

  if (submitted) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
          <div className="w-full rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <CheckCircle2 size={42} />
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-green-600">
                Deposit Request
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
                Deposit Submitted Successfully
              </h1>

              <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                Your deposit request has been submitted successfully.
                An admin will review your payment and update your wallet
                after approval.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <div className="flex items-start gap-4 rounded-2xl border border-green-100 bg-green-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-black text-white">
                  1
                </div>
                <div>
                  <p className="font-bold text-slate-950">
                    Payment details submitted
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Your deposit request is now waiting for admin verification.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-950">
                    Admin verification
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    The admin will verify your transaction and payment proof.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-slate-950">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-950">
                    Wallet updated after approval
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Your wallet balance will be credited once the deposit is approved.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard/wallet"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
              >
                <ArrowLeft size={18} />
                Back to Wallet
              </Link>

              <button
                type="button"
                onClick={() => {
                  setSubmitted(false);
                  setSuccess("");
                  setError("");
                  setAmount("");
                  setTransactionId("");
                  setScreenshot(null);
                  setPromoCode("");
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-900 transition hover:border-slate-950 hover:bg-slate-50"
              >
                Submit Another Deposit
              </button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Please wait for admin approval before expecting the deposit to appear in your wallet balance.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">

        {/* =====================================================
            BACK
        ===================================================== */}

        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to Wallet
        </Link>

        {/* =====================================================
            PAGE GRID
        ===================================================== */}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">

          {/* ===================================================
              LEFT — DEPOSIT FORM
          =================================================== */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">

            {/* Header */}

            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                <ArrowDownToLine size={26} />
              </div>

              <div>
                <p className="text-sm font-black uppercase tracking-wider text-yellow-600">
                  Wallet
                </p>

                <h1 className="text-3xl font-black text-slate-950">
                  Add Money
                </h1>
              </div>
            </div>

            <p className="mt-5 text-sm leading-6 text-slate-500">
              Choose a payment method, complete your payment,
              then submit your transaction details for verification.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-6"
            >

              {/* =================================================
                  AMOUNT
              ================================================= */}

              <div>
                <label className="text-sm font-bold text-slate-950">
                  Deposit Amount
                </label>

                <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-950">
                  <span className="flex items-center border-r border-slate-200 px-4 font-bold text-slate-500">
                    NPR
                  </span>

                  <input
                    type="number"
                    min="50"
                    step="1"
                    value={amount}
                    onChange={(event) =>
                      setAmount(event.target.value)
                    }
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 outline-none"
                    required
                  />
                </div>

                <p className="mt-2 text-xs text-slate-400">
                  Minimum deposit: NPR 50
                </p>
              </div>

              {/* =================================================
                  QUICK AMOUNTS
              ================================================= */}

              <div>
                <p className="text-sm font-bold text-slate-950">
                  Quick Amount
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[50, 100, 500, 1000].map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setAmount(String(value))
                        }
                        className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                          amount === String(value)
                            ? "border-yellow-400 bg-yellow-50 text-slate-950"
                            : "border-slate-200 text-slate-700 hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                        }`}
                      >
                        NPR {value}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* =================================================
                  PAYMENT METHOD
              ================================================= */}

              <div>
                <label className="text-sm font-bold text-slate-950">
                  Payment Method
                </label>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {PAYMENT_METHODS.map((method) => {
                    const active =
                      paymentMethod === method;

                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() =>
                          handlePaymentMethodChange(method)
                        }
                        className={`rounded-2xl border p-4 text-left transition ${
                          active
                            ? "border-yellow-400 bg-yellow-50 shadow-sm"
                            : "border-slate-200 bg-white hover:border-yellow-300 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p
                              className={`text-sm font-black ${
                                active
                                  ? "text-slate-950"
                                  : "text-slate-700"
                              }`}
                            >
                              {method}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {method === "eSewa"
                                ? "QR Payment"
                                : method === "Khalti"
                                ? "QR Payment"
                                : "Account Payment"}
                            </p>
                          </div>

                          <span
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              active
                                ? "border-yellow-500 bg-yellow-400"
                                : "border-slate-300"
                            }`}
                          >
                            {active && (
                              <span className="h-2 w-2 rounded-full bg-slate-950" />
                            )}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* =================================================
                  PAYMENT QR
              ================================================= */}

              <div className="rounded-3xl border border-yellow-200 bg-yellow-50/60 p-5 sm:p-6">

                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-600">
                    Manual Payment
                  </p>

                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {selectedPayment.title}
                  </h2>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                    {selectedPayment.description}
                  </p>
                </div>

                {/* QR / Payment Image */}

                <div className="mt-5 flex justify-center">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
                    {!imageError ? (
                      <img
                        src={selectedPayment.image}
                        alt={selectedPayment.label}
                        className="h-64 w-64 object-contain sm:h-72 sm:w-72"
                        onError={() =>
                          setImageError(true)
                        }
                      />
                    ) : (
                      <div className="flex h-64 w-64 flex-col items-center justify-center p-6 text-center sm:h-72 sm:w-72">
                        <ImageIcon
                          size={40}
                          className="text-slate-300"
                        />

                        <p className="mt-4 text-sm font-bold text-slate-700">
                          Payment image not found
                        </p>

                        <p className="mt-2 text-xs leading-5 text-slate-400">
                          Check the image filename in
                          <br />
                          public/images/
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Image Path Helper */}

                <div className="mt-4 rounded-2xl bg-white p-3 text-center">
                  <p className="text-xs font-semibold text-slate-400">
                    {paymentMethod}
                  </p>
                </div>
              </div>

              {/* =================================================
                  TRANSACTION ID
              ================================================= */}

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-950">
                    Transaction ID
                  </label>

                  <span className="text-xs font-medium text-slate-400">
                    Optional
                  </span>
                </div>

                <input
                  type="text"
                  value={transactionId}
                  onChange={(event) =>
                    setTransactionId(event.target.value)
                  }
                  placeholder="Enter payment transaction ID"
                  className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-950"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Enter the transaction ID shown after completing
                  your payment.
                </p>
              </div>

              {/* =================================================
                  PAYMENT SCREENSHOT
              ================================================= */}

              <div>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-slate-950">
                    Payment Screenshot
                  </label>

                  <span className="text-xs font-medium text-slate-400">
                    Optional
                  </span>
                </div>

                {!screenshot ? (
                  <label className="mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center transition hover:border-yellow-400 hover:bg-yellow-50">

                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                      <Upload size={22} />
                    </div>

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      Upload payment screenshot
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      PNG, JPG, JPEG or WEBP • Maximum 5MB
                    </p>

                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleScreenshotChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                    <div className="flex items-center justify-between gap-4">

                      <div className="flex min-w-0 items-center gap-3">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-yellow-600 shadow-sm">
                          <ImageIcon size={21} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-950">
                            {screenshot.name}
                          </p>

                          <p className="text-xs text-slate-400">
                            {(
                              screenshot.size /
                              1024 /
                              1024
                            ).toFixed(2)}{" "}
                            MB
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={removeScreenshot}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-500 transition hover:bg-red-100 hover:text-red-600"
                        aria-label="Remove screenshot"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    <img
                      src={URL.createObjectURL(screenshot)}
                      alt="Payment screenshot preview"
                      className="mt-4 max-h-64 w-full rounded-xl bg-white object-contain"
                    />
                  </div>
                )}

                <p className="mt-2 text-xs text-slate-400">
                  Providing a screenshot helps the admin verify
                  your payment.
                </p>
              </div>

              {/* =================================================
                  PROMO CODE
              ================================================= */}

              <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-5">

                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                    <Gift size={20} />
                  </div>

                  <div>
                    <h3 className="font-black text-slate-950">
                      Have a Promo Code?
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Apply a valid promo code to receive an
                      eligible wallet bonus after your deposit
                      is approved.
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">

                  <input
                    type="text"
                    value={promoCode}
                    onChange={(event) =>
                      setPromoCode(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="Enter promo code"
                    className="w-full rounded-xl border border-yellow-200 bg-white px-4 py-3 text-sm font-bold uppercase tracking-wide outline-none transition focus:border-yellow-500"
                  />

                  {promoCode && (
                    <button
                      type="button"
                      onClick={() => setPromoCode("")}
                      className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 transition hover:border-red-300 hover:text-red-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* =================================================
                  SECURITY NOTICE
              ================================================= */}

              <div className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">

                <ShieldCheck
                  size={21}
                  className="mt-0.5 shrink-0 text-green-600"
                />

                <div>
                  <p className="text-sm font-bold text-slate-950">
                    Manual verification
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Your wallet balance will not be updated
                    immediately. An admin will verify your payment
                    before approving the deposit.
                  </p>
                </div>
              </div>

              {/* =================================================
                  SUCCESS
              ================================================= */}

              {success && (
                <div className="flex gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">

                  <CheckCircle2
                    size={21}
                    className="mt-0.5 shrink-0 text-green-600"
                  />

                  <p className="text-sm font-semibold leading-6 text-green-700">
                    {success}
                  </p>
                </div>
              )}

              {/* =================================================
                  ERROR
              ================================================= */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4">

                  <p className="text-sm font-semibold leading-6 text-red-700">
                    {error}
                  </p>
                </div>
              )}

              {/* =================================================
                  SUBMIT
              ================================================= */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CreditCard size={19} />

                {loading
                  ? "Submitting..."
                  : "Submit Deposit Request"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                By submitting, you confirm that the payment
                information provided is accurate.
              </p>
            </form>
          </div>

          {/* ===================================================
              RIGHT — PAYMENT INSTRUCTIONS
          =================================================== */}

          <div className="h-fit space-y-5">

            {/* Current Method */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
                  <CreditCard size={21} />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-yellow-600">
                    Selected Method
                  </p>

                  <h2 className="text-lg font-black text-slate-950">
                    {paymentMethod}
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-3">

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <span className="text-sm text-slate-500">
                    Minimum Deposit
                  </span>

                  <span className="font-black text-slate-950">
                    NPR 50
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <span className="text-sm text-slate-500">
                    Payment Type
                  </span>

                  <span className="font-black text-slate-950">
                    Manual
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                  <span className="text-sm text-slate-500">
                    Verification
                  </span>

                  <span className="font-black text-yellow-600">
                    Admin
                  </span>
                </div>

              </div>
            </div>

            {/* How To Pay */}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">
                <ShieldCheck
                  size={22}
                  className="text-green-600"
                />

                <h2 className="text-lg font-black text-slate-950">
                  How to Deposit
                </h2>
              </div>

              <div className="mt-6 space-y-5">

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                    1
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">
                      Choose payment method
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Select eSewa, Khalti or Bank Transfer.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                    2
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">
                      Complete payment
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Scan the displayed QR code and complete
                      your payment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                    3
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">
                      Submit proof
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Enter your transaction ID or upload your
                      payment screenshot.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-slate-950">
                    4
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">
                      Wait for approval
                    </p>

                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      Admin verifies the payment and your wallet
                      is credited after approval.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Important */}

            <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6">

              <div className="flex items-start gap-3">

                <ShieldCheck
                  size={22}
                  className="mt-0.5 shrink-0 text-yellow-700"
                />

                <div>
                  <p className="font-black text-slate-950">
                    Important
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Do not submit fake or incorrect payment
                    information. Deposits are manually verified
                    before your wallet balance is updated.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}