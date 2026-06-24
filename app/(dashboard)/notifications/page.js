"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError } from "@/lib/api";
import { refreshBadges } from "@/lib/useBadges";
import { useI18n } from "@/lib/i18n";

const EMPTY_FORM = { title: "", body: "", href: "" };

const ALERT_ICON = {
  recharge_pending: "deposit",
  withdraw_pending: "withdraw",
  kyc_pending: "idCard",
  chat_message: "message",
  risk_flag: "shieldCheck",
  gas_low: "alert",
  product_pending: "package",
};

function AlertsTab() {
  const { t } = useI18n();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    api.get(`/alerts?status=${filter}`)
      .then((d) => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function markRead(id) {
    setBusyId(id);
    try {
      await api.post(`/alerts/${id}/read`);
      setItems((prev) => filter === "unread" ? prev.filter((a) => a.id !== id) : prev.map((a) => a.id === id ? { ...a, read: true } : a));
      refreshBadges();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.failed"));
    } finally {
      setBusyId(null);
    }
  }

  async function markAllRead() {
    try {
      await api.post("/alerts/read-all");
      load();
      refreshBadges();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.failed"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-ink-50 rounded-xl p-1">
          {["all", "unread"].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${filter === f ? "bg-white shadow text-ink-800" : "text-muted hover:text-ink-700"}`}>
              {f === "all" ? t("common.all") : t("alerts.unread")}
            </button>
          ))}
        </div>
        <button onClick={markAllRead} className="btn-ghost px-3 py-1.5 text-xs">{t("alerts.markAllRead")}</button>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-ink-100">
          {loading ? (
            <div className="text-center text-muted py-8">{t("common.loading")}</div>
          ) : items.length ? (
            items.map((a) => (
              <div key={a.id} className={`px-5 py-3.5 flex items-start gap-3 ${a.read ? "" : "bg-gold-50/40"}`}>
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.read ? "bg-ink-50 text-ink-400" : "bg-gold-100 text-gold-700"}`}>
                  <Icon name={ALERT_ICON[a.type] || "bell"} size={15} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-800">{a.title}</p>
                  <p className="text-xs text-muted mt-0.5">{a.body}</p>
                  <p className="text-[11px] text-muted mt-1">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {a.href && <a href={a.href} className="text-xs text-gold-600 hover:underline">{t("alerts.view")}</a>}
                  {!a.read && (
                    <button disabled={busyId === a.id} onClick={() => markRead(a.id)} className="btn-ghost px-2.5 py-1 text-xs">
                      {t("alerts.markRead")}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted py-8">{t("alerts.none")}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function BroadcastTab() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [sending, setSending] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get("/notifications/announcements")
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("notifications.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function send(e) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error(t("notifications.titleBodyRequired"));
      return;
    }
    if (!(await confirm({ message: t("notifications.confirmSend"), confirmText: t("notifications.sendToAll") }))) return;
    setSending(true);
    try {
      const created = await api.post("/notifications", {
        title: form.title.trim(),
        body: form.body.trim(),
        href: form.href.trim() || null,
      });
      setItems((prev) => [created, ...prev]);
      setForm(EMPTY_FORM);
      toast.success(t("notifications.sent"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("notifications.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={send} className="card p-5 space-y-3">
        <h3 className="font-semibold text-ink-800">{t("notifications.newAnnouncement")}</h3>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("notifications.fieldTitle")}</label>
          <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="field mt-1" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("notifications.fieldMessage")}</label>
          <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} className="field mt-1 !h-28 !py-2" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("notifications.fieldLink")}</label>
          <input
            value={form.href}
            onChange={(e) => setForm((f) => ({ ...f, href: e.target.value }))}
            className="field mt-1"
            placeholder={t("notifications.linkPlaceholder")}
          />
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={sending} className="btn-primary px-4 py-2 text-sm">
            {sending ? t("notifications.sending") : t("notifications.sendToAll")}
          </button>
        </div>
      </form>

      {error && <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>}

      <div>
        <h3 className="font-semibold text-ink-800 mb-3">{t("notifications.recent")}</h3>
        <div className="card p-0 overflow-hidden">
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("notifications.colTitle")}</th>
                  <th>{t("notifications.colMessage")}</th>
                  <th>{t("notifications.colLink")}</th>
                  <th>{t("notifications.colSentBy")}</th>
                  <th>{t("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-8">{t("common.loading")}</td>
                  </tr>
                ) : items.length ? (
                  items.map((a) => (
                    <tr key={a.id}>
                      <td className="font-medium text-ink-800">{a.title}</td>
                      <td className="text-muted max-w-md truncate">{a.body}</td>
                      <td className="text-muted text-xs">{a.href || "—"}</td>
                      <td className="text-muted">{a.createdBy || "—"}</td>
                      <td className="whitespace-nowrap text-muted">{a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-8">{t("notifications.noneSent")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState("alerts");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("notifications.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("notifications.subtitle")}</p>
      </div>

      <div className="flex gap-1 bg-ink-50 rounded-xl p-1 w-fit">
        {["alerts", "broadcast"].map((tb) => (
          <button key={tb} onClick={() => setTab(tb)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === tb ? "bg-white shadow text-ink-800" : "text-muted hover:text-ink-700"}`}>
            {tb === "alerts" ? t("alerts.tabAlerts") : t("alerts.tabBroadcast")}
          </button>
        ))}
      </div>

      {tab === "alerts" ? <AlertsTab /> : <BroadcastTab />}
    </div>
  );
}
