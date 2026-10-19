"use client";

import {
  getChatAssignableUsersAction,
  getChatConversationAction,
  getChatCustomerOrdersAction,
  getChatInboxAction,
  getChatPushConfigAction,
  getChatRealtimeTokenAction,
  getChatSettingsAction,
  removeChatPushSubscriptionAction,
  saveChatPushSubscriptionAction,
  searchChatProductsAction,
  sendChatPushTestAction,
  sendChatReplyAction,
  updateChatConversationAction,
} from "@/backend/serverActions/chatActions";
import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  Globe2,
  MessageCircle,
  MessagesSquare,
  Package,
  RotateCw,
  Search,
  Send,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const channelLabels = {
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
};
const statusLabels = { OPEN: "Open", PENDING: "Pending", CLOSED: "Closed" };
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("bn-BD", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(value))
    : "";

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const raw = window.atob(
    (value + padding).replace(/-/g, "+").replace(/_/g, "/"),
  );
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

function subscriptionUsesVapidKey(subscription, publicKey) {
  const currentKey = subscription?.options?.applicationServerKey;
  if (!currentKey || !publicKey) return false;
  const expected = urlBase64ToUint8Array(publicKey);
  const current = new Uint8Array(currentKey);
  return (
    current.length === expected.length &&
    current.every((byte, index) => byte === expected[index])
  );
}

export default function AdminChatInbox({
  initialConversations,
  canUpdate,
  initialError = "",
}) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("conversation") ||
        initialConversations[0]?.id ||
        ""
      : initialConversations[0]?.id || "",
  );
  const [conversation, setConversation] = useState(null);
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState(() =>
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("conversation")
      ? "ALL"
      : "OPEN",
  );
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const [agents, setAgents] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [productPanel, setProductPanel] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [pushReady, setPushReady] = useState(false);
  const [pushTestBusy, setPushTestBusy] = useState(false);
  const selectedIdRef = useRef(selectedId);
  const knownInboxRef = useRef(null);
  selectedIdRef.current = selectedId;

  const loadInbox = useCallback(async () => {
    const result = await getChatInboxAction({ channel, status });
    if (!result.success) {
      setError(result.message);
      return;
    }
    setConversations(result.data);
    setSelectedId((current) =>
      current && result.data.some((item) => item.id === current)
        ? current
        : result.data[0]?.id || "",
    );
    setError("");
  }, [channel, status]);

  const loadConversation = useCallback(async () => {
    if (!selectedId) {
      setConversation(null);
      return;
    }
    const result = await getChatConversationAction(selectedId);
    if (result.success) setConversation(result.data);
    else setError(result.message);
  }, [selectedId]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);
  useEffect(() => {
    loadConversation();
  }, [loadConversation]);
  useEffect(() => {
    let stopped = false;
    let socket = null;
    let reconnectTimer = null;
    let fallbackTimer = null;
    let reconnectDelay = 1000;
    let refreshTimer = null;

    const refreshRealtimeData = () => {
      if (refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        loadInbox();
        loadConversation();
      }, 100);
    };

    const connect = async () => {
      const authResult = await getChatRealtimeTokenAction();
      if (stopped) return;
      if (!authResult.success || !authResult.token) {
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
        return;
      }
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(
        `${protocol}//${window.location.host}/api/chat/socket`,
      );
      socket.addEventListener("open", () =>
        socket?.send(JSON.stringify({ type: "auth", token: authResult.token })),
      );
      socket.addEventListener("message", (event) => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        if (data.event === "realtime:connected") {
          reconnectDelay = 1000;
          refreshRealtimeData();
        }
        if (data.event === "chat.message") refreshRealtimeData();
      });
      socket.addEventListener("close", () => {
        if (stopped) return;
        reconnectTimer = window.setTimeout(connect, reconnectDelay);
        reconnectDelay = Math.min(reconnectDelay * 2, 15000);
      });
      socket.addEventListener("error", () => socket?.close());
    };

    connect();
    fallbackTimer = window.setInterval(() => {
      if (
        document.visibilityState === "visible" &&
        socket?.readyState !== WebSocket.OPEN
      )
        refreshRealtimeData();
    }, 15000);
    return () => {
      stopped = true;
      clearTimeout(reconnectTimer);
      clearTimeout(refreshTimer);
      clearInterval(fallbackTimer);
      socket?.close();
    };
  }, [loadInbox, loadConversation]);
  useEffect(() => {
    getChatAssignableUsersAction().then((result) => {
      if (result.success) setAgents(result.data);
    });
  }, []);
  useEffect(() => {
    getChatSettingsAction().then((result) => {
      if (result.success) setQuickReplies(result.data.quickReplies || []);
    });
  }, []);
  useEffect(() => {
    if (!selectedId) {
      setOrderSummary(null);
      return;
    }
    const refreshOrders = () =>
      getChatCustomerOrdersAction(selectedId).then((result) => {
        if (result.success) setOrderSummary(result.data);
      });
    refreshOrders();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") refreshOrders();
    }, 15000);
    return () => window.clearInterval(timer);
  }, [selectedId]);
  useEffect(() => {
    if (!productPanel || productQuery.trim().length < 2) {
      setProducts([]);
      return;
    }
    const timer = window.setTimeout(
      () =>
        searchChatProductsAction(productQuery).then((result) =>
          setProducts(result.success ? result.data : []),
        ),
      250,
    );
    return () => window.clearTimeout(timer);
  }, [productPanel, productQuery]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        loadInbox();
        loadConversation();
      }
    }, 15000);
    return () => window.clearInterval(timer);
  }, [loadInbox, loadConversation]);
  useEffect(() => {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setNotificationPermission("unsupported");
      return;
    }
    setNotificationPermission(Notification.permission);
    let active = true;
    const restoreSubscription = async () => {
      try {
        if (Notification.permission !== "granted") return;
        const config = await getChatPushConfigAction();
        if (!active || !config.success || !config.publicKey) return;
        const registration = await navigator.serviceWorker.register(
          "/service-worker.js",
          { scope: "/" },
        );
        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;
        if (!subscriptionUsesVapidKey(subscription, config.publicKey)) {
          await removeChatPushSubscriptionAction(subscription.endpoint);
          await subscription.unsubscribe();
          subscription = null;
        }
        if (subscription) {
          const saved = await saveChatPushSubscriptionAction(
            subscription.toJSON(),
          );
          if (active && saved.success) setPushReady(true);
        }
      } catch {
        /* The admin can enable push manually from the button. */
      }
    };
    restoreSubscription();
    const checkInbox = async () => {
      const result = await getChatInboxAction({
        channel: "ALL",
        status: "ALL",
      });
      if (!active || !result.success) return;
      const current = new Map(
        result.data.map((item) => {
          const latest = item.messages?.[0];
          const latestAt = latest?.createdAt || item.lastMessageAt;
          return [
            item.id,
            {
              createdAt: latestAt ? new Date(latestAt).getTime() : 0,
              direction: latest?.direction,
              content: latest?.content,
              customerName: item.customerName,
              customerPhone: item.customerPhone,
              channel: item.channel,
            },
          ];
        }),
      );
      const previous = knownInboxRef.current;
      if (
        previous &&
        Notification.permission === "granted" &&
        document.hasFocus()
      ) {
        for (const [conversationId, latest] of current) {
          const old = previous.get(conversationId);
          if (
            latest.direction !== "INBOUND" ||
            (old &&
              latest.createdAt === old.createdAt &&
              latest.content === old.content) ||
            selectedIdRef.current === conversationId
          )
            continue;
          const notification = new Notification(
            latest.customerName ||
              latest.customerPhone ||
              `${channelLabels[latest.channel]} · নতুন message`,
            {
              body: latest.content || "নতুন customer message এসেছে।",
              icon: "/favicon.ico",
              tag: `admin-chat-${conversationId}`,
            },
          );
          notification.onclick = () => {
            window.focus();
            setSelectedId(conversationId);
            notification.close();
          };
        }
      }
      knownInboxRef.current = current;
    };
    checkInbox();
    const timer = window.setInterval(checkInbox, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) =>
      [item.customerName, item.customerPhone, item.messages?.[0]?.content].some(
        (value) =>
          String(value || "")
            .toLocaleLowerCase()
            .includes(term),
      ),
    );
  }, [conversations, search]);

  const sendReply = async (event) => {
    event.preventDefault();
    if (!draft.trim() || !selectedId || !canUpdate) return;
    const content = draft.trim();
    const pendingId = `pending-${Date.now()}`;
    const pending = {
      id: pendingId,
      conversationId: selectedId,
      channel: conversation?.channel,
      direction: "OUTBOUND",
      authorType: "AGENT",
      content,
      deliveryStatus: "SENDING",
      createdAt: new Date().toISOString(),
    };
    setError("");
    setDraft("");
    setConversation((current) =>
      current
        ? { ...current, messages: [...current.messages, pending] }
        : current,
    );
    const result = await sendChatReplyAction(selectedId, content);
    if (result.success) {
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((item) =>
                item.id === pendingId ? result.data : item,
              ),
            }
          : current,
      );
      if (result.warning) setError(`${result.warning} Message-এ Retry চাপুন।`);
      loadInbox();
    } else {
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.filter(
                (item) => item.id !== pendingId,
              ),
            }
          : current,
      );
      setDraft((current) => current || content);
      setError(result.message || "Reply could not be sent.");
    }
  };

  const retryReply = async (messageId) => {
    if (!selectedId || busy || !canUpdate) return;
    setBusy(true);
    setError("");
    setConversation((current) =>
      current
        ? {
            ...current,
            messages: current.messages.map((item) =>
              item.id === messageId
                ? { ...item, deliveryStatus: "SENDING" }
                : item,
            ),
          }
        : current,
    );
    const result = await sendChatReplyAction(selectedId, "", messageId);
    if (result.success) {
      setConversation((current) =>
        current
          ? {
              ...current,
              messages: current.messages.map((item) =>
                item.id === messageId ? result.data : item,
              ),
            }
          : current,
      );
      if (result.warning) setError(`${result.warning} আবার চেষ্টা করুন।`);
    } else {
      setError(result.message || "Retry failed.");
      await loadConversation();
    }
    setBusy(false);
  };

  const sendProduct = async (product) => {
    if (!selectedId || busy || !canUpdate) return;
    setBusy(true);
    setError("");
    const result = await sendChatReplyAction(selectedId, "", null, {
      id: product.id,
    });
    if (result.success) {
      setConversation((current) =>
        current
          ? { ...current, messages: [...current.messages, result.data] }
          : current,
      );
      setProductPanel(false);
      setProductQuery("");
      setProducts([]);
      if (result.warning) setError(result.warning);
      await loadInbox();
    } else setError(result.message || "Product পাঠানো যায়নি।");
    setBusy(false);
  };

  const sendOrderTimeline = async (order) => {
    if (!selectedId || busy || !canUpdate) return;
    setBusy(true);
    setError("");
    const result = await sendChatReplyAction(
      selectedId,
      "",
      null,
      null,
      order.id,
    );
    if (result.success) {
      setConversation((current) =>
        current
          ? { ...current, messages: [...current.messages, result.data] }
          : current,
      );
      if (result.warning) setError(result.warning);
      await loadInbox();
    } else setError(result.message || "Order timeline পাঠানো যায়নি।");
    setBusy(false);
  };

  const changeStatus = async (nextStatus) => {
    if (!selectedId || !canUpdate) return;
    const result = await updateChatConversationAction(selectedId, {
      status: nextStatus,
    });
    if (result.success) await Promise.all([loadConversation(), loadInbox()]);
    else setError(result.message || "Status could not be updated.");
  };

  const assignAgent = async (assignedToId) => {
    if (!selectedId || !canUpdate) return;
    const result = await updateChatConversationAction(selectedId, {
      assignedToId: assignedToId || null,
    });
    if (result.success) await Promise.all([loadConversation(), loadInbox()]);
    else setError(result.message || "Assignment could not be updated.");
  };

  const enableNotifications = async () => {
    if (
      !("Notification" in window) ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setNotificationPermission("unsupported");
      return;
    }
    try {
      const config = await getChatPushConfigAction();
      if (!config.success || !config.publicKey)
        throw new Error("Server-এ VAPID push key configure করা নেই।");
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission !== "granted") return;
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        { scope: "/" },
      );
      let subscription = await registration.pushManager.getSubscription();
      if (
        subscription &&
        !subscriptionUsesVapidKey(subscription, config.publicKey)
      ) {
        await removeChatPushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
        subscription = null;
      }
      subscription ||= await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.publicKey),
      });
      const saved = await saveChatPushSubscriptionAction(subscription.toJSON());
      if (!saved.success)
        throw new Error(saved.message || "Push subscription save করা যায়নি।");
      setPushReady(true);
      setError("");
    } catch (pushError) {
      setError(
        pushError.message || "Browser push notification চালু করা যায়নি।",
      );
    }
  };

  const sendPushTest = async () => {
    if (!pushReady || pushTestBusy) return;
    setPushTestBusy(true);
    setError("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription)
        throw new Error(
          "এই browser-এর push subscription পাওয়া যায়নি। Push আবার চালু করুন।",
        );
      const result = await sendChatPushTestAction(subscription.endpoint);
      if (!result.success)
        throw new Error(result.message || "Test push পাঠানো যায়নি।");
    } catch (testError) {
      setError(testError.message || "Test push পাঠানো যায়নি।");
    } finally {
      setPushTestBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl space-y-4 pb-8">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <section className="grid h-[calc(100dvh-12rem)] min-h-[24rem] overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm lg:h-[min(78vh,820px)] lg:min-h-[32rem] lg:grid-cols-[22rem_minmax(0,1fr)]">
        <aside
          className={`min-w-0 border-b border-border lg:border-b-0 lg:border-r ${selectedId ? "hidden lg:block" : ""}`}
        >
          <header className="flex flex-col items-end justify-between gap-3">
            {/* <div>
              <p className="text-sm font-medium text-primary">
                Customer Support
              </p>
              <h1 className="mt-1 text-2xl font-bold text-text sm:text-3xl">
                Chat Inbox
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                Website, WhatsApp ও Messenger conversation এক জায়গায়।
              </p>
            </div> */}
            <details className="group relative z-20">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background">
                <Bell size={16} className="text-primary" />
                <span>Inbox tools</span>
                <ChevronDown
                  size={15}
                  className="transition-transform group-open:rotate-180"
                />
              </summary>
              <div className="absolute right-0 top-full mt-2 flex min-w-52 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-xl">
                <button
                  type="button"
                  onClick={enableNotifications}
                  disabled={
                    pushReady ||
                    notificationPermission === "denied" ||
                    notificationPermission === "unsupported"
                  }
                  title={
                    notificationPermission === "denied"
                      ? "Browser settings থেকে notification permission দিন"
                      : notificationPermission === "unsupported"
                        ? "এই browser push notification সমর্থন করে না"
                        : pushReady
                          ? "Admin chat push notification চালু আছে"
                          : "Admin inbox বন্ধ থাকলেও নতুন customer message-এর notification চালু করুন"
                  }
                  className="rounded-lg px-3 py-2 text-left text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60"
                >
                  {pushReady
                    ? "Push notifications on"
                    : notificationPermission === "denied"
                      ? "Permission blocked"
                      : notificationPermission === "unsupported"
                        ? "Push not supported"
                        : "Push চালু করুন"}
                </button>
                {pushReady && (
                  <button
                    type="button"
                    onClick={sendPushTest}
                    disabled={pushTestBusy}
                    className="rounded-lg px-3 py-2 text-left text-sm text-text hover:bg-background disabled:opacity-60"
                  >
                    {pushTestBusy ? "পাঠাচ্ছি…" : "Test push"}
                  </button>
                )}
                <a
                  href="/admin/chat/settings"
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-text hover:bg-background"
                >
                  Chat Settings
                </a>
              </div>
            </details>
          </header>
          <div className="space-y-3 border-b border-border p-3">
            <label className="relative block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-muted" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="নাম বা message খুঁজুন"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-text outline-none focus:border-brand"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-text"
              >
                <option value="ALL">সব channel</option>
                <option value="WEBSITE">Website</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="MESSENGER">Messenger</option>
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-text"
              >
                <option value="OPEN">Open</option>
                <option value="PENDING">Pending</option>
                <option value="CLOSED">Closed</option>
                <option value="ALL">সব status</option>
              </select>
            </div>
          </div>
          <div className="max-h-[65vh] overflow-y-auto lg:max-h-[calc(72vh-6rem)]">
            {visibleConversations.length ? (
              visibleConversations.map((item) => {
                const Icon =
                  item.channel === "WEBSITE"
                    ? Globe2
                    : item.channel === "WHATSAPP"
                      ? MessageCircle
                      : MessagesSquare;
                const lastMessage = item.messages?.[0];
                return (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full border-b border-border/70 p-3 text-left transition hover:bg-background ${selectedId === item.id ? "bg-primary-soft" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-background text-primary">
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-text">
                            {item.customerName ||
                              item.customerPhone ||
                              `${channelLabels[item.channel]} · ${item.externalUserId.slice(-6)}`}
                          </span>
                          <span className="flex shrink-0 items-center gap-1.5">
                            <span className="text-[10px] text-text-muted">
                              {dateTime(item.lastMessageAt)}
                            </span>
                            {item.unreadCount > 0 && (
                              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                                {item.unreadCount}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="mt-1 block truncate text-xs text-text-muted">
                          {lastMessage?.direction === "OUTBOUND"
                            ? "আপনি: "
                            : ""}
                          {lastMessage?.content || "নতুন conversation"}
                          {item.assignedTo?.name
                            ? ` · ${item.assignedTo.name}`
                            : ""}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="p-6 text-center text-sm text-text-muted">
                এই filter-এ কোনো conversation নেই।
              </p>
            )}
          </div>
        </aside>
        <div
          className={`flex h-full min-h-0 min-w-0 flex-col ${!selectedId ? "hidden lg:flex" : ""}`}
        >
          {conversation ? (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-black/5 bg-white p-3 sm:p-4">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedId("")}
                    className="rounded px-2 py-1 text-sm text-primary lg:hidden"
                  >
                    ← Inbox
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-text">
                      {conversation.customerName ||
                        conversation.customerPhone ||
                        `${channelLabels[conversation.channel]} · ${conversation.externalUserId.slice(-6)}`}
                    </h2>
                    <p className="text-xs text-text-muted">
                      {channelLabels[conversation.channel]} ·{" "}
                      {statusLabels[conversation.status]}
                      {conversation.customerPhone
                        ? ` · ${conversation.customerPhone}`
                        : ""}
                    </p>
                  </div>
                </div>
                {canUpdate && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={conversation.assignedToId || ""}
                      onChange={(event) => assignAgent(event.target.value)}
                      aria-label="Assign conversation"
                      className="max-w-36 rounded-lg border border-border bg-background px-2 py-2 text-xs text-text"
                    >
                      <option value="">Unassigned</option>
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id}>
                          {agent.name || agent.email}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(
                          conversation.status === "PENDING"
                            ? "OPEN"
                            : "PENDING",
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-background"
                    >
                      <Clock3 size={14} />
                      {conversation.status === "PENDING" ? "Open" : "Pending"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        changeStatus(
                          conversation.status === "CLOSED" ? "OPEN" : "CLOSED",
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text hover:bg-background"
                    >
                      <Check size={14} />
                      {conversation.status === "CLOSED" ? "Reopen" : "Close"}
                    </button>
                  </div>
                )}
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-3 sm:p-5">
                {conversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 ${message.direction === "OUTBOUND" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900 shadow-sm" : "rounded-tl-sm bg-white text-slate-800 shadow-sm"}`}
                    >
                      {message.metadata?.type === "PRODUCT_CARD" &&
                        message.metadata.product && (
                          <a
                            href={message.metadata.product.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-2 block overflow-hidden rounded-xl bg-white text-gray-900"
                          >
                            {message.metadata.product.imageUrl && (
                              <img
                                src={message.metadata.product.imageUrl}
                                alt=""
                                className="h-36 w-full object-cover"
                              />
                            )}
                            <span className="block p-2">
                              <strong className="block text-sm">
                                {message.metadata.product.title}
                              </strong>
                              <span className="text-sm font-bold">
                                ৳
                                {Number(
                                  message.metadata.product.price,
                                ).toLocaleString("en-BD")}
                              </span>
                            </span>
                          </a>
                        )}
                      {message.metadata?.type === "ORDER_TIMELINE" &&
                        message.metadata.order && (
                          <div className="mb-2 rounded-xl bg-white p-3 text-gray-900">
                            <strong className="block text-sm">
                              অর্ডার {message.metadata.order.orderNo}
                            </strong>
                            <p className="mt-1 text-xs">
                              বর্তমান অবস্থা: {message.metadata.order.status} ·
                              ৳
                              {Number(
                                message.metadata.order.orderPrice,
                              ).toLocaleString("en-BD")}
                            </p>
                            {message.metadata.order.orderItems?.map(
                              (item, index) => (
                                <p
                                  key={`${item.productName}-${index}`}
                                  className="mt-1 text-xs"
                                >
                                  {item.productName} × {item.quantity}
                                </p>
                              ),
                            )}
                            <ol className="mt-2 space-y-1 border-l border-gray-200 pl-3">
                              {message.metadata.order.events.map(
                                (event, index) => (
                                  <li
                                    key={`${event.status}-${index}`}
                                    className="text-xs"
                                  >
                                    <b>{event.title}</b>
                                    {event.message ? ` · ${event.message}` : ""}
                                    {event.location
                                      ? ` · ${event.location}`
                                      : ""}
                                    <span className="ml-1 text-gray-500">
                                      {dateTime(event.createdAt)}
                                    </span>
                                  </li>
                                ),
                              )}
                            </ol>
                            <a
                              href={`/admin/orders2/${message.metadata.order.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-blue-700 underline"
                            >
                              Order view খুলুন ↗
                            </a>
                          </div>
                        )}
                      {!["PRODUCT_CARD", "ORDER_TIMELINE"].includes(
                        message.metadata?.type,
                      ) && (
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {message.content}
                        </p>
                      )}
                      <p
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${message.direction === "OUTBOUND" ? "text-slate-500" : "text-text-muted"}`}
                      >
                        {message.authorType === "AI"
                          ? "AI"
                          : message.authorType === "AGENT"
                            ? "Staff"
                            : channelLabels[message.channel]}{" "}
                        · {dateTime(message.createdAt)}
                        {message.direction === "OUTBOUND" && (
                          <>
                            <span
                              className="ml-1"
                              title={
                                {
                                  SENDING: "পাঠানো হচ্ছে",
                                  SENT: "পাঠানো হয়েছে",
                                  DELIVERED: "পৌঁছেছে",
                                  READ: "পড়া হয়েছে",
                                  FAILED: "পাঠানো যায়নি",
                                }[message.deliveryStatus] || "পাঠানো হয়েছে"
                              }
                            >
                              {message.deliveryStatus === "SENDING" ||
                              message.deliveryStatus === "SENT" ? (
                                <Clock3 size={13} />
                              ) : message.deliveryStatus === "FAILED" ? (
                                <CircleAlert
                                  size={14}
                                  className="text-red-600"
                                />
                              ) : message.deliveryStatus === "READ" ? (
                                <CheckCheck
                                  size={15}
                                  className="text-emerald-700"
                                />
                              ) : (
                                <Check size={14} />
                              )}
                            </span>
                            {message.deliveryStatus === "FAILED" &&
                              canUpdate && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => retryReply(message.id)}
                                  className="ml-1 inline-flex items-center gap-1 rounded bg-white/15 px-1.5 py-0.5 font-semibold hover:bg-white/25 disabled:opacity-50"
                                >
                                  <RotateCw size={11} />
                                  Retry
                                </button>
                              )}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-black/5 bg-white px-3 pt-3 sm:px-4">
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-background px-2 py-2">
                  <button
                    type="button"
                    onClick={() => setOrdersExpanded((value) => !value)}
                    aria-expanded={ordersExpanded}
                    className="flex min-h-8 flex-1 flex-wrap items-center gap-x-3 gap-y-1 rounded-md px-1 text-left text-xs text-text-muted hover:bg-surface"
                  >
                    <ShoppingBag size={15} className="text-primary" />
                    <span className="font-semibold text-primary">
                      {ordersExpanded ? "Orders লুকান" : "Orders দেখুন"}
                    </span>
                    <span>
                      <b className="text-text">{orderSummary?.total ?? "—"}</b>{" "}
                      মোট
                    </span>
                    <span>
                      Running{" "}
                      <b className="text-amber-700">
                        {orderSummary?.running ?? "—"}
                      </b>
                    </span>
                    <span>
                      Complete{" "}
                      <b className="text-emerald-700">
                        {orderSummary?.complete ?? "—"}
                      </b>
                    </span>
                    <ChevronDown
                      size={15}
                      className={`ml-auto transition-transform ${ordersExpanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setProductPanel((value) => !value)}
                    disabled={!canUpdate || conversation.status === "CLOSED"}
                    aria-expanded={productPanel}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text disabled:opacity-50"
                  >
                    <Package size={15} />
                    {productPanel ? "Product search বন্ধ" : "Product পাঠান"}
                  </button>
                </div>
                {ordersExpanded && (
                  <div className="mt-2 max-h-44 space-y-2 overflow-y-auto pb-2">
                    {orderSummary?.orders?.length ? (
                      orderSummary.orders.map((order) => (
                        <div
                          key={order.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2 text-xs"
                        >
                          <a
                            href={`/admin/orders2/${order.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-primary underline"
                          >
                            {order.orderNo} ↗
                          </a>
                          <span className="text-text-muted">
                            {order.status}
                          </span>
                          <span className="text-text-muted">
                            ৳{Number(order.orderPrice).toLocaleString("en-BD")}
                          </span>
                          <span className="text-text-muted">
                            {dateTime(order.createdAt)}
                          </span>
                          <button
                            type="button"
                            disabled={
                              !canUpdate ||
                              busy ||
                              conversation.status === "CLOSED"
                            }
                            onClick={() => sendOrderTimeline(order)}
                            className="ml-auto rounded-md bg-brand px-2.5 py-1.5 font-semibold text-white disabled:opacity-50"
                          >
                            Timeline পাঠান
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-xs text-text-muted">
                        এই phone number-এ order নেই।
                      </p>
                    )}
                  </div>
                )}
              </div>
              {productPanel && (
                <div className="border-t border-border bg-surface p-3 sm:px-4">
                  <div className="mb-2 flex items-center gap-2">
                    <input
                      autoFocus
                      value={productQuery}
                      onChange={(event) => setProductQuery(event.target.value)}
                      placeholder="Product name বা code লিখুন"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text"
                    />
                    <button
                      type="button"
                      onClick={() => setProductPanel(false)}
                      aria-label="বন্ধ করুন"
                      className="rounded p-2 text-text-muted"
                    >
                      <X size={17} />
                    </button>
                  </div>
                  <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 rounded-lg border border-border p-2"
                      >
                        <img
                          src={product.imageUrl || "/placeholder.png"}
                          alt=""
                          className="h-12 w-12 rounded object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-text">
                            {product.title}
                          </p>
                          <p className="text-xs text-text-muted">
                            ৳{Number(product.price).toLocaleString("en-BD")}
                            {product.inStock
                              ? " · In stock"
                              : " · Out of stock"}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={busy || conversation.status === "CLOSED"}
                          onClick={() => sendProduct(product)}
                          className="rounded-lg bg-brand px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          Send
                        </button>
                      </div>
                    ))}
                    {productQuery.length >= 2 && !products.length && (
                      <p className="py-3 text-center text-xs text-text-muted">
                        কোনো product পাওয়া যায়নি।
                      </p>
                    )}
                  </div>
                </div>
              )}
              <form
                onSubmit={sendReply}
                className="sticky bottom-0 z-10 mt-auto shrink-0 border-t border-black/5 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4"
              >
                {draft.startsWith("/") && quickReplies.length > 0 && (
                  <div className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-52 overflow-auto rounded-xl border border-border bg-surface p-1 shadow-xl sm:left-4 sm:right-4">
                    {quickReplies
                      .filter(
                        (item) =>
                          !draft.slice(1).trim() ||
                          item.shortcut
                            .toLowerCase()
                            .includes(draft.slice(1).toLowerCase()) ||
                          item.text
                            .toLowerCase()
                            .includes(draft.slice(1).toLowerCase()),
                      )
                      .map((item) => (
                        <button
                          key={item.shortcut}
                          type="button"
                          onClick={() => setDraft(item.text)}
                          className="block w-full rounded-lg px-3 py-2 text-left hover:bg-background"
                        >
                          <b className="text-xs text-primary">
                            /{item.shortcut}
                          </b>
                          <span className="ml-2 line-clamp-1 text-xs text-text-muted">
                            {item.text}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
                <div className="flex items-end gap-2 ">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        !event.altKey &&
                        !event.shiftKey
                      ) {
                        event.preventDefault();
                        sendReply(event);
                      }
                    }}
                    rows={2}
                    maxLength={4000}
                    disabled={!canUpdate || conversation.status === "CLOSED"}
                    placeholder={
                      conversation.status === "CLOSED"
                        ? "Reply দিতে conversation reopen করুন"
                        : canUpdate
                          ? "Reply লিখুন… (Enter পাঠায়, Alt+Enter নতুন line)"
                          : "আপনার chat:update permission নেই"
                    }
                    className="min-h-11 flex-1 resize-none rounded-2xl border-0 bg-[#f0f2f5] px-4 py-2 text-sm text-slate-800 outline-none ring-1 ring-black/5 focus:ring-emerald-600 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={
                      !canUpdate ||
                      !draft.trim() ||
                      conversation.status === "CLOSED"
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-4 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    <Send size={17} />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-text-muted">
                  Website reply visitor-এর chat-এ যাবে; Meta reply সংশ্লিষ্ট
                  WhatsApp বা Messenger channel-এ পাঠানো হবে।
                </p>
              </form>
            </>
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-text-muted">
              <div>
                <UserRound className="mx-auto mb-3 h-10 w-10 opacity-40" />
                <p>একটি conversation বেছে নিন</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
