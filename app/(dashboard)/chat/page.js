"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { api, ApiError } from "@/lib/api";
import { refreshBadges } from "@/lib/useBadges";
import { useI18n } from "@/lib/i18n";

export default function ChatPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [conversations, setConversations] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [activeUserId, setActiveUserId] = useState(null);
  const [thread, setThread] = useState(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const TEXTAREA_MIN_H = 46;
  const TEXTAREA_MAX_H = 80;

  function autoGrow(el) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_H), TEXTAREA_MAX_H) + "px";
  }

  function loadConversations() {
    api
      .get("/chat")
      .then((data) => setConversations(data.items || []))
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    loadConversations();
    const id = setInterval(loadConversations, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeUserId) return;
    let firstLoad = true;
    function loadThread() {
      setLoadingThread((prev) => (thread ? prev : true));
      api
        .get(`/chat/${activeUserId}`)
        .then((data) => {
          setThread(data);
          // The GET marks this member's messages read server-side; refresh the
          // sidebar badge once so its count matches the (now-read) conversation.
          if (firstLoad) {
            firstLoad = false;
            refreshBadges();
          }
        })
        .catch((err) => toast.error(err instanceof ApiError ? err.message : t("chat.loadFailed")))
        .finally(() => setLoadingThread(false));
    }
    setThread(null);
    loadThread();
    const id = setInterval(loadThread, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread?.items?.length]);

  async function send() {
    const body = text.trim();
    if (!body || sending || !activeUserId) return;
    setSending(true);
    setText("");
    requestAnimationFrame(() => autoGrow(inputRef.current));
    try {
      const msg = await api.post(`/chat/${activeUserId}`, { body });
      setThread((prev) => prev && { ...prev, items: [...prev.items, msg] });
      loadConversations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("chat.sendFailed"));
      setText(body);
      requestAnimationFrame(() => autoGrow(inputRef.current));
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function selectConversation(userId) {
    setActiveUserId(userId);
    setConversations((prev) => prev.map((c) => (c.userId === userId ? { ...c, unread: 0 } : c)));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("chat.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("chat.subtitle")}</p>
      </div>

      <div className="card p-0 overflow-hidden grid grid-cols-1 md:grid-cols-[280px_1fr] h-[75vh] min-h-[480px] max-h-[760px]">
        {/* Conversation list */}
        <div className="border-r border-ink-100 overflow-y-auto">
          {loadingList ? (
            <div className="p-4 text-center text-muted text-sm">{t("common.loading")}</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted text-sm">{t("chat.noConversations")}</div>
          ) : (
            conversations.map((c) => (
              <button
                key={c.userId}
                onClick={() => selectConversation(c.userId)}
                className={`w-full text-left px-4 py-3 border-b border-ink-50 transition ${
                  activeUserId === c.userId ? "bg-gold-50" : "hover:bg-ink-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-ink-800 truncate">{c.account}</span>
                  {c.unread > 0 && (
                    <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gold-500 text-white text-[11px] font-semibold">
                      {c.unread}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted truncate mt-0.5">
                  {c.lastSender === "admin" ? t("chat.you") : ""}
                  {c.lastMessage}
                </p>
                <p className="text-[11px] text-muted/70 mt-0.5">
                  {c.lastAt ? new Date(c.lastAt).toLocaleString() : ""}
                </p>
              </button>
            ))
          )}
        </div>

        {/* Thread */}
        <div className="flex flex-col h-full overflow-hidden">
          {!activeUserId ? (
            <div className="flex-1 flex items-center justify-center text-muted text-sm">
              {t("chat.selectConversation")}
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-ink-100 font-medium text-ink-800">
                {thread?.user?.account || "…"}
              </div>
              <div className="flex-1 min-h-0 overflow-y-scroll px-4 py-3 space-y-3">
                {loadingThread && !thread ? (
                  <div className="text-center text-muted text-sm pt-8">{t("common.loading")}</div>
                ) : (
                  thread?.items?.map((m) => (
                    <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                          m.sender === "admin" ? "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-900" : "bg-ink-50 text-ink-800"
                        }`}
                      >
                        <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${m.sender === "admin" ? "text-ink-900/50" : "text-muted"}`}>
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={bottomRef} />
              </div>
              <div className="px-4 py-3 border-t border-ink-100 flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={text}
                  onChange={(e) => { setText(e.target.value); autoGrow(e.target); }}
                  onKeyDown={onKeyDown}
                  placeholder={t("chat.replyPlaceholder")}
                  className="field flex-1 resize-none leading-relaxed overflow-y-auto input-scrollbar"
                  style={{ height: `${TEXTAREA_MIN_H}px`, padding: "12px 14px" }}
                />
                <button
                  onClick={send}
                  disabled={sending || !text.trim()}
                  className="shrink-0 text-gold-600 hover:text-gold-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all duration-200 active:scale-90 p-1"
                  aria-label={t("common.send")}
                >
                  <Icon name="send" size={24} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
