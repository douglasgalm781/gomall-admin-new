"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { ApiError, api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_FILTERS = ["all", "pending", "completed", "frozen"];

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function OrdersPage() {
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (status !== "all") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());

    api
      .get(`/orders?${params.toString()}`)
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("orders.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("orders.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("orders.subtitle")}</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <form onSubmit={onSearchSubmit} className="flex-1 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("orders.searchPlaceholder")} className="field flex-1" />
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
                <th>{t("orders.colOrder")}</th>
                <th>{t("common.account")}</th>
                <th>{t("orders.colProduct")}</th>
                <th>{t("orders.colQty")}</th>
                <th>{t("orders.colUnitPrice")}</th>
                <th>{t("orders.colTotal")}</th>
                <th>{t("orders.colCommission")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.created")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((o) => (
                  <tr key={o.id}>
                    <td className="font-mono text-xs text-muted">{o.id}</td>
                    <td className="font-medium text-ink-800">{o.account}</td>
                    <td>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {o.product?.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.product.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-ink-100 shrink-0" />
                        )}
                        <div className="line-clamp-1">{o.product?.title || "—"}</div>
                      </div>
                    </td>
                    <td>{o.qty}</td>
                    <td>{money(o.unitPrice)}</td>
                    <td className="font-medium">{money(o.total)}</td>
                    <td>{money(o.commission)}</td>
                    <td><StatusPill status={o.status} /></td>
                    <td className="whitespace-nowrap text-muted">{o.createdAt ? new Date(o.createdAt).toLocaleString() : "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">{t("orders.noOrders")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{t("orders.pageInfo", { page, totalPages, total })}</span>
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
