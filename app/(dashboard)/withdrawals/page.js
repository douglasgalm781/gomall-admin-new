"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_FILTERS = ["reviewing", "completed", "rejected", "all"];

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function WithdrawalsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("reviewing");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ status });
    if (q.trim()) params.set("q", q.trim());
    api
      .get(`/withdraw?${params.toString()}`)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("withdrawals.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function onSearchSubmit(e) {
    e.preventDefault();
    load();
  }

  async function review(id, action) {
    if (action === "reject" && !(await confirm({ message: t("withdrawals.confirmReject"), danger: true }))) return;
    setBusyId(id);
    try {
      const updated = await api.post(`/withdraw/${id}/${action}`);
      if (status === "all") {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
      toast.success(action === "confirm" ? t("withdrawals.completed", { account: updated.account }) : t("withdrawals.rejected", { account: updated.account }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("withdrawals.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("withdrawals.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("withdrawals.subtitle")}</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <form onSubmit={onSearchSubmit} className="flex-1 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.searchByAccount")} className="field flex-1" />
          <button type="submit" className="btn-primary px-4 h-[46px]">
            <Icon name="search" size={18} />
          </button>
        </form>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:w-44">
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
                <th>{t("common.account")}</th>
                <th>{t("common.amount")}</th>
                <th>{t("withdrawals.colFee")}</th>
                <th>{t("withdrawals.colNet")}</th>
                <th>{t("withdrawals.colWallet")}</th>
                <th>{t("withdrawals.colAddress")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.submitted")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((w) => (
                  <tr key={w.id}>
                    <td className="font-medium text-ink-800">{w.account}</td>
                    <td>{money(w.amount)}</td>
                    <td>{money(w.fee)}</td>
                    <td className="font-medium">{money(w.netAmount)}</td>
                    <td className="uppercase">{w.walletType}</td>
                    <td className="text-muted text-xs max-w-[200px] truncate" title={w.walletAddress}>{w.walletAddress}</td>
                    <td><StatusPill status={w.status} /></td>
                    <td className="whitespace-nowrap text-muted">{w.createdAt ? new Date(w.createdAt).toLocaleString() : "—"}</td>
                    <td className="whitespace-nowrap">
                      {w.status === "reviewing" ? (
                        <div className="flex gap-2">
                          <button
                            disabled={busyId === w.id}
                            onClick={() => review(w.id, "confirm")}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            {t("common.confirm")}
                          </button>
                          <button
                            disabled={busyId === w.id}
                            onClick={() => review(w.id, "reject")}
                            className="btn-danger px-3 py-1.5 text-xs"
                          >
                            {t("common.reject")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">
                          {w.reviewedAt ? new Date(w.reviewedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">{t("withdrawals.noRequests")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
