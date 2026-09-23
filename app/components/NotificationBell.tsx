"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  CheckCheck,
  Gamepad2,
  Trophy,
  Wallet,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type Notification = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  reference_id: string | null;
  created_at: string;
};

type TournamentInvite = {
  id: string;
  status: "pending" | "accepted" | "rejected" | "cancelled";
};

function getNotificationIcon(type: string) {
  switch (type) {
    case "tournament":
    case "registration":
    case "result":
    case "prize":
      return <Trophy size={17} />;

    case "game_access":
      return <Gamepad2 size={17} />;

    case "payment":
    case "wallet":
      return <Wallet size={17} />;

    default:
      return <Bell size={17} />;
  }
}

function formatNotificationTime(date: string) {
  const created = new Date(date);
  const now = new Date();

  const difference = now.getTime() - created.getTime();

  const seconds = Math.floor(difference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) {
    return "Just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  if (hours < 24) {
    return `${hours}h ago`;
  }

  if (days < 7) {
    return `${days}d ago`;
  }

  return created.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

export default function NotificationBell() {
  const supabase = createClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tournamentInvites, setTournamentInvites] = useState<
    Record<string, TournamentInvite>
  >({});
  const [respondingInviteId, setRespondingInviteId] = useState<string | null>(
    null
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  async function loadNotifications(currentUserId: string) {
    const { data, error } = await supabase
      .from("notifications")
      .select(
        `
          id,
          user_id,
          title,
          message,
          type,
          is_read,
          reference_id,
          created_at
        `
      )
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Error loading notifications:", error);
      setLoading(false);
      return;
    }

    const loadedNotifications = (data || []) as Notification[];

    setNotifications(loadedNotifications);

    const inviteIds = loadedNotifications
      .filter(
        (notification) =>
          notification.type === "tournament" &&
          Boolean(notification.reference_id)
      )
      .map((notification) => notification.reference_id as string);

    if (inviteIds.length > 0) {
      const { data: inviteRows } = await supabase
        .from("tournament_team_invites")
        .select("id, status")
        .in("id", inviteIds);

      const inviteMap: Record<string, TournamentInvite> = {};

      (inviteRows || []).forEach((invite) => {
        inviteMap[invite.id] = invite as TournamentInvite;
      });

      setTournamentInvites(inviteMap);
    } else {
      setTournamentInvites({});
    }

    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!user) {
        setUserId(null);
        setNotifications([]);
        setTournamentInvites({});
        setLoading(false);
        return;
      }

      setUserId(user.id);

      await loadNotifications(user.id);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          setNotifications((current) => [
            newNotification,
            ...current,
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAsRead(notificationId: string) {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, is_read: true }
          : notification
      )
    );
  }

  async function markAllAsRead() {
    if (!userId || unreadCount === 0) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      console.error("Error marking all notifications as read:", error);
      return;
    }

    setNotifications((current) =>
      current.map((notification) => ({
        ...notification,
        is_read: true,
      }))
    );
  }

  async function respondToTournamentInvite(
    inviteId: string,
    accept: boolean,
    notificationId: string
  ) {
    if (!userId) return;

    setRespondingInviteId(inviteId);

    try {
      const { data, error } = await supabase.rpc(
        "respond_to_tournament_team_invite",
        {
          target_invite_id: inviteId,
          accept_invitation: accept,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      setTournamentInvites((current) => ({
        ...current,
        [inviteId]: {
          id: inviteId,
          status: accept ? "accepted" : "rejected",
        },
      }));

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
                title: accept
                  ? "Duo Invitation Accepted"
                  : "Duo Invitation Declined",
                message: accept
                  ? "You accepted the tournament team invitation."
                  : "You declined the tournament team invitation.",
              }
            : notification
        )
      );

      if (data) {
        // The RPC returns the tournament team id. Keep the response
        // intentionally local because the captain is notified by the RPC.
      }
    } catch (err) {
      console.error("Error responding to tournament invitation:", err);
    } finally {
      setRespondingInviteId(null);
    }
  }


  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }

    if (notification.reference_id) {
      setOpen(false);
    }
  }

  if (!userId) {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Bell Button */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
      >
        <Bell size={19} />

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white shadow-sm">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="fixed left-3 right-3 top-20 z-[100] max-h-[calc(100vh-96px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:absolute sm:left-auto sm:right-0 sm:top-12 sm:w-[360px] sm:max-h-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <div>
              <h3 className="text-sm font-black text-slate-950">
                Notifications
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {unreadCount > 0
                  ? `${unreadCount} unread notification${
                      unreadCount === 1 ? "" : "s"
                    }`
                  : "You're all caught up"}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  <CheckCheck size={17} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-950"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="max-h-[420px] overflow-y-auto">
            {loading ? (
              <div className="space-y-3 p-4">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="animate-pulse rounded-xl bg-slate-50 p-4"
                  >
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-full rounded bg-slate-200" />
                    <div className="mt-1 h-3 w-2/3 rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <Bell size={21} />
                </div>

                <h4 className="mt-4 text-sm font-bold text-slate-900">
                  No notifications
                </h4>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  You'll see tournament, wallet and game updates here.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`relative border-b border-slate-100 px-4 py-4 transition hover:bg-slate-50 ${
                    !notification.is_read ? "bg-yellow-50/60" : "bg-white"
                  }`}
                >
                  {!notification.is_read && (
                    <span className="absolute left-2 top-5 h-2 w-2 rounded-full bg-yellow-500" />
                  )}

                  <div className="flex gap-3 pl-1">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                        !notification.is_read
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h4
                          className={`text-sm ${
                            !notification.is_read
                              ? "font-black text-slate-950"
                              : "font-bold text-slate-700"
                          }`}
                        >
                          {notification.title}
                        </h4>

                        {!notification.is_read && (
                          <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-yellow-600">
                            New
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {notification.message}
                      </p>

                      {notification.type === "tournament" &&
                        notification.reference_id &&
                        tournamentInvites[notification.reference_id] && (
                          <div className="mt-3">
                            {tournamentInvites[notification.reference_id]
                              .status === "pending" ? (
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    respondToTournamentInvite(
                                      notification.reference_id as string,
                                      true,
                                      notification.id
                                    );
                                  }}
                                  disabled={respondingInviteId !== null}
                                  className="flex-1 rounded-lg bg-slate-950 px-3 py-2.5 text-xs font-black text-white transition hover:bg-yellow-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {respondingInviteId ===
                                  notification.reference_id ? (
                                    <span className="inline-flex items-center gap-2">
                                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                      Processing...
                                    </span>
                                  ) : (
                                    "Accept"
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    respondToTournamentInvite(
                                      notification.reference_id as string,
                                      false,
                                      notification.id
                                    );
                                  }}
                                  disabled={respondingInviteId !== null}
                                  className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-black text-slate-600 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span
                                className={`inline-flex rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-wide ${
                                  tournamentInvites[notification.reference_id]
                                    .status === "accepted"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-500"
                                }`}
                              >
                                {tournamentInvites[notification.reference_id]
                                  .status === "accepted"
                                  ? "Accepted"
                                  : tournamentInvites[
                                        notification.reference_id
                                    ].status === "rejected"
                                  ? "Declined"
                                  : "Invitation Cancelled"}
                              </span>
                            )}
                          </div>
                        )}

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[10px] font-medium text-slate-400">
                          {formatNotificationTime(notification.created_at)}
                        </span>

                        {!notification.is_read && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="flex items-center gap-1 text-[10px] font-bold text-slate-500 hover:text-slate-950"
                          >
                            <Check size={13} />
                            Mark read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block text-center text-xs font-bold text-slate-600 transition hover:text-slate-950"
            >
              Open Dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}