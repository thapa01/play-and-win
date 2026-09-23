"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import {
  Check,
  Edit3,
  Plus,
  Power,
  Trash2,
  X,
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
  created_at: string;
};

type PromoForm = {
  code: string;
  promo_type: "fixed" | "percentage";
  value: string;
  minimum_deposit: string;
  usage_limit: string;
  per_user_limit: string;
  starts_at: string;
  expires_at: string;
  description: string;
};

const emptyForm: PromoForm = {
  code: "",
  promo_type: "fixed",
  value: "",
  minimum_deposit: "0",
  usage_limit: "",
  per_user_limit: "1",
  starts_at: "",
  expires_at: "",
  description: "",
};

export default function AdminPromoCodesPage() {
  const supabase = createClient();

  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] =
    useState<PromoCode | null>(null);

  const [form, setForm] = useState<PromoForm>(emptyForm);

  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
      setError("You must be logged in.");
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      setError("You do not have permission to access this page.");
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("promo_codes")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setPromoCodes(data || []);
    }

    setLoading(false);
  }

  function openCreateModal() {
    setEditingPromo(null);
    setForm(emptyForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(promo: PromoCode) {
    setEditingPromo(promo);

    setForm({
      code: promo.code,
      promo_type: promo.promo_type,
      value: String(promo.value),
      minimum_deposit: String(promo.minimum_deposit),
      usage_limit:
        promo.usage_limit !== null
          ? String(promo.usage_limit)
          : "",
      per_user_limit: String(promo.per_user_limit),
      starts_at: promo.starts_at
        ? promo.starts_at.slice(0, 16)
        : "",
      expires_at: promo.expires_at
        ? promo.expires_at.slice(0, 16)
        : "",
      description: promo.description || "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingPromo(null);
    setForm(emptyForm);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const code = form.code.trim().toUpperCase();
    const value = Number(form.value);
    const minimumDeposit = Number(form.minimum_deposit);
    const perUserLimit = Number(form.per_user_limit);

    if (!code) {
      setError("Please enter a promo code.");
      return;
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setError(
        "Promo code can only contain letters, numbers, hyphens and underscores."
      );
      return;
    }

    if (!Number.isFinite(value) || value <= 0) {
      setError("Please enter a valid promo value.");
      return;
    }

    if (
      form.promo_type === "percentage" &&
      value > 100
    ) {
      setError("Percentage cannot be greater than 100.");
      return;
    }

    if (
      !Number.isFinite(minimumDeposit) ||
      minimumDeposit < 0
    ) {
      setError("Minimum deposit cannot be negative.");
      return;
    }

    if (
      !Number.isFinite(perUserLimit) ||
      perUserLimit < 1
    ) {
      setError("Per-user limit must be at least 1.");
      return;
    }

    const usageLimit =
      form.usage_limit.trim() === ""
        ? null
        : Number(form.usage_limit);

    if (
      usageLimit !== null &&
      (!Number.isFinite(usageLimit) || usageLimit < 1)
    ) {
      setError("Usage limit must be at least 1.");
      return;
    }

    if (
      form.starts_at &&
      form.expires_at &&
      new Date(form.starts_at) >= new Date(form.expires_at)
    ) {
      setError("Expiry date must be after the start date.");
      return;
    }

    setSaving(true);

    try {
      if (editingPromo) {
        const { error: updateError } = await supabase
          .from("promo_codes")
          .update({
            code,
            promo_type: form.promo_type,
            value,
            minimum_deposit: minimumDeposit,
            usage_limit: usageLimit,
            per_user_limit: perUserLimit,
            starts_at: form.starts_at
              ? new Date(form.starts_at).toISOString()
              : null,
            expires_at: form.expires_at
              ? new Date(form.expires_at).toISOString()
              : null,
            description:
              form.description.trim() || null,
          })
          .eq("id", editingPromo.id);

        if (updateError) {
          throw updateError;
        }

        setSuccess("Promo code updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("promo_codes")
          .insert({
            code,
            promo_type: form.promo_type,
            value,
            minimum_deposit: minimumDeposit,
            usage_limit: usageLimit,
            per_user_limit: perUserLimit,
            starts_at: form.starts_at
              ? new Date(form.starts_at).toISOString()
              : null,
            expires_at: form.expires_at
              ? new Date(form.expires_at).toISOString()
              : null,
            description:
              form.description.trim() || null,
          });

        if (insertError) {
          if (insertError.code === "23505") {
            throw new Error(
              "This promo code already exists."
            );
          }

          throw insertError;
        }

        setSuccess("Promo code created successfully.");
      }

      await loadPromoCodes();

      setTimeout(() => {
        setShowModal(false);
        setEditingPromo(null);
        setForm(emptyForm);
        setSuccess("");
      }, 700);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePromo(promo: PromoCode) {
    setActionId(promo.id);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase
      .from("promo_codes")
      .update({
        is_active: !promo.is_active,
      })
      .eq("id", promo.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(
        promo.is_active
          ? "Promo code deactivated."
          : "Promo code activated."
      );

      await loadPromoCodes();
    }

    setActionId(null);
  }

  async function deletePromo(promo: PromoCode) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${promo.code}"?`
    );

    if (!confirmed) return;

    setActionId(promo.id);
    setError("");
    setSuccess("");

    const { error: deleteError } = await supabase
      .from("promo_codes")
      .delete()
      .eq("id", promo.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setSuccess("Promo code deleted successfully.");
      await loadPromoCodes();
    }

    setActionId(null);
  }

  function formatDate(date: string | null) {
    if (!date) return "No limit";

    return new Date(date).toLocaleDateString("en-NP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatValue(promo: PromoCode) {
    if (promo.promo_type === "percentage") {
      return `${Number(promo.value)}%`;
    }

    return `NPR ${Number(
      promo.value
    ).toLocaleString()}`;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <Link
  href="/admin"
  className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950"
>
  <ArrowLeft size={16} />
  Back to Admin
</Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
        
            <p className="text-sm font-black uppercase tracking-wider text-yellow-600">
              Promotions
            </p>

            <h1 className="mt-1 text-3xl font-black text-slate-950">
              Promo Codes
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Create and manage promotional wallet bonuses.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
          >
            <Plus size={18} />
            Create Promo Code
          </button>
        </div>

        {/* Messages */}
        {success && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
            <Check size={18} />
            {success}
          </div>
        )}

        {error && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
            <X size={18} />
            {error}
          </div>
        )}

        {/* Content */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-10 text-center">
              <p className="font-semibold text-slate-500">
                Loading promo codes...
              </p>
            </div>
          ) : promoCodes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-700">
                <Plus size={24} />
              </div>

              <h2 className="mt-4 text-xl font-black text-slate-950">
                No promo codes yet
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Create your first promo code to start offering
                wallet bonuses.
              </p>

              <button
                onClick={openCreateModal}
                className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950"
              >
                Create First Promo Code
              </button>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Code
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Bonus
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Min Deposit
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Usage
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Validity
                      </th>

                      <th className="px-6 py-4 text-xs font-black uppercase tracking-wider text-slate-500">
                        Status
                      </th>

                      <th className="px-6 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {promoCodes.map((promo) => (
                      <tr
                        key={promo.id}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-5">
                          <div>
                            <p className="font-black text-slate-950">
                              {promo.code}
                            </p>

                            {promo.description && (
                              <p className="mt-1 max-w-xs text-xs text-slate-500">
                                {promo.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-black text-slate-950">
                            {formatValue(promo)}
                          </p>

                          <p className="text-xs capitalize text-slate-400">
                            {promo.promo_type}
                          </p>
                        </td>

                        <td className="px-6 py-5 font-semibold text-slate-700">
                          NPR{" "}
                          {Number(
                            promo.minimum_deposit
                          ).toLocaleString()}
                        </td>

                        <td className="px-6 py-5">
                          <p className="font-bold text-slate-950">
                            {promo.used_count}
                            {" / "}
                            {promo.usage_limit ?? "∞"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {promo.per_user_limit} per user
                          </p>
                        </td>

                        <td className="px-6 py-5 text-sm text-slate-600">
                          <p>
                            {formatDate(promo.starts_at)}
                          </p>

                          <p className="mt-1">
                            → {formatDate(promo.expires_at)}
                          </p>
                        </td>

                        <td className="px-6 py-5">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${
                              promo.is_active
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {promo.is_active
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        <td className="px-6 py-5">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                openEditModal(promo)
                              }
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                              title="Edit"
                            >
                              <Edit3 size={16} />
                            </button>

                            <button
                              onClick={() =>
                                togglePromo(promo)
                              }
                              disabled={
                                actionId === promo.id
                              }
                              className={`rounded-lg border p-2 transition ${
                                promo.is_active
                                  ? "border-yellow-200 text-yellow-700 hover:bg-yellow-50"
                                  : "border-green-200 text-green-700 hover:bg-green-50"
                              } disabled:opacity-50`}
                              title={
                                promo.is_active
                                  ? "Deactivate"
                                  : "Activate"
                              }
                            >
                              <Power size={16} />
                            </button>

                            <button
                              onClick={() =>
                                deletePromo(promo)
                              }
                              disabled={
                                actionId === promo.id
                              }
                              className="rounded-lg border border-red-200 p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="divide-y divide-slate-100 md:hidden">
                {promoCodes.map((promo) => (
                  <div key={promo.id} className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-black text-slate-950">
                          {promo.code}
                        </p>

                        <p className="mt-1 text-lg font-black text-yellow-600">
                          {formatValue(promo)}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          promo.is_active
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {promo.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </div>

                    {promo.description && (
                      <p className="mt-3 text-sm text-slate-500">
                        {promo.description}
                      </p>
                    )}

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Min Deposit
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          NPR{" "}
                          {Number(
                            promo.minimum_deposit
                          ).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Usage
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {promo.used_count}
                          {" / "}
                          {promo.usage_limit ?? "∞"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Per User
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {promo.per_user_limit}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs text-slate-400">
                          Expires
                        </p>

                        <p className="mt-1 font-bold text-slate-950">
                          {formatDate(promo.expires_at)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() =>
                          openEditModal(promo)
                        }
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-700"
                      >
                        <Edit3 size={16} />
                        Edit
                      </button>

                      <button
                        onClick={() =>
                          togglePromo(promo)
                        }
                        disabled={actionId === promo.id}
                        className="rounded-xl border border-yellow-200 px-4 py-2.5 text-yellow-700 disabled:opacity-50"
                      >
                        <Power size={16} />
                      </button>

                      <button
                        onClick={() =>
                          deletePromo(promo)
                        }
                        disabled={actionId === promo.id}
                        className="rounded-xl border border-red-200 px-4 py-2.5 text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5 sm:px-8">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  {editingPromo
                    ? "Edit Promo Code"
                    : "Create Promo Code"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Configure the promotional offer.
                </p>
              </div>

              <button
                onClick={closeModal}
                disabled={saving}
                className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-950 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6 sm:p-8"
            >
              {/* Code */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Promo Code
                </label>

                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      code: e.target.value
                        .toUpperCase()
                        .replace(/\s/g, ""),
                    })
                  }
                  placeholder="WELCOME50"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 font-bold uppercase outline-none transition focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  disabled={saving}
                />
              </div>

              {/* Type + Value */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Promo Type
                  </label>

                  <select
                    value={form.promo_type}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        promo_type: e.target.value as
                          | "fixed"
                          | "percentage",
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    disabled={saving}
                  >
                    <option value="fixed">
                      Fixed Amount
                    </option>

                    <option value="percentage">
                      Percentage
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    {form.promo_type === "fixed"
                      ? "Bonus Amount (NPR)"
                      : "Bonus Percentage (%)"}
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.value}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        value: e.target.value,
                      })
                    }
                    placeholder={
                      form.promo_type === "fixed"
                        ? "50"
                        : "10"
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Minimum Deposit */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Minimum Deposit (NPR)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.minimum_deposit}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minimum_deposit: e.target.value,
                    })
                  }
                  placeholder="200"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  disabled={saving}
                />

                <p className="mt-1 text-xs text-slate-400">
                  Set 0 if there is no minimum deposit.
                </p>
              </div>

              {/* Usage */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Total Usage Limit
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.usage_limit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        usage_limit: e.target.value,
                      })
                    }
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    disabled={saving}
                  />

                  <p className="mt-1 text-xs text-slate-400">
                    Leave empty for unlimited.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Per User Limit
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={form.per_user_limit}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        per_user_limit: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Start Date
                  </label>

                  <input
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        starts_at: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    Expiry Date
                  </label>

                  <input
                    type="datetime-local"
                    value={form.expires_at}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        expires_at: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                    disabled={saving}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Description
                </label>

                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      description: e.target.value,
                    })
                  }
                  placeholder="Get NPR 50 bonus on your first deposit."
                  className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                  disabled={saving}
                />
              </div>

              {/* Error inside modal */}
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 px-5 py-3 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingPromo
                    ? "Update Promo Code"
                    : "Create Promo Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}