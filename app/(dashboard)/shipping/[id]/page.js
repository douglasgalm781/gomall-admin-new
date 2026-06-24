"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { refreshBadges } from "@/lib/useBadges";

const SHIPPING_STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"];

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ShippingDetailPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const toast = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [messages, setMessages] = useState([]);
  const [loadingThread, setLoadingThread] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [replyAsShopId, setReplyAsShopId] = useState("");
  const bottomRef = useRef(null);

  function loadOrder() {
    api
      .get(`/shipping/${id}`)
      .then((data) => {
        setOrder(data);
        setStatus(data.status);
        setAdminNote(data.adminNote || "");
        if (data.stores?.length === 1) setReplyAsShopId(String(data.stores[0].id));
      })
      .catch((err) => toast.error(err instanceof ApiError ? err.message : t("shipping.detailFailed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    function load() {
      api
        .get(`/shipping/${id}/messages`)
        .then((data) => {
          setMessages(data.items || []);
          refreshBadges();
        })
        .catch(() => {})
        .finally(() => setLoadingThread(false));
    }
    load();
    const timer = setInterval(load, 4000);
    return () => clearInterval(timer);
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function saveStatus() {
    setSaving(true);
    try {
      const data = await api.patch(`/shipping/${id}`, { status, adminNote });
      setOrder(data);
      toast.success(t("shipping.updated"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("shipping.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function send() {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setText("");
    try {
      const msg = await api.post(`/shipping/${id}/messages`, { body, shopId: replyAsShopId || undefined });
      setMessages((prev) => [...prev, msg]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("shipping.sendFailed"));
      setText(body);
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

  if (loading) {
    return <div className="text-center text-muted py-8">{t("common.loading")}</div>;
  }
  if (!order) {
    return <div className="text-center text-muted py-8">{t("shipping.notFound")}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/shipping" className="text-sm text-gold-600 hover:underline inline-flex items-center gap-1">
          <Icon name="chevronLeft" size={16} /> {t("shipping.back")}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <h2 className="serif text-2xl font-bold text-ink-800">{t("shipping.order", { id: order.id })}</h2>
          <StatusPill status={order.status} />
        </div>
        <p className="text-sm text-muted mt-1">
          {order.account} · {new Date(order.createdAt).toLocaleString()}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <div className="card p-0 overflow-hidden">
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t("shipping.colProduct")}</th>
                    <th>{t("shipping.colQty")}</th>
                    <th>{t("shipping.colUnitPrice")}</th>
                    <th>{t("shipping.colLineTotal")}</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3 min-w-[220px]">
                          {item.snapshot?.image && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.snapshot.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-ink-100 shrink-0" />
                          )}
                          <div>
                            <div className="text-[11px] uppercase tracking-wider text-muted">{item.snapshot?.brand}</div>
                            <div className="line-clamp-1">{item.snapshot?.title}</div>
                          </div>
                        </div>
                      </td>
                      <td>{item.qty}</td>
                      <td>{money(item.unitPrice)}</td>
                      <td className="font-medium">{money(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right font-medium">{t("shipping.total")}</td>
                    <td className="font-semibold">{money(order.total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="card p-4 space-y-4">
            <h3 className="font-semibold text-ink-800">{t("shipping.shipmentStatus")}</h3>
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:w-44">
                {SHIPPING_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder={t("shipping.adminNotePlaceholder")}
                className="field flex-1"
              />
              <button onClick={saveStatus} disabled={saving} className="btn-primary px-4 h-[46px] disabled:opacity-60">
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>

        <div className="card p-0 overflow-hidden flex flex-col h-[70vh] min-h-[420px] max-h-[640px]">
          <div className="px-4 py-3 border-b border-ink-100 font-medium text-ink-800">{t("shipping.orderChat")}</div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {loadingThread && !messages.length ? (
              <div className="text-center text-muted text-sm pt-8">{t("common.loading")}</div>
            ) : messages.length === 0 ? (
              <div className="text-center text-muted text-sm pt-8">{t("shipping.noMessages")}</div>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.sender === "admin" ? "bg-gradient-to-b from-gold-300 to-gold-500 text-ink-900" : "bg-ink-50 text-ink-800"
                    }`}
                  >
                    {m.sender === "admin" && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-900/60 mb-0.5">
                        {m.shopName || t("shipping.fromAdmin")}
                      </p>
                    )}
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
          {order.stores?.length > 0 && (
            <div className="px-4 py-2 border-t border-ink-100 flex items-center gap-2">
              <span className="text-[11px] text-muted shrink-0">{t("shipping.replyAs")}</span>
              <select value={replyAsShopId} onChange={(e) => setReplyAsShopId(e.target.value)} className="field !h-8 text-xs flex-1">
                <option value="">{t("shipping.fromAdmin")}</option>
                {order.stores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="px-4 py-3 border-t border-ink-100 flex items-center gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={t("shipping.replyPlaceholder")}
              className="field flex-1"
            />
            <button
              onClick={send}
              disabled={sending || !text.trim()}
              className="btn-primary w-11 h-11 rounded-full flex items-center justify-center shrink-0 disabled:opacity-60"
              aria-label={t("common.send")}
            >
              <Icon name="send" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
