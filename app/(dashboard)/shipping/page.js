"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_FILTERS = ["all", "pending", "processing", "shipped", "delivered", "cancelled"];

function MerchantTypeBadge({ type }) {
  const { t } = useI18n();
  if (type === "merchant") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gold-100 text-gold-700 border border-gold-200">
        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
        {t("shipping.typeMerchant")}
      </span>
    );
  }
  if (type === "mixed") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-600 border border-violet-200">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
        {t("shipping.typeMixed")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-ink-100 text-ink-500 border border-ink-200">
      <span className="w-1.5 h-1.5 rounded-full bg-ink-400 shrink-0" />
      {t("shipping.typePlatform")}
    </span>
  );
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ShippingPage() {
  const { t } = useI18n();
  const MERCHANT_TYPE_TABS = [
    { key: "all",      label: t("shipping.tabAllOrders") },
    { key: "platform", label: t("shipping.tabPlatform")  },
    { key: "merchant", label: t("shipping.tabMerchant")  },
  ];
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [status, setStatus] = useState("all");
  const [merchantType, setMerchantType] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status !== "all") params.set("status", status);
    if (merchantType !== "all") params.set("merchantType", merchantType);
    if (q.trim()) params.set("q", q.trim());

    api
      .get(`/shipping?${params.toString()}`)
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("shipping.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status, merchantType]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("shipping.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("shipping.subtitle")}</p>
      </div>

      {/* Merchant type filter tabs */}
      <div className="flex gap-1 border-b border-ink-200">
        {MERCHANT_TYPE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setMerchantType(tab.key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              merchantType === tab.key
                ? "border-gold-500 text-gold-600"
                : "border-transparent text-muted hover:text-ink-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <form onSubmit={onSearchSubmit} className="flex-1 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("shipping.searchPlaceholder")} className="field flex-1" />
          <button type="submit" className="btn-primary px-4 h-[46px]">
            <Icon name="search" size={18} />
          </button>
        </form>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="field sm:w-44"
        >
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>
              {s === "all" ? t("common.allStatuses") : s}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("shipping.colOrder")}</th>
                <th>{t("common.account")}</th>
                <th>{t("shipping.colType")}</th>
                <th>{t("shipping.colItems")}</th>
                <th>{t("shipping.colTotal")}</th>
                <th>{t("common.status")}</th>
                <th>{t("shipping.colUnread")}</th>
                <th>{t("common.created")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((o) => (
                  <tr key={o.id} className={o.merchantType === "merchant" ? "bg-gold-50/40" : ""}>
                    <td className="font-mono text-xs text-muted">
                      <Link href={`/shipping/${o.id}`} className="text-gold-600 hover:underline">
                        {o.id}
                      </Link>
                    </td>
                    <td className="font-medium text-ink-800">{o.account}</td>
                    <td><MerchantTypeBadge type={o.merchantType} /></td>
                    <td>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {o.items[0]?.snapshot?.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.items[0].snapshot.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-ink-100 shrink-0" />
                        )}
                        <div className="line-clamp-1">
                          {o.items[0]?.snapshot?.title || "—"}
                          {o.items.length > 1 ? t("shipping.moreItems", { count: o.items.length - 1 }) : ""}
                        </div>
                      </div>
                    </td>
                    <td className="font-medium">{money(o.total)}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td>
                      {o.unread > 0 && (
                        <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-gold-500 text-white text-[11px] font-semibold">
                          {o.unread}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("shipping.noOrders")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{t("shipping.pageInfo", { page, totalPages, total })}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {t("common.previous")}
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40"
            >
              {t("common.next")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
