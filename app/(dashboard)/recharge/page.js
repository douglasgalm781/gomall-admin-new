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

function short(str, head = 6, tail = 6) {
  if (!str) return "";
  return str.length > head + tail + 1 ? `${str.slice(0, head)}…${str.slice(-tail)}` : str;
}

// Links the admin to a public block explorer to verify the on-chain transfer.
function explorerUrl(method, txHash) {
  if (!txHash) return null;
  if (/erc20/i.test(method)) return `https://etherscan.io/tx/${txHash}`;
  if (/trc20/i.test(method)) return `https://tronscan.org/#/transaction/${txHash}`;
  return null;
}

export default function RechargePage() {
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
      .get(`/recharge?${params.toString()}`)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("recharge.failed")))
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
    if (action === "reject" && !(await confirm({ message: t("recharge.confirmReject"), danger: true }))) return;
    setBusyId(id);
    try {
      const updated = await api.post(`/recharge/${id}/${action}`);
      if (status === "all") {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
      toast.success(action === "confirm" ? t("recharge.confirmed", { account: updated.account }) : t("recharge.rejected", { account: updated.account }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("recharge.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("recharge.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("recharge.subtitle")}</p>
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
                <th>{t("recharge.colMethod")}</th>
                <th>{t("recharge.colRegion")}</th>
                <th>{t("recharge.colProofTx")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.submitted")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium text-ink-800">{r.account}</td>
                    <td>{money(r.amount)}</td>
                    <td className="capitalize">{r.method}</td>
                    <td>{r.region || "—"}</td>
                    <td>
                      {r.proofUrl ? (
                        <a href={r.proofUrl} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline">
                          {t("common.view")}
                        </a>
                      ) : r.txHash ? (
                        <div className="text-xs leading-tight">
                          {explorerUrl(r.method, r.txHash) ? (
                            <a
                              href={explorerUrl(r.method, r.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-gold-600 hover:underline font-mono"
                              title={t("recharge.viewTxTooltip").replace("{hash}", r.txHash)}
                            >
                              {short(r.txHash)}
                            </a>
                          ) : (
                            <span className="font-mono" title={r.txHash}>{short(r.txHash)}</span>
                          )}
                          {r.depositAddress && (
                            <div className="text-muted font-mono mt-0.5" title={t("recharge.depositAddressTooltip").replace("{address}", r.depositAddress)}>
                              → {short(r.depositAddress)}
                            </div>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td><StatusPill status={r.status} /></td>
                    <td className="whitespace-nowrap text-muted">{r.createdAt ? new Date(r.createdAt).toLocaleString() : "—"}</td>
                    <td className="whitespace-nowrap">
                      {r.status === "reviewing" ? (
                        <div className="flex gap-2">
                          <button
                            disabled={busyId === r.id}
                            onClick={() => review(r.id, "confirm")}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            {t("common.confirm")}
                          </button>
                          <button
                            disabled={busyId === r.id}
                            onClick={() => review(r.id, "reject")}
                            className="btn-danger px-3 py-1.5 text-xs"
                          >
                            {t("common.reject")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">
                          {r.reviewedAt ? new Date(r.reviewedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("recharge.noRequests")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
