"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Gift,
  Users,
  Copy,
  Check,
  Sparkles,
  Trophy,
  Clock3,
  PlayCircle,
  Camera,
  Globe2,
  Music2,
  MessageCircle,
  Send,
  Share2,
  Link2,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { createClient } from "@/lib/supabase/client";

type RewardTask = {
  id: number;
  title: string;
  description: string;
  reward: number;
  icon: React.ReactNode;
  iconClass: string;
};

const rewardTasks: RewardTask[] = [
  {
    id: 1,
    title: "YouTube",
    description: "Subscribe to our official YouTube channel",
    reward: 10,
    icon: <PlayCircle size={22} />,
    iconClass: "bg-red-50 text-red-600",
  },
  {
    id: 2,
    title: "TikTok",
    description: "Follow our official TikTok channel",
    reward: 5,
    icon: <Music2 size={22} />,
    iconClass: "bg-slate-100 text-slate-900",
  },
  {
    id: 3,
    title: "Instagram",
    description: "Follow our official Instagram page",
    reward: 5,
    icon: <Camera size={22} />,
    iconClass: "bg-pink-50 text-pink-600",
  },
  {
    id: 4,
    title: "Facebook",
    description: "Follow our official Facebook page",
    reward: 5,
    icon: <Globe2 size={22} />,
    iconClass: "bg-blue-50 text-blue-600",
  },
  {
    id: 5,
    title: "Telegram",
    description: "Join our official Telegram channel",
    reward: 5,
    icon: <Send size={22} />,
    iconClass: "bg-sky-50 text-sky-600",
  },
  {
    id: 6,
    title: "WhatsApp",
    description: "Join our official WhatsApp channel",
    reward: 5,
    icon: <MessageCircle size={22} />,
    iconClass: "bg-emerald-50 text-emerald-600",
  },
];

export default function RewardsPage() {
  const [showSharePanel, setShowSharePanel] = useState(false);

  const [copied, setCopied] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Real referral code from Supabase
  const [referralCode, setReferralCode] = useState("");

  const [referralLoading, setReferralLoading] = useState(true);
  const [referralError, setReferralError] = useState(false);

  // Real referral count and earnings from Supabase
  const [referralCount, setReferralCount] = useState(0);
  const [referralEarnings, setReferralEarnings] = useState(0);
  const [referralCountLoading, setReferralCountLoading] = useState(true);

  // YouTube OAuth connection status
  const [youtubeConnected, setYoutubeConnected] = useState(false);
  const [youtubeConnecting, setYoutubeConnecting] = useState(false);
  const [youtubeMessage, setYoutubeMessage] = useState("");
  const [youtubeVerifying, setYoutubeVerifying] = useState(false);
  const [youtubeVerified, setYoutubeVerified] = useState(false);
  const [youtubeChannelOpened, setYoutubeChannelOpened] = useState(false);

  /*
   * =========================================================
   * LOAD CURRENT USER'S REFERRAL CODE + REFERRAL STATS
   * =========================================================
   */

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const youtubeStatus = params.get("youtube");

    if (youtubeStatus === "connected") {
      setYoutubeConnected(true);
      setYoutubeMessage("YouTube account connected successfully.");
    }

    if (youtubeStatus === "error") {
      setYoutubeConnected(false);
      setYoutubeMessage("YouTube connection failed. Please try again.");
    }
  }, []);

  const handleYouTubeTask = () => {
    if (youtubeConnected) {
      window.open(
        "https://youtube.com/@playandwinofficial2",
        "_blank",
        "noopener,noreferrer"
      );
      setYoutubeMessage(
        "YouTube is connected. Open our channel and make sure you are subscribed."
      );
      return;
    }

    setYoutubeConnecting(true);
    window.location.href = "/api/youtube";
  };

  useEffect(() => {
    async function loadReferralCode() {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User fetch error:", userError);

        setReferralError(true);
        setReferralLoading(false);
        setReferralCountLoading(false);

        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Referral code fetch error:", error);

        setReferralError(true);
        setReferralLoading(false);
        setReferralCountLoading(false);

        return;
      }

      setReferralCode(data?.referral_code || "");
      setReferralLoading(false);

      /*
       * =====================================================
       * LOAD APPROVED REFERRALS
       * =====================================================
       *
       * Only approved referrals are counted.
       *
       * Friends Invited:
       *     number of approved referral records
       *
       * Referral Earnings:
       *     sum of reward_amount from approved referrals
       *
       */

      const {
        data: referralRecords,
        error: referralCountError,
      } = await supabase
        .from("referrals")
        .select("id, reward_amount")
        .eq("referrer_id", user.id)
        .eq("status", "approved");

      if (referralCountError) {
        console.error(
          "Referral count fetch error:",
          referralCountError
        );

        setReferralCount(0);
        setReferralEarnings(0);
      } else {
        const records = referralRecords || [];

        // Number of approved referrals
        setReferralCount(records.length);

        // Total reward earned from approved referrals
        const totalEarnings = records.reduce(
          (total, referral) =>
            total + Number(referral.reward_amount || 0),
          0
        );

        setReferralEarnings(totalEarnings);
      }

      setReferralCountLoading(false);
    }

    loadReferralCode();
  }, []);

  /*
   * =========================================================
   * REFERRAL LINK
   * =========================================================
   *
   * We use the current website origin so this works both:
   *
   * localhost
   * and
   * your real production domain.
   *
   */

  const referralLink =
    typeof window !== "undefined" && referralCode
      ? `${window.location.origin}/sign-up?ref=${referralCode}`
      : "";

  const shareMessage =
    "🎮 Join me on Play & Win!\n\nCompete in gaming tournaments and win exciting rewards.\n\nJoin using my referral link:";

  /*
   * =========================================================
   * COPY REFERRAL LINK
   * =========================================================
   */

  const copyReferralLink = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);

      setCopied(true);

      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy referral link error:", error);
    }
  };

  /*
   * =========================================================
   * COPY REFERRAL CODE
   * =========================================================
   */

  const copyReferralCode = async () => {
    if (!referralCode) return;

    try {
      await navigator.clipboard.writeText(referralCode);

      setCodeCopied(true);

      setTimeout(() => {
        setCodeCopied(false);
      }, 2000);
    } catch (error) {
      console.error("Copy referral code error:", error);
    }
  };

  /*
   * =========================================================
   * SOCIAL SHARE
   * =========================================================
   */

  const shareTo = (platform: string) => {
    if (!referralLink) return;

    const encodedMessage = encodeURIComponent(
      `${shareMessage}\n${referralLink}`
    );

    const encodedLink = encodeURIComponent(referralLink);

    const urls: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${encodedMessage}`,

      telegram: `https://t.me/share/url?url=${encodedLink}&text=${encodeURIComponent(
        shareMessage
      )}`,

      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedLink}`,

      messenger: `https://www.facebook.com/dialog/send?link=${encodedLink}`,

      x: `https://twitter.com/intent/tweet?text=${encodedMessage}`,
    };

    const url = urls[platform];

    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  /*
   * =========================================================
   * NATIVE SHARE
   * =========================================================
   */

  const shareMore = async () => {
    if (!referralLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Play & Win",
          text: shareMessage,
          url: referralLink,
        });
      } catch (error) {
        console.log("Share cancelled:", error);
      }
    } else {
      await copyReferralLink();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* ===================================================== */}
      {/* HEADER                                                */}
      {/* ===================================================== */}

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-6 sm:py-16">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-500 transition hover:text-slate-950"
          >
            ← Back to Home
          </Link>

          <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
            Earn More
          </p>

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Rewards
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Complete simple tasks, invite your friends and earn rewards on
            Play & Win.
          </p>
        </div>
      </section>

      {/* ===================================================== */}
      {/* MAIN CONTENT                                          */}
      {/* ===================================================== */}

      <section className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl space-y-10 px-5 sm:px-6">
          {/* ================================================= */}
          {/* SUMMARY                                            */}
          {/* ================================================= */}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard
              title="Total Earned"
              value={
                referralCountLoading
                  ? "..."
                  : `NPR ${referralEarnings.toLocaleString("en-IN", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}`
              }
              icon={<Trophy size={20} />}
              iconClass="bg-yellow-50 text-yellow-600"
            />

            <SummaryCard
              title="Pending Rewards"
              value="NPR 0"
              icon={<Clock3 size={20} />}
              iconClass="bg-orange-50 text-orange-600"
            />

            <SummaryCard
              title="Completed Tasks"
              value="0"
              icon={<Check size={20} />}
              iconClass="bg-emerald-50 text-emerald-600"
            />
          </div>

          {/* ================================================= */}
          {/* EARN REWARDS                                      */}
          {/* ================================================= */}

          <section>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Complete Tasks
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                Earn Rewards
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Complete social tasks and earn rewards from Play & Win.
              </p>

              {youtubeMessage && (
                <div
                  className={`mt-4 rounded-xl border px-4 py-3 text-sm font-semibold ${
                    youtubeConnected
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {youtubeMessage}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {rewardTasks.map((task) => (
                <RewardCard
                  key={task.id}
                  task={task}
                  youtubeConnected={youtubeConnected}
                  youtubeConnecting={youtubeConnecting}
                  onYouTubeTask={handleYouTubeTask}
                />
              ))}
            </div>
          </section>

          {/* ================================================= */}
          {/* REFER & EARN                                      */}
          {/* ================================================= */}

          <section>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Invite Friends
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                Refer & Earn
              </h2>

              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                Invite your friends to Play & Win and earn rewards when they
                join.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                  {/* LEFT */}

                  <div className="max-w-xl">
                    <div className="flex items-center gap-4">
                      <div className="rounded-xl bg-yellow-50 p-3 text-yellow-600">
                        <Users size={24} />
                      </div>

                      <div>
                        <h3 className="text-xl font-black text-slate-950">
                          Invite your friends
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          Share your invite link and earn rewards.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowSharePanel(true)}
                      disabled={referralLoading || referralError}
                      className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 font-bold text-slate-950 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-6"
                    >
                      <Users size={18} />

                      {referralLoading
                        ? "Loading..."
                        : referralError
                          ? "Unavailable"
                          : "Invite Friends"}

                      {!referralLoading && !referralError && (
                        <ArrowRight size={17} />
                      )}
                    </button>
                  </div>

                  {/* RIGHT STATS */}

                  <div className="grid grid-cols-2 gap-3 lg:min-w-[300px]">
                    <ReferralStat
                      label="Friends Invited"
                      value={
                        referralCountLoading
                          ? "..."
                          : String(referralCount)
                      }
                    />

                    <ReferralStat
                      label="Referral Earnings"
                      value={
                        referralCountLoading
                          ? "..."
                          : `NPR ${referralEarnings.toLocaleString(
                              "en-IN",
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            )}`
                      }
                    />
                  </div>
                </div>

                <div className="mt-7 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
                  <Sparkles size={14} className="text-yellow-500" />

                  Invite friends and earn rewards when they successfully join.
                </div>
              </div>
            </div>
          </section>

          {/* ================================================= */}
          {/* REWARD HISTORY                                    */}
          {/* ================================================= */}

          <section>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-yellow-500">
                Your Activity
              </p>

              <h2 className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
                Reward History
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                View your completed reward activities.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50 text-yellow-600">
                <Gift size={24} />
              </div>

              <h3 className="mt-4 text-xl font-black text-slate-950">
                No rewards yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                Complete your first reward task and your reward history will
                appear here.
              </p>
            </div>
          </section>
        </div>
      </section>

      {/* ===================================================== */}
      {/* SHARE MODAL                                           */}
      {/* ===================================================== */}

      {showSharePanel && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-5"
          onClick={() => setShowSharePanel(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-black text-slate-950">
                  Share to
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Invite your friends to Play & Win
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowSharePanel(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-6">
              {/* SOCIAL SHARE */}

              <div>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                  Share via
                </p>

                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                  <ShareButton
                    label="WhatsApp"
                    icon={<MessageCircle size={21} />}
                    onClick={() => shareTo("whatsapp")}
                  />

                  <ShareButton
                    label="Telegram"
                    icon={<Send size={21} />}
                    onClick={() => shareTo("telegram")}
                  />

                  <ShareButton
                    label="Messenger"
                    icon={<MessageCircle size={21} />}
                    onClick={() => shareTo("messenger")}
                  />

                  <ShareButton
                    label="Facebook"
                    icon={<Globe2 size={21} />}
                    onClick={() => shareTo("facebook")}
                  />

                  <ShareButton
                    label="X"
                    icon={
                      <span className="text-lg font-black">
                        𝕏
                      </span>
                    }
                    onClick={() => shareTo("x")}
                  />

                  <ShareButton
                    label="More"
                    icon={<Share2 size={21} />}
                    onClick={shareMore}
                  />
                </div>
              </div>

              {/* REFERRAL LINK */}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-yellow-50 p-3 text-yellow-600">
                    <Link2 size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-400">
                      Referral Link
                    </p>

                    <p className="mt-1 truncate text-sm font-semibold text-slate-700">
                      {referralLoading
                        ? "Loading..."
                        : referralError
                          ? "Unable to load referral link"
                          : referralLink}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={copyReferralLink}
                    disabled={!referralLink}
                    className="shrink-0 rounded-xl bg-yellow-400 p-3 text-slate-950 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {copied ? (
                      <Check size={19} />
                    ) : (
                      <Copy size={19} />
                    )}
                  </button>
                </div>
              </div>

              {/* QR + REFERRAL CODE */}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* QR CODE */}

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="mb-3 text-xs font-bold text-slate-400">
                    Referral QR Code
                  </p>

                  <div className="flex items-center gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-2">
                      {referralCode ? (
                        <QRCodeSVG
                          value={referralLink}
                          size={70}
                          level="M"
                        />
                      ) : (
                        <div className="h-[70px] w-[70px] animate-pulse rounded bg-slate-100" />
                      )}
                    </div>

                    <p className="text-sm font-semibold text-slate-600">
                      Scan to join Play & Win
                    </p>
                  </div>
                </div>

                {/* REFERRAL CODE */}

                <div className="rounded-2xl border border-slate-200 p-4">
                  <p className="text-xs font-bold text-slate-400">
                    Referral Code
                  </p>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="font-mono text-lg font-black tracking-wider text-slate-950">
                      {referralLoading
                        ? "Loading..."
                        : referralError
                          ? "Unavailable"
                          : referralCode}
                    </p>

                    <button
                      type="button"
                      onClick={copyReferralCode}
                      disabled={!referralCode}
                      className="rounded-xl bg-yellow-400 p-3 text-slate-950 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {codeCopied ? (
                        <Check size={18} />
                      ) : (
                        <Copy size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* INFO */}

              <div className="flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-5 text-slate-400">
                <Sparkles
                  size={14}
                  className="mt-0.5 shrink-0 text-yellow-500"
                />

                Your referral code is unique to your Play & Win account.
                Referral tracking will be connected next.
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ========================================================= */
/* REWARD CARD                                                */
/* ========================================================= */

function YouTubeBrandIcon() {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-100">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect x="4" y="10" width="40" height="28" rx="8" fill="white" />
        <path d="M21 17L34 24L21 31V17Z" fill="#ef1d25" />
      </svg>
    </div>
  );
}

function TikTokBrandIcon() {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-[#101114] shadow-lg shadow-slate-200">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path
          d="M29 7c1.1 5.6 4.4 8.7 10 9.3v6.1c-3.8-.1-7-1.2-10-3.2v11.7c0 7-5.6 12.6-12.6 12.6S3.8 38 3.8 31s5.6-12.6 12.6-12.6c.8 0 1.5.1 2.2.2v6.8a6.1 6.1 0 1 0 3.7 5.6V7H29Z"
          fill="#25F4EE"
        />
        <path
          d="M27.2 8.4v22.1a7.6 7.6 0 1 1-8.6-7.5v4.2a3.7 3.7 0 1 0 5.8 3V8.4h2.8Z"
          fill="#FE2C55"
        />
        <path
          d="M29 7c1.1 5.6 4.4 8.7 10 9.3v3.1c-3.5-.2-6.5-1.2-9.2-3V7H29Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

function InstagramBrandIcon() {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-fuchsia-600 via-pink-500 to-orange-400 shadow-lg shadow-pink-100">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <rect x="7" y="7" width="34" height="34" rx="10" fill="none" stroke="white" strokeWidth="3" />
        <circle cx="24" cy="24" r="8" fill="none" stroke="white" strokeWidth="3" />
        <circle cx="34" cy="14" r="2.2" fill="white" />
      </svg>
    </div>
  );
}

function FacebookBrandIcon() {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-100">
      <svg viewBox="0 0 48 48" className="h-10 w-10" aria-hidden="true">
        <path
          d="M28 42V27h5l1-6h-6v-3.5c0-2 1-3.5 3.7-3.5H34V9.2c-1.3-.2-2.9-.4-4.8-.4-4.9 0-8.2 3-8.2 8.5V21h-5.5v6H21v15h7Z"
          fill="white"
        />
      </svg>
    </div>
  );
}

function TelegramBrandIcon() {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-sky-400 to-blue-600 shadow-lg shadow-sky-100">
      <Send className="h-9 w-9 text-white" strokeWidth={2.5} />
    </div>
  );
}

function WhatsAppBrandIcon() {
  return (
    <div className="flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-100">
      <MessageCircle className="h-9 w-9 text-white" strokeWidth={2.5} />
    </div>
  );
}

function RewardCard({
  task,
  youtubeConnected,
  youtubeConnecting,
  onYouTubeTask,
}: {
  task: RewardTask;
  youtubeConnected: boolean;
  youtubeConnecting: boolean;
  onYouTubeTask: () => void;
}) {
  const brandIcon =
    task.title === "YouTube" ? <YouTubeBrandIcon />
    : task.title === "TikTok" ? <TikTokBrandIcon />
    : task.title === "Instagram" ? <InstagramBrandIcon />
    : task.title === "Facebook" ? <FacebookBrandIcon />
    : task.title === "Telegram" ? <TelegramBrandIcon />
    : <WhatsAppBrandIcon />;

  const rewardColor =
    task.title === "YouTube" ? "border-red-100 bg-red-50 text-red-600"
    : task.title === "TikTok" ? "border-cyan-100 bg-cyan-50 text-slate-900"
    : task.title === "Instagram" ? "border-pink-100 bg-pink-50 text-pink-600"
    : task.title === "Facebook" ? "border-blue-100 bg-blue-50 text-blue-600"
    : task.title === "Telegram" ? "border-sky-100 bg-sky-50 text-sky-600"
    : "border-emerald-100 bg-emerald-50 text-emerald-600";

  const iconColor =
    task.title === "YouTube" ? "text-red-500"
    : task.title === "TikTok" ? "text-slate-900"
    : task.title === "Instagram" ? "text-pink-500"
    : task.title === "Facebook" ? "text-blue-600"
    : task.title === "Telegram" ? "text-sky-600"
    : "text-emerald-600";

  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_12px_35px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_20px_50px_rgba(15,23,42,0.11)] sm:p-6">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-400 to-amber-500" />

      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {brandIcon}

          <div>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              Social Task
            </span>

            <h3 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              {task.title}
            </h3>
          </div>
        </div>

        <span className={`shrink-0 rounded-full border px-3 py-2 text-xs font-black ${rewardColor}`}>
          + NPR {task.reward}
        </span>
      </div>

      <p className="mt-6 text-[15px] font-medium leading-6 text-slate-500">
        {task.description}
      </p>

      <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ${iconColor}`}>
            {task.icon}
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-800">
              Official Play &amp; Win reward
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              Complete the task to earn your reward
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={task.title === "YouTube" ? onYouTubeTask : undefined}
        disabled={task.title === "YouTube" && youtubeConnecting}
        className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-black text-slate-950 shadow-sm transition-all duration-200 active:translate-y-0 active:shadow-sm disabled:cursor-wait disabled:opacity-70 ${
          task.title === "YouTube" && youtubeConnected
            ? "bg-emerald-400 hover:-translate-y-0.5 hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-100"
            : "bg-yellow-400 hover:-translate-y-0.5 hover:bg-yellow-500 hover:shadow-lg hover:shadow-yellow-100"
        }`}
      >
        {task.title === "YouTube" ? (
          youtubeConnecting
            ? "Connecting YouTube..."
            : youtubeConnected
              ? "Open YouTube Channel"
              : "Connect YouTube"
        ) : (
          "Complete Task"
        )}
        <ArrowRight
          size={18}
          className="transition-transform duration-200 group-hover:translate-x-1"
        />
      </button>
    </article>
  );
}

/* ========================================================= */
/* SUMMARY CARD                                               */
/* ========================================================= */

function SummaryCard({
  title,
  value,
  icon,
  iconClass,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`rounded-xl p-3 ${iconClass}`}>
          {icon}
        </div>

        <span className="text-xs font-semibold text-slate-400">
          Rewards
        </span>
      </div>

      <p className="mt-5 text-sm font-medium text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
    </div>
  );
}

/* ========================================================= */
/* REFERRAL STAT                                              */
/* ========================================================= */

function ReferralStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

/* ========================================================= */
/* SHARE BUTTON                                               */
/* ========================================================= */

function ShareButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-slate-700 transition hover:border-yellow-400 hover:bg-yellow-50"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
        {icon}
      </span>

      <span className="text-[10px] font-bold">
        {label}
      </span>
    </button>
  );
}