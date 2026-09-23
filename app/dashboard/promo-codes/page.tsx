"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Gift,
  Percent,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type PromoCode = {
  id: string;
  code: string;
  promo_type: "fixed" | "percentage";
  value: number;
  minimum_deposit: number;
  usage_limit: number | null;
  used_count: number;
  per_user_limit: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
};

type PromoUsage = {
  promo_code_id: string;
  created_at: string;
  bonus_amount: number;
};

export default function PromoCodesPage() {
  const supabase = createClient();

  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [usedPromos, setUsedPromos] = useState<
    PromoUsage[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [copiedCode, setCopiedCode] = useState("");

  useEffect(() => {
    loadPromoCodes();
  }, []);

  async function loadPromoCodes() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Please log in to view your promo codes.");
      setLoading(false);
      return;
    }

    const now = new Date().toISOString();

    const { data: promoData, error: promoError } =
      await supabase
        .from("promo_codes")
        .select("*")
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gte.${now}`)
        .order("created_at", {
          ascending: false,
        });

    if (promoError) {
      setError(promoError.message);
      setLoading(false);
      return;
    }

    const { data: usageData, error: usageError } =
      await supabase
        .from("promo_code_usages")
        .select(
          "promo_code_id, created_at, bonus_amount"
        )
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

    if (usageError) {
      setError(usageError.message);
      setLoading(false);
      return;
    }

    setPromos(promoData || []);
    setUsedPromos(usageData || []);
    setLoading(false);
  }

  function getUsageCount(promoId: string) {
    return usedPromos.filter(
      (usage) => usage.promo_code_id === promoId
    ).length;
  }

  function isUsedUp(promo: PromoCode) {
    return getUsageCount(promo.id) >= promo.per_user_limit;
  }

  function isGloballyUsedUp(promo: PromoCode) {
    return (
      promo.usage_limit !== null &&
      promo.used_count >= promo.usage_limit
    );
  }

  function formatBonus(promo: PromoCode) {
    if (promo.promo_type === "percentage") {
      return `${Number(promo.value)}% Bonus`;
    }

    return `NPR ${Number(
      promo.value
    ).toLocaleString()} Bonus`;
  }

  function formatExpiry(date: string | null) {
    if (!date) {
      return "No expiry";
    }

    return new Date(date).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);

      setCopiedCode(code);

      setTimeout(() => {
        setCopiedCode("");
      }, 2000);
    } catch {
      setError(
        "Unable to copy the promo code. Please copy it manually."
      );
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="font-semibold text-slate-500">
              Loading promotions...
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>

        {/* Header */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
              <Gift size={27} />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-wider text-yellow-600">
                Rewards & Offers
              </p>

              <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
                Promo Codes
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                Discover promotional offers available for your
                Play & Win account.
              </p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* Wallet CTA */}
        <div className="mt-6 flex flex-col gap-4 rounded-3xl border border-yellow-200 bg-yellow-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Wallet
              size={21}
              className="mt-0.5 shrink-0 text-yellow-700"
            />

            <div>
              <p className="font-black text-slate-950">
                Ready to use a promo code?
              </p>

              <p className="mt-1 text-sm text-slate-600">
                Add money to your wallet and apply an eligible
                promo code during your deposit.
              </p>
            </div>
          </div>

          <Link
            href="/dashboard/wallet/deposit"
            className="inline-flex shrink-0 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
          >
            Add Money
          </Link>
        </div>

        {/* Available Promotions */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Available Promotions
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Use these codes on eligible wallet deposits.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {promos.length}{" "}
              {promos.length === 1
                ? "Offer"
                : "Offers"}
            </span>
          </div>

          {promos.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <Gift size={24} />
              </div>

              <h3 className="mt-4 text-lg font-black text-slate-950">
                No promotions available
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Check back later for new Play & Win offers.
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {promos.map((promo) => {
                const alreadyUsed = isUsedUp(promo);
                const globallyUsedUp =
                  isGloballyUsedUp(promo);

                const unavailable =
                  alreadyUsed || globallyUsedUp;

                return (
                  <div
                    key={promo.id}
                    className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${
                      unavailable
                        ? "border-slate-200 opacity-70"
                        : "border-yellow-200"
                    }`}
                  >
                    {/* Top */}
                    <div className="border-b border-slate-100 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-lg bg-yellow-100 px-3 py-1 text-xs font-black uppercase tracking-wider text-yellow-700">
                              {promo.promo_type ===
                              "percentage"
                                ? "Percentage"
                                : "Wallet Bonus"}
                            </span>

                            {unavailable && (
                              <span className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-500">
                                Used
                              </span>
                            )}
                          </div>

                          <h3 className="mt-4 text-2xl font-black text-slate-950">
                            {promo.code}
                          </h3>

                          <p className="mt-1 text-lg font-black text-yellow-600">
                            {formatBonus(promo)}
                          </p>
                        </div>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-700">
                          {promo.promo_type ===
                          "percentage" ? (
                            <Percent size={21} />
                          ) : (
                            <Gift size={21} />
                          )}
                        </div>
                      </div>

                      {promo.description && (
                        <p className="mt-4 text-sm leading-6 text-slate-500">
                          {promo.description}
                        </p>
                      )}
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-px bg-slate-100">
                      <div className="bg-white p-4">
                        <p className="text-xs font-semibold text-slate-400">
                          Minimum Deposit
                        </p>

                        <p className="mt-1 font-black text-slate-950">
                          NPR{" "}
                          {Number(
                            promo.minimum_deposit
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="bg-white p-4">
                        <p className="text-xs font-semibold text-slate-400">
                          Your Usage
                        </p>

                        <p className="mt-1 font-black text-slate-950">
                          {getUsageCount(promo.id)} /{" "}
                          {promo.per_user_limit}
                        </p>
                      </div>

                      <div className="bg-white p-4">
                        <p className="text-xs font-semibold text-slate-400">
                          Total Usage
                        </p>

                        <p className="mt-1 font-black text-slate-950">
                          {promo.used_count} /{" "}
                          {promo.usage_limit ?? "∞"}
                        </p>
                      </div>

                      <div className="bg-white p-4">
                        <p className="text-xs font-semibold text-slate-400">
                          Expires
                        </p>

                        <p className="mt-1 font-black text-slate-950">
                          {formatExpiry(
                            promo.expires_at
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="p-5">
                      {unavailable ? (
                        <div className="flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-500">
                          <Check size={17} />
                          Already Used
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              copyCode(promo.code)
                            }
                            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          >
                            {copiedCode === promo.code ? (
                              <>
                                <Check size={17} />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={17} />
                                Copy Code
                              </>
                            )}
                          </button>

                          <Link
                            href="/dashboard/wallet/deposit"
                            className="flex flex-1 items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
                          >
                            Use Code
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-black text-slate-950">
            How Promo Codes Work
          </h2>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 font-black text-yellow-700">
                1
              </div>

              <h3 className="mt-3 font-black text-slate-950">
                Choose an Offer
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Select an active promotion available to your
                account.
              </p>
            </div>

            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 font-black text-yellow-700">
                2
              </div>

              <h3 className="mt-3 font-black text-slate-950">
                Add Money
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Make an eligible wallet deposit and enter your
                promo code.
              </p>
            </div>

            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-100 font-black text-yellow-700">
                3
              </div>

              <h3 className="mt-3 font-black text-slate-950">
                Receive Your Bonus
              </h3>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Once the deposit is approved, the promotional
                bonus is added to your wallet.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}