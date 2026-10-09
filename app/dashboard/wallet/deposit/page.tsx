
"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
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
  Clock3,
  RefreshCw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PaymentMethod = "eSewa" | "Khalti" | "UPI" | "Bank Transfer";

const PAYMENT_METHODS: PaymentMethod[] = [
  "eSewa",
  "Khalti",
  "UPI",
  "Bank Transfer",
];

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
      "Open your eSewa app and scan the QR code to complete your payment.",
    image: "/payment/esewa-qr.png",
    label: "eSewa QR",
  },
  Khalti: {
    title: "Pay with Khalti",
    description:
      "Open your Khalti app and scan the QR code to complete your payment.",
    image: "/payment/khalti-qr.png",
    label: "Khalti QR",
  },
  "Bank Transfer": {
    title: "Bank Transfer",
    description:
      "Scan the bank details QR code and follow the instructions to transfer your payment.",
    image: "/payment/bank-qr.png",
    label: "Bank Details",
  },
  UPI: {
    title: "Pay with UPI",
    description:
      "Scan the UPI QR code or use the UPI ID shown below.",
    image: "/payment/upi.jpeg",
    label: "UPI QR",
  },
};

const COUNTDOWN_SECONDS = 7 * 60;

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

  const [paymentStep, setPaymentStep] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState(false);

  const selectedPayment = PAYMENT_DETAILS[paymentMethod];

  useEffect(() => {
    if (!paymentStep || paymentExpired || submitted) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setPaymentExpired(true);
          setError(
            "Your 7-minute payment session has expired. Return to the previous step to start a new session."
          );
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [paymentStep, paymentExpired, submitted]);

  const formattedTime = `${String(
    Math.floor(secondsLeft / 60)
  ).padStart(2, "0")}:${String(secondsLeft % 60).padStart(
    2,
    "0"
  )}`;

  function handleScreenshotChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");

    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please upload a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Screenshot must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    setScreenshot(file);
  }

  function removeScreenshot() {
    setScreenshot(null);
  }

  function handlePaymentMethodChange(method: PaymentMethod) {
    setPaymentMethod(method);
    setImageError(false);
    setError("");
  }

  function continueToPayment() {
    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 50) {
      setError("Minimum deposit amount is NPR 50.");
      return;
    }

    setPaymentStep(true);
    setPaymentExpired(false);
    setSecondsLeft(COUNTDOWN_SECONDS);
    setImageError(false);
    setCopied(false);
  }

  function returnToSelection() {
    setPaymentStep(false);
    setPaymentExpired(false);
    setSecondsLeft(COUNTDOWN_SECONDS);
    setError("");
    setSuccess("");
  }

  async function copyUpiId() {
    try {
      await navigator.clipboard.writeText("8959743905@pthdfc");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy the UPI ID. Please copy it manually.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount < 50) {
      setError("Minimum deposit amount is NPR 50.");
      return;
    }

    if (!paymentStep) {
      setError("Please continue to the payment screen first.");
      return;
    }

    if (paymentExpired || secondsLeft <= 0) {
      setError(
        "Your payment session has expired. Return to the previous step and start again."
      );
      return;
    }

    if (!screenshot) {
      setError("Payment screenshot is required to submit your deposit.");
      return;
    }

    if (screenshot.size > 5 * 1024 * 1024) {
      setError("Screenshot must be smaller than 5MB.");
      return;
    }

    const cleanPromoCode = promoCode.trim().toUpperCase();

    setLoading(true);

    let paymentProofPath: string | null = null;

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in to add money.");
      }

      const fileExtension =
        screenshot.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${user.id}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabase.storage
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

      const { data: depositRequest, error: insertError } = await supabase
        .from("deposit_requests")
        .insert({
          user_id: user.id,
          amount: numericAmount,
          payment_method: paymentMethod,
          transaction_id: transactionId.trim() || null,
          payment_proof: paymentProofPath,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !depositRequest) {
        console.error(insertError);

        await supabase.storage
          .from("payment-proofs")
          .remove([paymentProofPath]);

        paymentProofPath = null;

        throw new Error("Unable to submit your deposit request.");
      }

      if (cleanPromoCode) {
        const { error: promoError } = await supabase.rpc(
          "apply_promo_code_to_deposit",
          {
            target_deposit_id: depositRequest.id,
            promo_code_input: cleanPromoCode,
          }
        );

        if (promoError) {
          console.error(promoError);

          await supabase.rpc("cancel_my_pending_deposit", {
            target_deposit_id: depositRequest.id,
          });

          await supabase.storage
            .from("payment-proofs")
            .remove([paymentProofPath]);

          paymentProofPath = null;

          throw new Error(
            promoError.message || "Unable to apply this promo code."
          );
        }
      }

      setSuccess(
        cleanPromoCode
          ? `Your deposit request has been submitted with promo code ${cleanPromoCode}. Your payment and promo bonus will be reviewed by the admin.`
          : "Your deposit request has been submitted successfully. Your payment will be reviewed by the admin."
      );

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

  function resetForm() {
    setAmount("");
    setPaymentMethod("eSewa");
    setTransactionId("");
    setScreenshot(null);
    setPromoCode("");
    setError("");
    setSuccess("");
    setSubmitted(false);
    setPaymentStep(false);
    setPaymentExpired(false);
    setSecondsLeft(COUNTDOWN_SECONDS);
    setImageError(false);
    setCopied(false);
  }

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
                {success} Your wallet balance will be updated only after
                the admin approves your deposit.
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
                    Your deposit request is waiting for admin verification.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-black text-white">
                  2
                </div>
                <div>
                  <p className="font-bold text-slate-950">Admin verification</p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    The admin will verify your payment screenshot and
                    transaction details.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-yellow-100 bg-yellow-50 p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-sm font-black text-slate-950">
                  3
                </div>
                <div>
                  <p className="font-bold text-slate-950">
                    Wallet updated after approval
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    Your wallet will be credited once the deposit is approved.
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
                onClick={resetForm}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-900 transition hover:border-slate-950 hover:bg-slate-50"
              >
                Submit Another Deposit
              </button>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-400">
              Do not submit another request for the same payment. Wait for
              admin verification.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/dashboard/wallet"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to Wallet
        </Link>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_350px]">
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
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
              {paymentStep
                ? "Complete your payment, upload the payment screenshot, and submit your deposit for verification."
                : "Choose your deposit amount and payment method to continue to the secure payment instructions."}
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
              >
                {error}
              </div>
            )}

            {!paymentStep ? (
              <div className="mt-8 space-y-7">
                <div>
                  <label
                    htmlFor="deposit-amount"
                    className="text-sm font-bold text-slate-950"
                  >
                    Deposit Amount
                  </label>

                  <div className="mt-2 flex overflow-hidden rounded-xl border border-slate-200 bg-white focus-within:border-slate-950">
                    <span className="flex items-center border-r border-slate-200 px-4 font-bold text-slate-500">
                      NPR
                    </span>

                    <input
                      id="deposit-amount"
                      type="number"
                      min="50"
                      step="1"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                        setError("");
                      }}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 outline-none"
                      required
                    />
                  </div>

                  <p className="mt-2 text-xs text-slate-400">
                    Minimum deposit: NPR 50
                  </p>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-950">
                    Quick Amount
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[50, 100, 500, 1000].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setAmount(String(value));
                          setError("");
                        }}
                        className={`rounded-xl border px-3 py-3 text-sm font-bold transition ${
                          amount === String(value)
                            ? "border-yellow-400 bg-yellow-50 text-slate-950"
                            : "border-slate-200 text-slate-700 hover:border-slate-950 hover:bg-slate-950 hover:text-white"
                        }`}
                      >
                        NPR {value}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-950">
                    Choose Payment Method
                  </p>

                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {PAYMENT_METHODS.map((method) => {
                      const active = paymentMethod === method;

                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => handlePaymentMethodChange(method)}
                          className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${
                            active
                              ? "border-yellow-400 bg-yellow-50 ring-1 ring-yellow-400"
                              : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          <div
                            className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                              active
                                ? "bg-yellow-400 text-slate-950"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            <CreditCard size={21} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-slate-950">
                              {method}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {active ? "Selected" : "Choose this method"}
                            </p>
                          </div>

                          <span
                            className={`h-4 w-4 rounded-full border-4 ${
                              active
                                ? "border-yellow-500 bg-white"
                                : "border-slate-300"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-3">
                    <ShieldCheck
                      size={21}
                      className="mt-0.5 shrink-0 text-blue-700"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        Payment verification
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Your wallet will not be credited until an admin
                        verifies and approves your deposit request.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={continueToPayment}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950"
                >
                  Continue to Payment
                  <ArrowDownToLine size={18} />
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-8 space-y-7">
                <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Deposit amount
                    </p>
                    <p className="mt-1 text-2xl font-black text-slate-950">
                      NPR {Number(amount).toLocaleString("en-IN")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Payment method: {paymentMethod}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={returnToSelection}
                    disabled={loading}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-slate-950 disabled:opacity-50"
                  >
                    Change
                  </button>
                </div>

                {!paymentExpired ? (
                  <>
                    <div
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-4 ${
                        secondsLeft <= 60
                          ? "border-red-200 bg-red-50"
                          : "border-yellow-200 bg-yellow-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            secondsLeft <= 60
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          <Clock3 size={22} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-950">
                            Payment session
                          </p>
                          <p className="mt-1 text-xs text-slate-600">
                            Complete payment before the timer ends.
                          </p>
                        </div>
                      </div>

                      <p
                        className={`shrink-0 text-2xl font-black tabular-nums ${
                          secondsLeft <= 60 ? "text-red-700" : "text-slate-950"
                        }`}
                      >
                        {formattedTime}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-5 sm:p-6">
                      <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-wider text-yellow-700">
                          Payment Instructions
                        </p>
                        <h2 className="mt-2 text-xl font-black text-slate-950">
                          {selectedPayment.title}
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                          {selectedPayment.description}
                        </p>
                      </div>

                      {!imageError ? (
                        <div className="mx-auto mt-5 flex max-w-sm justify-center rounded-2xl border border-slate-200 bg-white p-3">
                          {/* Keep the existing QR image paths unchanged. */}
                          <img
                            src={selectedPayment.image}
                            alt={selectedPayment.label}
                            onError={() => setImageError(true)}
                            className="max-h-[320px] w-full max-w-[320px] rounded-xl object-contain"
                          />
                        </div>
                      ) : (
                        <div className="mx-auto mt-5 flex min-h-48 max-w-sm flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                          <ImageIcon
                            size={36}
                            className="text-slate-400"
                          />
                          <p className="mt-3 font-bold text-slate-800">
                            QR image could not be loaded
                          </p>
                          <p className="mt-2 text-xs leading-5 text-slate-500">
                            Check that this file exists at{" "}
                            <span className="font-semibold">
                              public{selectedPayment.image}
                            </span>
                          </p>
                        </div>
                      )}

                      {paymentMethod === "UPI" && (
                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            UPI ID
                          </p>

                          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                            <span className="break-all font-bold text-slate-950">
                              8959743905@pthdfc
                            </span>

                            <button
                              type="button"
                              onClick={copyUpiId}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-950"
                            >
                              <Copy size={14} />
                              {copied ? "Copied" : "Copy UPI ID"}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
                        <p className="text-sm font-bold text-slate-900">
                          Important
                        </p>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5 text-slate-600">
                          <li>
                            Pay the exact amount displayed above.
                          </li>
                          <li>
                            Save a clear screenshot of your successful payment.
                          </li>
                          <li>
                            Upload the screenshot below before submitting.
                          </li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="transaction-id"
                        className="text-sm font-bold text-slate-950"
                      >
                        Transaction ID{" "}
                        <span className="font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>

                      <input
                        id="transaction-id"
                        type="text"
                        value={transactionId}
                        onChange={(event) =>
                          setTransactionId(event.target.value)
                        }
                        placeholder="Enter your transaction ID, if available"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-slate-950"
                      />

                      <p className="mt-2 text-xs text-slate-400">
                        You can submit without a transaction ID, but the
                        payment screenshot is compulsory.
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="payment-screenshot"
                        className="text-sm font-bold text-slate-950"
                      >
                        Payment Screenshot{" "}
                        <span className="text-red-600">*</span>
                      </label>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        Upload a clear screenshot showing your completed
                        payment. Maximum file size: 5MB.
                      </p>

                      {!screenshot ? (
                        <label
                          htmlFor="payment-screenshot"
                          className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-yellow-400 hover:bg-yellow-50"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm">
                            <Upload size={23} />
                          </div>

                          <p className="mt-3 text-sm font-bold text-slate-900">
                            Upload payment screenshot
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            PNG, JPG, JPEG or another image format
                          </p>

                          <input
                            id="payment-screenshot"
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="sr-only"
                            required
                          />
                        </label>
                      ) : (
                        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 p-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-100 text-green-700">
                            <ImageIcon size={22} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-slate-900">
                              {screenshot.name}
                            </p>
                            <p className="mt-1 text-xs text-green-700">
                              Screenshot ready ·{" "}
                              {(screenshot.size / 1024).toFixed(0)} KB
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={removeScreenshot}
                            aria-label="Remove payment screenshot"
                            className="rounded-lg p-2 text-slate-500 hover:bg-white hover:text-red-600"
                          >
                            <X size={19} />
                          </button>

                          <input
                            id="payment-screenshot"
                            type="file"
                            accept="image/*"
                            onChange={handleScreenshotChange}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="promo-code"
                        className="flex items-center gap-2 text-sm font-bold text-slate-950"
                      >
                        <Gift size={17} className="text-yellow-600" />
                        Promo Code{" "}
                        <span className="font-normal text-slate-400">
                          (Optional)
                        </span>
                      </label>

                      <input
                        id="promo-code"
                        type="text"
                        value={promoCode}
                        onChange={(event) =>
                          setPromoCode(event.target.value.toUpperCase())
                        }
                        placeholder="Enter promo code"
                        className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 uppercase outline-none transition focus:border-slate-950"
                      />

                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        If entered, your promo code will be processed through
                        the existing deposit promo system.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading || paymentExpired || secondsLeft <= 0}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? (
                        <>
                          <RefreshCw size={18} className="animate-spin" />
                          Submitting Deposit...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          Submit Deposit for Verification
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
                    <Clock3
                      size={38}
                      className="mx-auto text-red-600"
                    />
                    <h2 className="mt-4 text-xl font-black text-slate-950">
                      Payment Session Expired
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      The website session has ended. Return to the previous
                      step to start another session before submitting.
                    </p>
                    <button
                      type="button"
                      onClick={returnToSelection}
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-yellow-400 hover:text-slate-950"
                    >
                      <RefreshCw size={17} />
                      Start Again
                    </button>
                  </div>
                )}
              </form>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                  <ShieldCheck size={23} />
                </div>
                <div>
                  <h2 className="font-black text-slate-950">
                    Safe Deposit Process
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Admin-verified payments
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-black text-yellow-800">
                    1
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Select amount
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Choose your deposit amount and payment method.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-black text-yellow-800">
                    2
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Complete payment
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Follow the displayed payment instructions and keep your
                      screenshot.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-100 text-xs font-black text-yellow-800">
                    3
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Upload proof
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Submit your screenshot for verification.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-black text-green-800">
                    4
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      Receive wallet credit
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Your balance is updated after admin approval.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-yellow-200 bg-yellow-50 p-6">
              <div className="flex items-center gap-3">
                <Clock3 size={22} className="text-yellow-800" />
                <h2 className="font-black text-slate-950">
                  Before You Submit
                </h2>
              </div>

              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <li>• Make sure the payment was completed.</li>
                <li>• Upload the correct payment screenshot.</li>
                <li>• Enter the transaction ID if available.</li>
                <li>• Do not submit duplicate requests for one payment.</li>
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <div className="flex items-center gap-3">
                <ShieldCheck size={22} className="text-green-700" />
                <h2 className="font-black text-slate-950">
                  Verification Notice
                </h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                A submitted request remains pending until the admin checks
                the payment proof. The website countdown does not deactivate
                a static QR code at the payment provider.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
