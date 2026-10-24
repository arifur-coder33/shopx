"use client";

import {
  getChatAssignableUsersAction,
  getChatConversationAction,
  getChatCustomerOrdersAction,
  getMessengerCustomerProfileAction,
  getChatInboxAction,
  getChatMediaLibraryAction,
  getChatPushConfigAction,
  getChatRealtimeTokenAction,
  getChatSettingsAction,
  deleteChatConversationAction,
  setMessengerCustomerPhoneAction,
  removeChatPushSubscriptionAction,
  saveChatPushSubscriptionAction,
  searchChatProductsAction,
  sendChatPushTestAction,
  sendChatReplyAction,
  sendChatImageAction,
  setChatMessageReactionAction,
  retryChatImageAction,
  updateChatConversationAction,
} from "@/backend/serverActions/chatActions";
import {
  Bell,
  ArrowLeft,
  Check,
  CheckCheck,
  ChevronDown,
  CircleAlert,
  Clock3,
  ExternalLink,
  Globe2,
  ImagePlus,
  LoaderCircle,
  Menu,
  MoreVertical,
  Plus,
  Images,
  MessageCircle,
  MessagesSquare,
  Package,
  RotateCw,
  Reply,
  Search,
  Send,
  Smile,
  ShoppingBag,
  UserRound,
  X,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { normalizeChatText } from "@/lib/chatText";

const channelLabels = {
  WEBSITE: "Website",
  WHATSAPP: "WhatsApp",
  MESSENGER: "Messenger",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};
const statusLabels = { OPEN: "Open", PENDING: "Pending", CLOSED: "Closed" };
const messengerReactions = ["👍", "❤️", "😂", "😮", "😢", "😡"];
const dateTime = (value) =>
  value
    ? new Intl.DateTimeFormat("bn-BD", {
        dateStyle: "short",
        timeStyle: "short",
      timeZone: "Asia/Dhaka",
      }).format(new Date(value))
    : "";

function whatsappChatUrl(conversation) {
  const number = String(conversation?.externalUserId || conversation?.customerPhone || "").replace(/\D/g, "");
  return /^\d{8,15}$/.test(number) ? `https://wa.me/${number}` : null;
}

function customerInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  return words.length ? [words[0], words.at(-1)].filter((word, index) => index === 0 || words.length > 1).map((word) => Array.from(word)[0]).join("").toUpperCase() : "";
}

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
  const [selectedId, setSelectedId] = useState("");
  const [conversation, setConversation] = useState(null);
  const [replyChannel, setReplyChannel] = useState(null);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("OPEN");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState("");
  const [replyToMessage, setReplyToMessage] = useState(null);
  const [openMessageMenuId, setOpenMessageMenuId] = useState(null);
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState(null);
  const [reactionBusyId, setReactionBusyId] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [selectedChatMedia, setSelectedChatMedia] = useState(null);
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false);
  const [chatMediaItems, setChatMediaItems] = useState([]);
  const [chatMediaLoading, setChatMediaLoading] = useState(false);
  const [chatMediaSearch, setChatMediaSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState("");
  const [conversationLoading, setConversationLoading] = useState(false);
  const [inboxLoading, setInboxLoading] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [error, setError] = useState(initialError);
  const [agents, setAgents] = useState([]);
  const [orderSummary, setOrderSummary] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [productPanel, setProductPanel] = useState(false);
  const [productSendMode, setProductSendMode] = useState("page");
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [sendingItemId, setSendingItemId] = useState("");
  const [ordersExpanded, setOrdersExpanded] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [notificationPermission, setNotificationPermission] =
    useState("default");
  const [pushReady, setPushReady] = useState(false);
  const [pushTestBusy, setPushTestBusy] = useState(false);
  const selectedIdRef = useRef(selectedId);
  const loadedConversationIdRef = useRef("");
  const actionBusyRef = useRef(false);
  const actionsMenuRef = useRef(null);
  const attachmentsMenuRef = useRef(null);
  const knownInboxRef = useRef(null);
  const photoInputRef = useRef(null);
  const messageListRef = useRef(null);
  const messageElementsRef = useRef(new Map());
  const messageActionMenusRef = useRef(new Map());
  const replyHighlightTimerRef = useRef(null);
  const [focusedReplyMessageId, setFocusedReplyMessageId] = useState(null);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    const requestedConversation = new URLSearchParams(window.location.search).get("conversation");
    if (requestedConversation) {
      setSelectedId(requestedConversation);
      setStatus("ALL");
    } else if (window.matchMedia("(min-width: 1024px)").matches) {
      setSelectedId(initialConversations[0]?.id || "");
    }
  }, []);

  useEffect(() => {
    setProfileOpen(false);
    setProfile(null);
    setProfileError("");
    setPhoneDraft("");
    setReplyChannel(null);
    setReplyToMessage(null);
    setActionsOpen(false);
    setAttachmentsOpen(false);
    setProductPanel(false);
    setProductQuery("");
    setOrdersExpanded(false);
    setPhotoFile(null);
    setSelectedChatMedia(null);
    setMediaPickerOpen(false);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setDraft("");
  }, [selectedId]);

  useEffect(() => {
    if (!actionsOpen && !attachmentsOpen) return;
    const outside = (event) => {
      if (!actionsMenuRef.current?.contains(event.target)) setActionsOpen(false);
      if (!attachmentsMenuRef.current?.contains(event.target)) setAttachmentsOpen(false);
    };
    const escape = (event) => { if (event.key === "Escape") { setActionsOpen(false); setAttachmentsOpen(false); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [actionsOpen, attachmentsOpen]);

  const openMessengerProfile = async () => {
    if (profileOpen) { setProfileOpen(false); return; }
    setProfileOpen(true);
    setProfileBusy(true);
    setProfileError("");
    setPhoneDraft(conversation?.linkedConversations?.find((item) => item.channel === "MESSENGER")?.customerPhone || "");
    const activeId = selectedId;
    const requestedId = conversation?.linkedConversations?.find((item) => item.channel === "MESSENGER")?.id || selectedId;
    const result = await getMessengerCustomerProfileAction(requestedId);
    if (selectedIdRef.current === activeId) {
      if (result.success) {
        setProfile(result.data);
        setProfileError(result.data.profileAvailable ? "" : result.data.profileErrorCode ? `Meta profile data দেয়নি (Graph API error ${result.data.profileErrorCode}).` : "Meta profile data পাওয়া যায়নি।");
        setConversation((current) => current ? { ...current, customerName: result.data.name || current.customerName, profilePicUrl: result.data.profilePicUrl || current.profilePicUrl } : current);
      }
      else setProfileError(result.message || "Profile পাওয়া যায়নি।");
      setProfileBusy(false);
    }
  };

  const saveMessengerPhone = async (event) => {
    event.preventDefault();
    const messengerId = conversation?.linkedConversations?.find((item) => item.channel === "MESSENGER")?.id;
    if (!messengerId || !phoneDraft.trim() || phoneBusy) return;
    setPhoneBusy(true);
    const result = await setMessengerCustomerPhoneAction(messengerId, phoneDraft);
    if (result.success) {
      await Promise.all([loadConversation(), loadInbox()]);
      setProfileError("");
    } else setProfileError(result.message || "Phone number save করা যায়নি।");
    setPhoneBusy(false);
  };

  const loadInbox = useCallback(async () => {
    setInboxLoading(true);
    const result = await getChatInboxAction({ channel, status }).catch((failure) => ({ success: false, message: failure?.message || "ইনবক্স লোড হয়নি। আবার চেষ্টা করুন।" }));
    setInboxLoading(false);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setConversations(result.data);
    setSelectedId((current) =>
      current && result.data.some((item) => item.id === current || item.linkedConversations?.some((linked) => linked.id === current))
        ? current
        : window.matchMedia("(min-width: 1024px)").matches ? result.data[0]?.id || "" : "",
    );
    setError("");
  }, [channel, status]);

  const loadConversation = useCallback(async () => {
    if (!selectedId) {
      setConversation(null);
      loadedConversationIdRef.current = "";
      setConversationLoading(false);
      return;
    }
    if (loadedConversationIdRef.current !== selectedId) setConversationLoading(true);
    const result = await getChatConversationAction(selectedId).catch((failure) => ({ success: false, message: failure?.message || "চ্যাট লোড হয়নি। আবার চেষ্টা করুন।" }));
    if (selectedIdRef.current !== selectedId) return;
    setConversationLoading(false);
    if (result.success) {
      loadedConversationIdRef.current = selectedId;
      setConversation(result.data);
      setReplyChannel((current) => result.data.linkedConversations.some((item) => item.channel === current)
        ? current
        : result.data.linkedConversations.find((item) => item.status !== "CLOSED")?.channel || result.data.channel);
    }
    else setError(result.message);
  }, [selectedId]);

  const jumpToMessage = (messageId) => {
    if (!messageId) return;
    const target = messageElementsRef.current.get(messageId);
    if (!target || !messageListRef.current?.contains(target)) {
      setError("মূল message-টি এই chat history-তে পাওয়া যায়নি।");
      return;
    }
    setError("");
    setFocusedReplyMessageId(messageId);
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    window.setTimeout(() => target.focus({ preventScroll: true }), 180);
    window.clearTimeout(replyHighlightTimerRef.current);
    replyHighlightTimerRef.current = window.setTimeout(() => setFocusedReplyMessageId(null), 2200);
  };

  useEffect(() => () => window.clearTimeout(replyHighlightTimerRef.current), []);

  useEffect(() => {
    if (!openMessageMenuId) return;
    const closeOnOutsideClick = (event) => {
      const menu = messageActionMenusRef.current.get(openMessageMenuId);
      if (menu && !menu.contains(event.target)) {
        setOpenMessageMenuId(null);
        setReactionPickerMessageId(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpenMessageMenuId(null);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMessageMenuId]);

  const latestMessageId = conversation?.messages?.at(-1)?.id || null;
  useEffect(() => {
    const messageList = messageListRef.current;
    if (!messageList || !latestMessageId) return;
    messageList.scrollTo({ top: messageList.scrollHeight, behavior: "smooth" });
  }, [selectedId, latestMessageId]);

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
      setProductsLoading(false);
      return;
    }
    let cancelled = false;
    setProductsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const result = await searchChatProductsAction(productQuery);
        if (!cancelled) setProducts(result.success ? result.data : []);
      } catch { if (!cancelled) setProducts([]); }
      finally { if (!cancelled) setProductsLoading(false); }
    }, 250);
    return () => { cancelled = true; window.clearTimeout(timer); };
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

  const replyTarget = conversation?.linkedConversations?.find((item) => item.channel === replyChannel) || conversation?.linkedConversations?.[0];
  const replyClosed = replyTarget?.status === "CLOSED";
  const messengerContact = conversation?.linkedConversations?.find((item) => item.channel === "MESSENGER");
  const whatsappContact = conversation?.linkedConversations?.find((item) => item.channel === "WHATSAPP");

  const sendReply = async (event) => {
    event.preventDefault();
    if (photoFile || selectedChatMedia) return sendPhoto(event);
    if (!draft.trim() || !replyTarget || !canUpdate || busy) return;
    setBusy(true);
    const content = draft.trim();
    const pendingId = `pending-${Date.now()}`;
    const pending = {
      id: pendingId,
      conversationId: replyTarget.id,
      channel: replyTarget.channel,
      direction: "OUTBOUND",
      authorType: "AGENT",
      content,
      metadata: replyToMessage ? { replyTo: { id: replyToMessage.id, content: replyToMessage.content.slice(0, 300), direction: replyToMessage.direction, authorType: replyToMessage.authorType } } : null,
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
    const result = await sendChatReplyAction(replyTarget.id, content, null, null, null, replyToMessage?.id || null).catch((failure) => ({ success: false, message: failure?.message || "বার্তা পাঠানো যায়নি।" }));
    setBusy(false);
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
      setReplyToMessage(null);
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

  const sendPhoto = async (event) => {
    event.preventDefault();
    if ((!photoFile && !selectedChatMedia) || !replyTarget || !canUpdate || busy) return;
    setBusy(true);
    setError("");
    const formData = new FormData();
    if (photoFile) formData.set("image", photoFile);
    else formData.set("mediaId", selectedChatMedia.id);
    formData.set("caption", draft);
    const result = await sendChatImageAction(replyTarget.id, formData, replyToMessage?.id || null).catch((failure) => ({ success: false, message: failure?.message || "ছবি পাঠানো যায়নি।" }));
    if (result.success) {
      setConversation((current) => current ? { ...current, messages: [...current.messages, result.data] } : current);
      setDraft("");
      setPhotoFile(null);
      setSelectedChatMedia(null);
      if (photoInputRef.current) photoInputRef.current.value = "";
      setReplyToMessage(null);
      if (result.warning) setError(result.warning);
      await loadInbox();
    } else setError(result.message || "Photo পাঠানো যায়নি।");
    setBusy(false);
  };

  const openChatMediaPicker = async () => {
    setMediaPickerOpen(true);
    setChatMediaLoading(true);
    const result = await getChatMediaLibraryAction().catch((failure) => ({ success: false, message: failure?.message || "ছবির লাইব্রেরি লোড হয়নি।" }));
    if (result.success) setChatMediaItems(result.data || []);
    else setError(result.message || "Media Library load করা যায়নি।");
    setChatMediaLoading(false);
  };

  const selectChatMedia = (item) => {
    setSelectedChatMedia(item);
    setPhotoFile(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setMediaPickerOpen(false);
  };

  const deleteConversation = async () => {
    if (!selectedId || !canUpdate || !window.confirm("এই chat ও তার সব local message delete করবেন? Meta inbox থেকে message unsend হবে না।")) return;
    const result = await deleteChatConversationAction(selectedId);
    if (!result.success) {
      setError(result.message || "Chat delete করা যায়নি।");
      return;
    }
    setConversation(null);
    setSelectedId("");
    setReplyToMessage(null);
    setSelectedChatMedia(null);
    await loadInbox();
    if (result.warning) setError(result.warning);
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
    const message = conversation?.messages.find((item) => item.id === messageId);
    const result = message?.metadata?.type === "IMAGE"
      ? await retryChatImageAction(messageId)
      : await sendChatReplyAction(message?.conversationId || selectedId, "", messageId);
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

  const reactToMessage = async (message, emoji) => {
    if (!message || reactionBusyId) return;
    setReactionBusyId(message.id);
    const result = await setChatMessageReactionAction(message.id, emoji);
    if (result.success) {
      setConversation((current) => current ? {
        ...current,
        messages: current.messages.map((item) => item.id === message.id ? result.data : item),
      } : current);
      setOpenMessageMenuId(null);
      setReactionPickerMessageId(null);
      setError("");
    } else setError(result.message || "Reaction পাঠানো যায়নি।");
    setReactionBusyId(null);
  };

  const startReplyToMessage = (message) => {
    setReplyToMessage(message);
    setDraft("");
    setPhotoFile(null);
    setSelectedChatMedia(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
    setOpenMessageMenuId(null);
    setReactionPickerMessageId(null);
  };

  const sendProduct = async (product, mode = productSendMode) => {
    if (!replyTarget || busy || !canUpdate) return;
    setBusy(true);
    setSendingItemId(`product:${product.id}`);
    setError("");
    const result = await sendChatReplyAction(replyTarget.id, "", null, {
      id: product.id,
      mode,
    }).catch((failure) => ({ success: false, message: failure?.message || "পণ্য পাঠানো যায়নি।" }));
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
    setSendingItemId("");
  };

  const sendOrderTimeline = async (order) => {
    if (!replyTarget || busy || !canUpdate) return;
    setBusy(true);
    setSendingItemId(`order:${order.id}`);
    setError("");
    const result = await sendChatReplyAction(
      replyTarget.id,
      "",
      null,
      null,
      order.id,
    ).catch((failure) => ({ success: false, message: failure?.message || "অর্ডারের তথ্য পাঠানো যায়নি।" }));
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
    setSendingItemId("");
  };

  const runInboxAction = async (key, task) => {
    if (actionBusyRef.current) return;
    actionBusyRef.current = true;
    setPendingAction(key);
    setError("");
    try { await task(); }
    catch (failure) { setError(failure?.message || "কাজটি সম্পন্ন হয়নি। আবার চেষ্টা করুন।"); }
    finally { actionBusyRef.current = false; setPendingAction(""); }
  };

  const updateConversation = (key, changes) => {
    if (!selectedId || !canUpdate) return;
    return runInboxAction(key, async () => {
      const result = await updateChatConversationAction(selectedId, changes);
      if (!result.success) throw new Error(result.message || "পরিবর্তনটি সেভ হয়নি।");
      await Promise.all([loadConversation(), loadInbox()]);
      setActionsOpen(false);
    });
  };

  const changeStatus = (nextStatus) => updateConversation(`status-${nextStatus}`, { status: nextStatus });
  const assignAgent = (assignedToId) => updateConversation("assign", { assignedToId: assignedToId || null });
  const toggleConversationAi = () => {
    if (!conversation || conversation.assignedToId) return;
    return updateConversation("ai", { aiModeEnabled: !conversation.aiModeEnabled });
  };
  const toggleHumanAssistance = () => {
    if (!conversation) return;
    return updateConversation("human", {
      needsHumanAssistant: !conversation.needsHumanAssistant,
      ...(conversation.needsHumanAssistant && { status: "OPEN" }),
    });
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


  const actionButton = (key, label, description, Icon, onClick, mobile, disabled = false, danger = false) => (
    <button key={key} type="button" onClick={onClick} disabled={Boolean(pendingAction) || disabled}
      title={description} aria-busy={pendingAction === key}
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold disabled:opacity-50 ${mobile ? "w-full min-h-12" : "border"} ${danger ? "border-red-200 text-red-700 hover:bg-red-50" : "border-border text-text hover:bg-background"}`}>
      {pendingAction === key ? <LoaderCircle size={16} className="shrink-0 animate-spin" /> : <Icon size={16} className="shrink-0" />}
      <span>{pendingAction === key ? "সেভ হচ্ছে…" : label}{mobile && <span className="mt-0.5 block text-[11px] font-normal text-text-muted">{description}</span>}</span>
    </button>
  );

  const conversationActions = (mobile = false) => (
    <div className={mobile ? "flex flex-col gap-1" : "flex flex-wrap items-center gap-2"}>
      <label className={`text-xs text-text-muted ${mobile ? "border-b border-border p-2 pb-3" : "flex items-center gap-2"}`}>
        <span>{pendingAction === "assign" ? "দায়িত্ব সেভ হচ্ছে…" : "প্রতিনিধি"}</span>
        <select value={conversation.assignedToId || ""} onChange={(event) => assignAgent(event.target.value)} disabled={Boolean(pendingAction)} aria-label="এই চ্যাটের দায়িত্বে প্রতিনিধি বেছে নিন" className={`rounded-lg border border-border bg-background px-2 py-2 text-xs text-text ${mobile ? "mt-1 w-full" : "max-w-36"}`}>
          <option value="">কাউকে দেওয়া হয়নি</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name || agent.email}</option>)}
        </select>
      </label>
      {actionButton("ai", conversation.aiModeEnabled ? "AI বন্ধ করুন" : "AI চালু করুন", conversation.assignedToId ? "AI চালু করতে আগে প্রতিনিধি unassign করুন" : "এই চ্যাটে স্বয়ংক্রিয় উত্তর চালু বা বন্ধ করুন", MessageCircle, toggleConversationAi, mobile, Boolean(conversation.assignedToId))}
      {actionButton("human", conversation.needsHumanAssistant ? "সমাধান হয়েছে" : "প্রতিনিধির সাহায্য নিন", conversation.needsHumanAssistant ? "Need human assistant তালিকা থেকে সরান" : "চ্যাটটি প্রতিনিধির তালিকায় রাখুন এবং AI থামান", UserRound, toggleHumanAssistance, mobile)}
      {actionButton(`status-${conversation.status === "PENDING" ? "OPEN" : "PENDING"}`, conversation.status === "PENDING" ? "অপেক্ষা থেকে ফেরান" : "অপেক্ষায় রাখুন", "চ্যাটটি Pending বা Open তালিকায় রাখুন", Clock3, () => changeStatus(conversation.status === "PENDING" ? "OPEN" : "PENDING"), mobile)}
      {actionButton(`status-${conversation.status === "CLOSED" ? "OPEN" : "CLOSED"}`, conversation.status === "CLOSED" ? "চ্যাট আবার খুলুন" : "চ্যাট শেষ করুন", conversation.status === "CLOSED" ? "আবার এই চ্যাটে উত্তর দেওয়ার সুযোগ দিন" : "কথা শেষ হলে Closed তালিকায় রাখুন", Check, () => changeStatus(conversation.status === "CLOSED" ? "OPEN" : "CLOSED"), mobile)}
      {actionButton("delete", "চ্যাট মুছুন", "শুধু অ্যাডমিন ইনবক্সের চ্যাট ও মেসেজ মুছবে", Trash2, () => runInboxAction("delete", deleteConversation), mobile, false, true)}
    </div>
  );

  return (
    <main className="fixed inset-0 z-[60] mx-auto flex h-[100dvh] min-h-0 w-full max-w-none flex-col overflow-hidden bg-white [&_button]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_select]:cursor-pointer [&_button]:focus-visible:ring-2 [&_button]:focus-visible:ring-emerald-600 lg:relative lg:inset-auto lg:z-auto lg:h-[calc(100dvh-6rem)] lg:max-w-7xl">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <section className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] overflow-hidden border border-black/5 bg-white shadow-sm lg:grid-cols-[22rem_minmax(0,1fr)] lg:rounded-2xl">
        <aside
          className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden border-b border-border lg:border-b-0 lg:border-r ${selectedId ? "hidden lg:flex" : ""}`}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 bg-emerald-800 px-3 py-3 text-white lg:bg-white lg:text-text">
            <div className="flex items-center gap-2"><button type="button" onClick={() => window.dispatchEvent(new Event("admin:open-navigation"))} aria-label="অ্যাডমিন নেভিগেশন খুলুন" title="Admin menu" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10 lg:hidden"><Menu size={23} /></button><h1 className="text-lg font-bold">ইনবক্স</h1>{inboxLoading && <LoaderCircle size={17} className="animate-spin" aria-label="ইনবক্স আপডেট হচ্ছে" />}</div>
            <details className="group relative z-20">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text shadow-sm hover:bg-background">
                <MoreVertical size={20} className="lg:hidden" /><Bell size={16} className="hidden text-primary lg:block" />
                <span className="sr-only lg:not-sr-only">ইনবক্সের সেটিংস</span>
                <ChevronDown
                  size={15}
                  className="hidden transition-transform group-open:rotate-180 lg:block"
                />
              </summary>
              <div className="absolute right-0 top-full mt-2 flex min-w-52 flex-col gap-1 rounded-xl border border-border bg-surface p-2 shadow-xl">
                <button
                  type="button"
                  onClick={() => runInboxAction("notifications", enableNotifications)}
                  disabled={
                    Boolean(pendingAction) || pushReady ||
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
                  {pendingAction === "notifications" ? "চালু হচ্ছে…" : pushReady
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
                <option value="INSTAGRAM">Instagram</option>
                <option value="TIKTOK">TikTok</option>
              </select>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-border bg-background px-2 py-2 text-sm text-text"
              >
                <option value="OPEN">চলমান (Open)</option>
                <option value="PENDING">অপেক্ষায় (Pending)</option>
                <option value="NEEDS_HUMAN">Need human assistant</option>
                <option value="CLOSED">শেষ করা (Closed)</option>
                <option value="ALL">সব চ্যাট</option>
              </select>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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
                    className={`w-full border-b border-border/70 p-3 text-left transition hover:bg-background ${selectedId === item.id || item.linkedConversations?.some((linked) => linked.id === selectedId) ? "bg-primary-soft" : ""}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-background text-primary">
                        {item.profilePicUrl ? <img src={item.profilePicUrl} alt="" className="h-full w-full object-cover" /> : customerInitials(item.customerName) ? <span className="text-xs font-bold">{customerInitials(item.customerName)}</span> : <Icon size={18} />}
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
                        {item.needsHumanAssistant && <span className="mt-1 block text-[10px] font-semibold text-amber-700">Need human assistant</span>}
                        <span className="mt-1 block truncate text-xs text-text-muted">
                          {lastMessage?.direction === "OUTBOUND"
                            ? "আপনি: "
                            : ""}
                          {lastMessage?.content || "নতুন conversation"}
                          {item.channels?.length > 1 ? ` · ${item.channels.map((channel) => channelLabels[channel]).join(" + ")}` : ""}
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
          className={`flex h-full min-h-0 min-w-0 flex-col overflow-hidden ${!selectedId ? "hidden lg:flex" : ""}`}
        >
          {conversation && (conversation.id === selectedId || conversation.linkedConversations?.some((item) => item.id === selectedId)) ? (
            <>
              <header className="relative z-30 flex shrink-0 items-center justify-between gap-2 border-b border-black/5 bg-[#f0f2f5] px-3 py-2.5 lg:flex-wrap lg:gap-3 lg:bg-white lg:p-4">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setSelectedId(""); setConversation(null); }}
                    aria-label="ইনবক্স লিস্টে ফিরুন" title="ইনবক্সে ফিরুন"
                    className="grid h-10 w-9 shrink-0 place-items-center rounded-full text-emerald-800 hover:bg-black/5 lg:hidden"
                  >
                    <ArrowLeft size={23} />
                  </button>
                  {conversation.profilePicUrl ? <img src={conversation.profilePicUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background text-xs font-bold text-primary">{customerInitials(conversation.customerName) || <UserRound size={20} />}</span>}
                  <div className="min-w-0">
                    <h2 className="truncate font-bold text-text">
                      {messengerContact ? (
                        <button type="button" onClick={openMessengerProfile} aria-expanded={profileOpen} title="Messenger profile দেখুন" className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline">
                          {conversation.customerName || `Messenger · ${messengerContact.externalUserId.slice(-6)}`}<UserRound size={14} className="shrink-0" />
                        </button>
                      ) : whatsappContact && whatsappChatUrl(whatsappContact) ? (
                        <a href={whatsappChatUrl(whatsappContact)} target="_blank" rel="noreferrer" title="WhatsApp chat খুলুন" className="inline-flex max-w-full items-center gap-1 truncate text-primary hover:underline">
                          {conversation.customerName || conversation.customerPhone || conversation.externalUserId}<ExternalLink size={14} className="shrink-0" />
                        </a>
                      ) : (
                        conversation.customerName || conversation.customerPhone || `${channelLabels[conversation.channel]} · ${conversation.externalUserId.slice(-6)}`
                      )}
                    </h2>
                    {conversation.needsHumanAssistant && <p className="truncate text-xs font-semibold text-amber-700">Need human assistant{conversation.awaitingHumanPhone ? " · ফোন নম্বরের অপেক্ষায়" : ""}</p>}
                    <p className="truncate text-xs text-text-muted">
                      {conversation.channels?.map((channel) => channelLabels[channel]).join(" + ") || channelLabels[conversation.channel]} ·{" "}
                      {statusLabels[conversation.status]}
                      {conversation.customerPhone
                        ? ` · ${conversation.customerPhone}`
                        : ""}
                      {messengerContact && whatsappContact && whatsappChatUrl(whatsappContact) && <a href={whatsappChatUrl(whatsappContact)} target="_blank" rel="noreferrer" className="ml-2 text-primary hover:underline">WhatsApp খুলুন ↗</a>}
                    </p>
                  </div>
                </div>
                <div ref={actionsMenuRef} className="relative shrink-0 lg:hidden">
                  <button type="button" onClick={() => setActionsOpen((open) => !open)} aria-label="চ্যাটের অপশন খুলুন" title="চ্যাটের অপশন" aria-expanded={actionsOpen} aria-controls="chat-actions-menu" className="grid h-11 w-10 place-items-center rounded-full text-slate-700 hover:bg-black/5">{pendingAction ? <LoaderCircle size={20} className="animate-spin" /> : <MoreVertical size={23} />}</button>
                  {actionsOpen && <div id="chat-actions-menu" role="group" aria-label="চ্যাটের অপশন" className="absolute right-0 top-full mt-2 max-h-[70dvh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-white p-2 shadow-xl">
                    <p className="border-b border-border px-3 py-2 text-sm font-bold text-text">চ্যাটের অপশন</p>
                    {conversation.linkedConversations?.length > 1 && <label className="block border-b border-border p-2 text-xs text-text-muted">কোন মাধ্যমে উত্তর পাঠাবেন?<select value={replyTarget?.channel || ""} onChange={(event) => setReplyChannel(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-text">{conversation.linkedConversations.map((item) => <option key={item.id} value={item.channel}>{channelLabels[item.channel]}{item.status === "CLOSED" ? " (Closed)" : ""}</option>)}</select></label>}
                    {canUpdate && conversationActions(true)}
                    <button type="button" onClick={() => { setOrdersExpanded((open) => !open); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-semibold text-text hover:bg-background"><ShoppingBag size={16} />{ordersExpanded ? "অর্ডারের তালিকা লুকান" : "কাস্টমারের অর্ডার দেখুন"}</button>
                    {messengerContact && <button type="button" onClick={() => { openMessengerProfile(); setActionsOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-left text-xs font-semibold text-text hover:bg-background"><UserRound size={16} />কাস্টমারের প্রোফাইল দেখুন</button>}
                    <a href="/admin/chat/settings" className="block rounded-lg px-3 py-3 text-xs font-semibold text-text hover:bg-background">Chat settings খুলুন</a>
                  </div>}
                </div>
                {canUpdate && <div className="hidden lg:block">{conversationActions()}</div>}
              </header>
              {profileOpen && messengerContact && (
                <div className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
                  {profile?.profilePicUrl || conversation.profilePicUrl ? <img src={profile?.profilePicUrl || conversation.profilePicUrl} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="grid h-12 w-12 place-items-center rounded-full bg-background text-primary"><UserRound size={22} /></span>}
                  <div className="min-w-0 flex-1"><p className="font-semibold text-text">{profileBusy ? "Profile লোড হচ্ছে…" : profile?.name || conversation.customerName || `Messenger · ${messengerContact.externalUserId.slice(-6)}`}</p><p className="text-xs text-text-muted">Messenger profile তথ্য · Facebook profile link Meta দেয় না</p>{canUpdate && <form onSubmit={saveMessengerPhone} className="mt-2 flex max-w-sm gap-2"><input value={phoneDraft} onChange={(event) => setPhoneDraft(event.target.value)} placeholder="Customer phone number" aria-label="Messenger customer phone number" className="min-w-0 flex-1 rounded border border-border px-2 py-1 text-xs" /><button type="submit" disabled={phoneBusy || !phoneDraft.trim()} className="rounded bg-primary px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">{phoneBusy ? "Saving…" : "Save & link"}</button></form>}{profileError && <p className="text-xs text-red-600">{profileError}</p>}</div>
                  <button type="button" onClick={() => setProfileOpen(false)} aria-label="Profile বন্ধ করুন" className="rounded p-2 text-text-muted hover:bg-background"><X size={17} /></button>
                </div>
              )}
              <div ref={messageListRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#efeae2] p-3 sm:p-5">
                {conversation.messages.map((message) => {
                  const reactions = Array.isArray(message.metadata?.reactions) ? message.metadata.reactions : [];
                  const reactionGroups = reactions.reduce((groups, reaction) => {
                    const emoji = reaction.emoji || reaction.code;
                    if (!emoji) return groups;
                    const group = groups.find((item) => item.emoji === emoji);
                    if (group) group.items.push(reaction);
                    else groups.push({ emoji, items: [reaction] });
                    return groups;
                  }, []);
                  const imageUrls = [
                    ...(!message.metadata?.productOptions?.length && message.metadata?.image?.url && !(message.authorType === "AI" && message.channel !== "WEBSITE" && (message.metadata?.type !== "PRODUCT_MEDIA" || message.deliveryStatus === "FAILED")) ? [message.metadata.image.url] : []),
                    ...(message.metadata?.image?.mediaId && message.channel === "WHATSAPP"
                      ? [`/api/admin/chat/media/${encodeURIComponent(message.id)}`]
                      : []),
                    ...(message.metadata?.image?.mediaId && message.channel === "TIKTOK"
                      ? [`/api/admin/chat/media/${encodeURIComponent(message.id)}`]
                      : []),
                    ...(message.metadata?.attachments || [])
                      .filter((attachment) => attachment.type === "image" && /^https:\/\//i.test(attachment.payload?.url || ""))
                      .map((attachment) => attachment.payload.url),
                  ];
                  return (
                  <div
                    key={message.id}
                    ref={(element) => {
                      if (element) messageElementsRef.current.set(message.id, element);
                      else messageElementsRef.current.delete(message.id);
                    }}
                    tabIndex={-1}
                    className={`group relative flex ${message.direction === "OUTBOUND" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-[85%] rounded-2xl px-3 py-2 transition-shadow duration-300 ${focusedReplyMessageId === message.id ? "ring-4 ring-violet-500 ring-offset-2 ring-offset-[#efeae2]" : ""} ${message.direction === "OUTBOUND" ? "rounded-tr-sm bg-[#d9fdd3] text-slate-900 shadow-sm" : "rounded-tl-sm bg-white text-slate-800 shadow-sm"}`}
                    >
                      {message.metadata?.needsHumanAssistant && <p className="mb-1 rounded bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">Need human assistant</p>}
                      {canUpdate && (
                        <div
                          ref={(element) => {
                            if (element) messageActionMenusRef.current.set(message.id, element);
                            else messageActionMenusRef.current.delete(message.id);
                          }}
                          className={`absolute top-2 z-20 flex items-center gap-1 rounded-full border border-black/10 bg-white/95 p-1 text-slate-700 shadow-md transition-opacity opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 ${message.direction === "OUTBOUND" ? "right-full mr-2" : "left-full ml-2"}`}
                        >
                          <button
                            type="button"
                            onClick={() => startReplyToMessage(message)}
                            aria-label="এই message-এর reply দিন"
                            title="Reply"
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          ><Reply size={17} /></button>
                          {message.channel === "MESSENGER" && message.externalMessageId && (
                            <button
                              type="button"
                              onClick={() => setReactionPickerMessageId((current) => current === message.id ? null : message.id)}
                              aria-label="এই message-এ reaction দিন"
                              aria-expanded={reactionPickerMessageId === message.id}
                              title="React"
                              className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                            ><Smile size={18} /></button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenMessageMenuId((current) => current === message.id ? null : message.id);
                              setReactionPickerMessageId(null);
                            }}
                            aria-label="Message options"
                            aria-haspopup="menu"
                            aria-expanded={openMessageMenuId === message.id}
                            className="grid h-8 w-8 place-items-center rounded-full hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          >
                            <ChevronDown size={15} />
                          </button>
                          {reactionPickerMessageId === message.id && (
                            <div className="absolute right-0 top-full mt-2 flex gap-1 rounded-full border border-border bg-white p-1 text-lg shadow-lg" aria-label="Messenger reaction বাছুন">
                              {messengerReactions.map((emoji) => (
                                <button key={emoji} type="button" disabled={reactionBusyId === message.id} onClick={() => reactToMessage(message, emoji)} aria-label={`${emoji} reaction দিন`} className="grid h-9 w-9 place-items-center rounded-full hover:bg-background disabled:opacity-50">{emoji}</button>
                              ))}
                            </div>
                          )}
                          {openMessageMenuId === message.id && (
                            <div role="menu" className="absolute right-0 top-7 z-20 min-w-36 rounded-lg border border-border bg-white p-1 text-slate-800 shadow-lg">
                              <button
                                type="button"
                                role="menuitem"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(message.content || "");
                                    setError("");
                                  } catch {
                                    setError("Message copy করা যায়নি।");
                                  }
                                  setOpenMessageMenuId(null);
                                }}
                                className="block w-full rounded px-3 py-2 text-left text-xs font-semibold hover:bg-background"
                              >Copy message</button>
                            </div>
                          )}
                        </div>
                      )}
                      {message.metadata?.replyTo && (
                        <button
                          type="button"
                          onClick={() => jumpToMessage(message.metadata.replyTo.id)}
                          disabled={!message.metadata.replyTo.id}
                          aria-label={`মূল message-এ যান: ${message.metadata.replyTo.content || "message"}`}
                          className={`mb-2 block w-full border-l-2 border-primary/50 bg-black/5 px-2 py-1 text-left text-xs ${message.metadata.replyTo.id ? "cursor-pointer hover:bg-black/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" : "cursor-default"}`}
                        >
                          <span className="font-semibold">{message.metadata.replyTo.direction === "OUTBOUND" ? "Reply to your message" : "Reply to customer message"}</span>
                          <p className="line-clamp-2">{normalizeChatText(message.metadata.replyTo.content)}</p>
                        </button>
                      )}
                      {message.metadata?.type === "PRODUCT_CARD" &&
                        message.metadata?.product &&
                        (!message.metadata.product.mode || message.metadata.product.mode === "photo-price") && (
                          <div className="mb-2 block overflow-hidden rounded-xl bg-white text-gray-900">
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
                          </div>
                        )}
                      {message.metadata?.product?.buyNowUrl && !message.metadata?.product?.mode && (
                        <a href={message.metadata.product.buyNowUrl} target="_blank" rel="noreferrer" className="mb-2 inline-flex rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white">এখনই কিনুন</a>
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
                      {imageUrls.map((imageUrl, index) => (
                        <a key={`${message.id}-image-${index}`} href={imageUrl} target="_blank" rel="noreferrer" className="mb-2 block max-w-sm overflow-hidden rounded-xl">
                          <img src={imageUrl} alt="Customer sent image" loading="lazy" className="max-h-80 w-full object-contain" />
                        </a>
                      ))}
                      {(message.channel === "WEBSITE" || (message.channel === "MESSENGER" && message.metadata?.type === "PRODUCT_MEDIA" && message.deliveryStatus !== "FAILED") ? message.metadata?.productOptions || [] : []).map((product, index) => (
                        <div key={`${message.id}-product-${product.id}`} className="mb-2 max-w-sm overflow-hidden rounded-xl border border-black/10 bg-white">
                          {product.imageUrl && <a href={product.imageUrl} target="_blank" rel="noreferrer"><img src={product.imageUrl} alt={product.title} loading="lazy" className="max-h-64 w-full object-contain" /></a>}
                          <div className="p-3 text-sm"><strong>পণ্য-{message.metadata?.suggestionIndex || index + 1}: {product.title}</strong>{product.price != null && <p className="mt-1 font-semibold">৳{Number(product.price).toLocaleString("en-BD")}</p>}<p className={`mt-1 text-xs font-semibold ${product.inStock === false ? "text-red-600" : "text-emerald-700"}`}>{product.inStock === false ? "স্টকে নেই" : "স্টকে আছে"}</p>{product.features?.length > 0 && <p className="mt-1 text-xs text-slate-600">{product.features.join(" · ")}</p>}{product.variants?.length > 1 && <ul className="mt-2 space-y-2 text-xs text-slate-700">{product.variants.map((variant, variantIndex) => <li key={`${product.id}-variant-${variantIndex}`} className="flex items-center gap-2">{variant.imageUrl && <img src={variant.imageUrl} alt="" loading="lazy" className="h-8 w-8 rounded object-cover" />}<span>• {variant.label}{variant.price != null ? ` · ৳${Number(variant.price).toLocaleString("en-BD")}` : ""}{variant.inStock === false ? " · স্টক নেই" : ""}</span></li>)}</ul>}<div className="mt-3 flex gap-2">{product.url && <a href={product.url} target="_blank" rel="noreferrer" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-center text-xs font-semibold text-slate-700">পণ্য দেখুন</a>}{product.buyNowUrl && <a href={product.buyNowUrl} target="_blank" rel="noreferrer" className="flex-1 rounded-lg bg-emerald-700 px-3 py-2 text-center text-xs font-semibold text-white">এখনই কিনুন</a>}</div><div className="mt-2 rounded-lg bg-primary px-3 py-2 text-center text-xs font-semibold text-white">Select this product</div></div>
                        </div>
                      ))}
                      {!["PRODUCT_CARD", "ORDER_TIMELINE"].includes(
                        message.metadata?.type,
                      ) && !(imageUrls.length && ["[image message]", "📷 Photo"].includes(message.content)) && (
                        message.authorType === "AI" &&
                      message.deliveryStatus === "SENDING" ? (
                        <div
                          role="status"
                          aria-label="AI উত্তর লিখছে"
                          className="flex min-w-14 items-center justify-center gap-1 rounded-full bg-slate-100 px-3 py-2"
                        >
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className="h-2 w-2 animate-bounce rounded-full bg-slate-500"
                              style={{ animationDelay: `${dot * 160}ms` }}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {normalizeChatText(message.content)}
                        </p>
                      )
                      )}
                      <p
                        className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${message.direction === "OUTBOUND" ? "text-slate-500" : "text-text-muted"}`}
                      >
                        {message.authorType === "AI"
                          ? "AI"
                          : message.authorType === "AGENT"
                            ? "Staff"
                            : channelLabels[message.channel]}{" "}
                        · {dateTime(message.createdAt)}{message.metadata?.edited && <span className="ml-1 italic">· edited</span>}
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
                            {message.deliveryStatus === "FAILED" && message.authorType === "AGENT" &&
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
                      {message.metadata?.deliveryError && message.deliveryStatus === "FAILED" && (
                        <p className="mt-1 text-xs text-red-700">Meta delivery error {message.metadata.deliveryError.code}: {message.metadata.deliveryError.title || message.metadata.deliveryError.message}</p>
                      )}
                      {message.metadata?.imageWarnings?.length > 0 && (
                        <p className="mt-1 text-xs text-amber-700">পণ্যের ছবি পাঠানো যায়নি; customer-কে পণ্যের লিংক পাঠানো হয়েছে।</p>
                      )}
                      {reactionGroups.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1" aria-label="Message reactions">
                          {reactionGroups.map((group) => (
                            <button
                              key={group.emoji}
                              type="button"
                              disabled={!canUpdate || reactionBusyId === message.id || message.channel !== "MESSENGER"}
                              onClick={() => reactToMessage(message, group.emoji)}
                              title={group.items.map((item) => item.actorType === "AGENT" ? "Page" : "Customer").join(", ")}
                              className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs ${group.items.some((item) => item.actorType === "AGENT") ? "border-primary/40 bg-primary/10" : "border-black/10 bg-white/70"} disabled:cursor-default`}
                            >{group.emoji}<span className="text-[10px]">{group.items.length}</span></button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
              <div className="shrink-0 bg-white px-3 lg:border-t lg:border-black/5 lg:px-4 lg:pt-3">
                <div className="hidden flex-wrap items-center gap-2 rounded-lg bg-background px-2 py-2 lg:flex">
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
                    disabled={!canUpdate || replyClosed}
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
                              replyClosed
                            }
                            onClick={() => sendOrderTimeline(order)}
                            className="ml-auto rounded-md bg-brand px-2.5 py-1.5 font-semibold text-white disabled:opacity-50"
                          >
                            {sendingItemId === `order:${order.id}` ? <span className="inline-flex items-center gap-1"><LoaderCircle size={13} className="animate-spin" />পাঠাচ্ছি…</span> : "অর্ডারের অবস্থা পাঠান"}
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
              <div className="shrink-0 border-t border-border bg-surface p-3 sm:px-4">
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
                        <div className="flex shrink-0 items-center gap-1">
                          <select
                            aria-label={`${product.title} পাঠানোর ধরন`}
                            value={productSendMode}
                            onChange={(event) => setProductSendMode(event.target.value)}
                            className="max-w-28 rounded-md border border-border bg-background px-1.5 py-1.5 text-[11px] text-text"
                          >
                            <option value="page">Product page</option>
                            <option value="order">Order link</option>
                            <option value="photo-price">Photo + price</option>
                          </select>
                          <button
                            type="button"
                            disabled={busy || replyClosed}
                            onClick={() => sendProduct(product)}
                            className="rounded-lg bg-brand px-2 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {sendingItemId === `product:${product.id}` ? <span className="inline-flex items-center gap-1"><LoaderCircle size={13} className="animate-spin" />পাঠাচ্ছি…</span> : "পণ্য পাঠান"}
                          </button>
                        </div>
                      </div>
                    ))}
                    {productsLoading && <p role="status" className="flex items-center justify-center gap-2 py-3 text-xs text-text-muted"><LoaderCircle size={15} className="animate-spin" />পণ্য খুঁজছি…</p>}
                    {productQuery.length >= 2 && !productsLoading && !products.length && (
                      <p className="py-3 text-center text-xs text-text-muted">
                        কোনো product পাওয়া যায়নি।
                      </p>
                    )}
                  </div>
                </div>
              )}
              <form
                onSubmit={sendReply}
                className="relative z-10 mt-auto shrink-0 border-t border-black/5 bg-white p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-4"
              >
    <input ref={photoInputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={(event) => { setPhotoFile(event.target.files?.[0] || null); setSelectedChatMedia(null); }} />
                {replyToMessage && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border-l-2 border-primary bg-primary-soft px-3 py-2 text-xs">
                    <Reply size={14} className="shrink-0 text-primary" />
                    <span className="min-w-0 flex-1 truncate">Reply: {replyToMessage.content || "Photo"}</span>
                    <button type="button" onClick={() => setReplyToMessage(null)} aria-label="Reply cancel" className="rounded p-1 hover:bg-white"><X size={14} /></button>
                  </div>
                )}
                {photoFile && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs">
                    <ImagePlus size={14} className="text-primary" />
                    <span className="min-w-0 flex-1 truncate">{photoFile.name}</span>
                    <button type="button" onClick={() => { setPhotoFile(null); if (photoInputRef.current) photoInputRef.current.value = ""; }} aria-label="Photo সরান" className="rounded p-1 hover:bg-white"><X size={14} /></button>
                  </div>
                )}
                {selectedChatMedia && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg bg-background px-3 py-2 text-xs">
                    <img src={selectedChatMedia.url} alt="" className="h-10 w-10 rounded object-cover" />
                    <span className="min-w-0 flex-1 truncate">{selectedChatMedia.displayName || selectedChatMedia.name}</span>
                    <button type="button" onClick={() => setSelectedChatMedia(null)} aria-label="Media photo সরান" className="rounded p-1 hover:bg-white"><X size={14} /></button>
                  </div>
                )}
                {conversation.linkedConversations?.length > 1 && <label className="mb-2 hidden items-center gap-2 text-xs font-semibold text-text-muted lg:flex">Reply via <select value={replyTarget?.channel || ""} onChange={(event) => setReplyChannel(event.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-xs text-text">{conversation.linkedConversations.map((item) => <option key={item.id} value={item.channel}>{channelLabels[item.channel]}{item.status === "CLOSED" ? " (Closed)" : ""}</option>)}</select></label>}
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
                  <div ref={attachmentsMenuRef} className="relative shrink-0 lg:hidden">
                    <button type="button" onClick={() => setAttachmentsOpen((open) => !open)} disabled={!canUpdate || replyClosed || busy} aria-label="ছবি ও পণ্য পাঠানোর অপশন" title="ছবি বা পণ্য পাঠান" aria-expanded={attachmentsOpen} aria-controls="chat-attachments" className="grid h-11 w-11 place-items-center rounded-full text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"><Plus size={26} className={`transition-transform ${attachmentsOpen ? "rotate-45" : ""}`} /></button>
                    {attachmentsOpen && <div id="chat-attachments" role="group" aria-label="ছবি ও পণ্য পাঠান" className="absolute bottom-full left-0 z-30 mb-3 w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-white p-2 shadow-xl">
                      <button type="button" onClick={() => { setAttachmentsOpen(false); photoInputRef.current?.click(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-background"><ImagePlus size={21} className="text-violet-600" /><span>ফোন থেকে ছবি দিন<span className="block text-xs font-normal text-text-muted">নতুন ছবি আপলোড করুন</span></span></button>
                      <button type="button" onClick={() => { setAttachmentsOpen(false); openChatMediaPicker(); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-background"><Images size={21} className="text-blue-600" /><span>লাইব্রেরি থেকে ছবি<span className="block text-xs font-normal text-text-muted">আগে আপলোড করা ছবি বাছুন</span></span></button>
                      <button type="button" onClick={() => { setAttachmentsOpen(false); setProductPanel((open) => !open); }} className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold hover:bg-background"><Package size={21} className="text-emerald-700" /><span>পণ্যের কার্ড পাঠান<span className="block text-xs font-normal text-text-muted">নাম বা কোড দিয়ে পণ্য খুঁজুন</span></span></button>
                    </div>}
                  </div>
                  <button type="button" onClick={() => photoInputRef.current?.click()} disabled={!canUpdate || replyClosed || busy} aria-label="Photo upload করুন" title="নতুন ছবি আপলোড করুন" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-primary hover:bg-background disabled:opacity-50 lg:inline-flex"><ImagePlus size={19} /></button>
                  <button type="button" onClick={openChatMediaPicker} disabled={!canUpdate || replyClosed || busy} aria-label="Media Library থেকে photo বাছুন" title="আগে আপলোড করা ছবি বাছুন" className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-primary hover:bg-background disabled:opacity-50 lg:inline-flex"><Images size={19} /></button>
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
                    rows={1}
                    maxLength={4000}
                    disabled={!canUpdate || replyClosed}
                    placeholder={
                      photoFile || selectedChatMedia
                        ? "Photo caption লিখুন (ঐচ্ছিক)"
                        : replyClosed
                        ? "Reply দিতে conversation reopen করুন"
                        : canUpdate
                          ? `${channelLabels[replyTarget?.channel] || "চ্যাট"}-এ বার্তা লিখুন…`
                          : "আপনার chat:update permission নেই"
                    }
                    className="max-h-32 min-h-11 min-w-0 flex-1 resize-y rounded-2xl border-0 bg-[#f0f2f5] px-4 py-2 text-sm text-slate-800 outline-none ring-1 ring-black/5 focus:ring-emerald-600 disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    aria-label={busy ? "বার্তা পাঠানো হচ্ছে" : "বার্তা পাঠান"}
                    aria-busy={busy}
                    disabled={
                      busy || !canUpdate ||
                      (!draft.trim() && !photoFile && !selectedChatMedia) ||
                      replyClosed
                    }
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-700 px-4 font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-50"
                  >
                    {busy ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
                    <span className="hidden sm:inline">{busy ? "পাঠাচ্ছি…" : "পাঠান"}</span>
                  </button>
                </div>
                <p className="mt-2 hidden text-[11px] text-text-muted lg:block">
                  Website reply visitor-এর chat-এ যাবে; Meta reply সংশ্লিষ্ট
                  WhatsApp, Messenger, Instagram বা TikTok channel-এ পাঠানো হবে।
                </p>
              </form>
              {mediaPickerOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-6" onClick={() => setMediaPickerOpen(false)}>
                  <section role="dialog" aria-modal="true" aria-labelledby="chat-media-title" className="flex max-h-[85dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
                    <header className="flex items-center gap-3 border-b border-border p-4">
                      <div className="min-w-0 flex-1"><h2 id="chat-media-title" className="font-bold text-text">Media Library</h2><p className="text-xs text-text-muted">JPG বা PNG photo বেছে নিন।</p></div>
                      <button type="button" onClick={() => setMediaPickerOpen(false)} aria-label="Media picker বন্ধ করুন" className="rounded p-2 text-text-muted hover:bg-background"><X size={18} /></button>
                    </header>
                    <div className="border-b border-border p-3"><input value={chatMediaSearch} onChange={(event) => setChatMediaSearch(event.target.value)} placeholder="ছবির নাম খুঁজুন" aria-label="Media Library-তে ছবি খুঁজুন" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-text" /></div>
                    <div className="min-h-0 flex-1 overflow-y-auto p-3">
                      {chatMediaLoading ? <p role="status" className="flex items-center justify-center gap-2 py-10 text-sm text-text-muted"><LoaderCircle size={18} className="animate-spin" />ছবির লাইব্রেরি লোড হচ্ছে…</p> : chatMediaItems.filter((item) => `${item.displayName || ""} ${item.name}`.toLowerCase().includes(chatMediaSearch.trim().toLowerCase())).length ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                          {chatMediaItems.filter((item) => `${item.displayName || ""} ${item.name}`.toLowerCase().includes(chatMediaSearch.trim().toLowerCase())).map((item) => (
                            <button key={item.id} type="button" onClick={() => selectChatMedia(item)} className="overflow-hidden rounded-xl border border-border text-left hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                              <img src={item.url} alt={item.displayName || item.name} loading="lazy" className="aspect-square w-full bg-background object-cover" />
                              <span className="block truncate p-2 text-xs font-semibold text-text">{item.displayName || item.name}</span>
                            </button>
                          ))}
                        </div>
                      ) : <p className="py-10 text-center text-sm text-text-muted">Media Library-তে কোনো JPG/PNG photo পাওয়া যায়নি।</p>}
                    </div>
                  </section>
                </div>
              )}
            </>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col text-text-muted">
              {selectedId && <div className="border-b border-border p-3 lg:hidden"><button type="button" onClick={() => { setSelectedId(""); setConversation(null); }} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-semibold text-emerald-800"><ArrowLeft size={21} />ইনবক্সে ফিরুন</button></div>}
              <div className="grid flex-1 place-items-center p-8 text-center">
              <div>
                {conversationLoading ? <LoaderCircle className="mx-auto mb-3 h-9 w-9 animate-spin text-emerald-700" /> : <MessagesSquare className="mx-auto mb-3 h-10 w-10 opacity-40" />}
                <p role="status">{conversationLoading ? "চ্যাট লোড হচ্ছে…" : selectedId ? "চ্যাটটি লোড হয়নি" : "লিস্ট থেকে একটি চ্যাট বেছে নিন"}</p>
                {selectedId && !conversationLoading && <button type="button" onClick={loadConversation} className="mt-3 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-primary">আবার চেষ্টা করুন</button>}
              </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
