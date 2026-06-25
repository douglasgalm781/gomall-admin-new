"use client";
import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError } from "@/lib/api";
import { refreshBadges } from "@/lib/useBadges";
import { useI18n } from "@/lib/i18n";

// ── Cold Wallet Modal ───────────────────────────────────────────────────────
const EMPTY_CW = { coldWalletTrc20: "", coldWalletErc20: "" };

// Minimum recommended gas wallet balances (for UI warnings only)
const ETH_MIN_WARN = 0.005; // ETH
const TRX_MIN_WARN = 50;    // TRX

function BalancePill({ value, unit, min }) {
  const num  = parseFloat(value) || 0;
  const ok   = num >= min;
  const warn = num > 0 && !ok;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
      num === 0 ? "bg-red-50 text-red-600" :
      warn      ? "bg-amber-50 text-amber-700" :
                  "bg-emerald-50 text-emerald-700"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${num === 0 ? "bg-red-500" : warn ? "bg-amber-400" : "bg-emerald-500"}`} />
      {num === 0 ? `0 ${unit}` : `${value} ${unit}`}
    </span>
  );
}

function ColdWalletModal({ onClose }) {
  const toast = useToast();
  const { t } = useI18n();
  const [cw,       setCw]       = useState(EMPTY_CW);
  const [pm,       setPm]       = useState({});
  const [gasInfo,  setGasInfo]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [gasLoading, setGasLoading] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    api.get("/platform-settings")
      .then((d) => { setCw({ coldWalletTrc20: d.coldWalletTrc20 || "", coldWalletErc20: d.coldWalletErc20 || "" }); setPm(d); })
      .catch(() => {})
      .finally(() => setLoading(false));

    api.get("/platform-settings/gas-wallets")
      .then((d) => setGasInfo(d))
      .catch(() => setGasInfo(null))
      .finally(() => setGasLoading(false));
  }, []);

  function refreshGas() {
    setGasLoading(true);
    api.get("/platform-settings/gas-wallets")
      .then((d) => setGasInfo(d))
      .catch(() => {})
      .finally(() => setGasLoading(false));
  }

  function set(k) { return (e) => setCw((p) => ({ ...p, [k]: e.target.value })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/platform-settings", { ...pm, ...cw });
      toast.success(t("finance.coldWalletSaved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.failedToSave"));
    } finally { setSaving(false); }
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text).then(() => toast.success(t("finance.copied"))).catch(() => {});
  }

  return (
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <div>
            <h3 className="font-semibold text-ink-800 text-lg flex items-center gap-2">
              <Icon name="shield" size={18} className="text-amber-500" />
              {t("finance.sweepConfig")}
            </h3>
            <p className="text-xs text-muted mt-0.5">{t("finance.sweepConfigSub")}</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-ink-700 transition">
            <Icon name="close" size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted text-sm">{t("common.loading")}</div>
        ) : (
          <div className="p-6 space-y-6">

            {/* ── Gas wallet status ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-muted uppercase tracking-widest">
                  {t("finance.gasWallet")}
                </p>
                <button onClick={refreshGas} disabled={gasLoading}
                  className="text-xs text-ink-500 hover:text-ink-700 flex items-center gap-1 disabled:opacity-40">
                  <Icon name="trending" size={12} />
                  {gasLoading ? t("finance.refreshing") : t("finance.refresh")}
                </button>
              </div>

              <div className="rounded-xl border border-ink-100 divide-y divide-ink-100">
                {/* ETH gas wallet */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">ERC20</span>
                      <span className="text-xs font-semibold text-ink-700">{t("finance.ethGasWallet")}</span>
                    </div>
                    {gasInfo ? (
                      <BalancePill value={gasInfo.eth.balanceEth} unit="ETH" min={ETH_MIN_WARN} />
                    ) : (
                      <span className="text-[11px] text-muted">—</span>
                    )}
                  </div>
                  {gasInfo && (
                    <div className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-2">
                      <span className="text-[10.5px] font-mono text-ink-600 break-all flex-1">{gasInfo.eth.address}</span>
                      <button onClick={() => copyText(gasInfo.eth.address)} className="shrink-0 text-ink-400 hover:text-ink-700">
                        <Icon name="copy" size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-muted mt-1.5">
                    {t("finance.path")}{": "}<span className="font-mono">{gasInfo?.eth?.path ?? "m/44'/60'/1'/0/0"}</span>
                    {" · "}{t("finance.ethFundHint")}
                  </p>
                </div>

                {/* TRX gas wallet */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">TRC20</span>
                      <span className="text-xs font-semibold text-ink-700">{t("finance.trxGasWallet")}</span>
                    </div>
                    {gasInfo ? (
                      <BalancePill value={gasInfo.trx.balanceTrx} unit="TRX" min={TRX_MIN_WARN} />
                    ) : (
                      <span className="text-[11px] text-muted">—</span>
                    )}
                  </div>
                  {gasInfo && (
                    <div className="flex items-center gap-2 bg-ink-50 rounded-lg px-3 py-2">
                      <span className="text-[10.5px] font-mono text-ink-600 break-all flex-1">{gasInfo.trx.address}</span>
                      <button onClick={() => copyText(gasInfo.trx.address)} className="shrink-0 text-ink-400 hover:text-ink-700">
                        <Icon name="copy" size={12} />
                      </button>
                    </div>
                  )}
                  <p className="text-[11px] text-muted mt-1.5">
                    {t("finance.path")}{": "}<span className="font-mono">{gasInfo?.trx?.path ?? "m/44'/195'/1'/0/0"}</span>
                    {" · "}{t("finance.trxFundHint")}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  <strong>{t("finance.howItWorksLabel")}</strong>{" "}{t("finance.howItWorks")}
                </p>
              </div>
            </div>

            <div className="border-t border-ink-100" />

            {/* ── Cold wallet destinations ── */}
            <form onSubmit={save} className="space-y-4">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest">{t("finance.coldWalletDestinations")}</p>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                <div className="flex items-start gap-2">
                  <Icon name="info" size={13} className="text-amber-600 mt-0.5 shrink-0" />
                  <p className="text-[11px] text-amber-700 leading-relaxed">
                    {t("finance.coldWalletNote")}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700">TRC20</span>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("finance.tronColdWallet")}</label>
                </div>
                <input value={cw.coldWalletTrc20} onChange={set("coldWalletTrc20")}
                  placeholder="T…" className="field w-full font-mono text-sm" />
                <p className="text-[11px] text-muted mt-1">{t("finance.tronColdWalletHint")}</p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700">ERC20</span>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("finance.ethColdWallet")}</label>
                </div>
                <input value={cw.coldWalletErc20} onChange={set("coldWalletErc20")}
                  placeholder="0x…" className="field w-full font-mono text-sm" />
                <p className="text-[11px] text-muted mt-1">{t("finance.ethColdWalletHint")}</p>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">{t("common.cancel")}</button>
                <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
                  <Icon name="shieldCheck" size={14} />
                  {saving ? t("common.saving") : t("common.save")}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Payment Info Modal ──────────────────────────────────────────────────────
const EMPTY_PM = { usdtTrc20:"", usdtErc20:"", bankName:"", bankAccount:"", bankAccountNo:"", bankSwift:"", bankRouting:"", bankBranch:"", bankExtra:"" };

function PaymentModal({ onClose }) {
  const toast = useToast();
  const { t } = useI18n();
  const [pm, setPm]   = useState(EMPTY_PM);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    api.get("/platform-settings")
      .then((d) => setPm({ ...EMPTY_PM, ...d }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function set(k) { return (e) => setPm((p) => ({ ...p, [k]: e.target.value })); }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/platform-settings", pm);
      toast.success(t("finance.paymentInfoSaved"));
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("common.failedToSave"));
    } finally { setSaving(false); }
  }

  return (
    <div ref={overlayRef} onClick={(e) => e.target === overlayRef.current && onClose()}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
          <h3 className="font-semibold text-ink-800 text-lg">{t("finance.paymentInformation")}</h3>
          <button onClick={onClose} className="text-muted hover:text-ink-700 transition">
            <Icon name="close" size={20} />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted text-sm">{t("common.loading")}</div>
        ) : (
          <form onSubmit={save} className="p-6 space-y-5">
            {/* Bank */}
            <div>
              <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-3">{t("finance.bankTransfer")}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("finance.bankName")}</label>
                  <input value={pm.bankName} onChange={set("bankName")} placeholder={t("finance.bankName")} className="field mt-1 w-full" />
                </div>
                {[[t("finance.accountName"),"bankAccount",""],[t("finance.accountNumber"),"bankAccountNo",""],[t("finance.swift"),"bankSwift",""],[t("finance.routing"),"bankRouting",""]].map(([label, key]) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
                    <input value={pm[key]} onChange={set(key)} placeholder={label} className="field mt-1 w-full font-mono text-sm" />
                  </div>
                ))}
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("finance.branchAddress")}</label>
                  <input value={pm.bankBranch} onChange={set("bankBranch")} placeholder={t("finance.branchPlaceholder")} className="field mt-1 w-full" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("finance.additionalNotes")}</label>
                  <textarea value={pm.bankExtra} onChange={set("bankExtra")} rows={2} placeholder={t("finance.additionalNotesPlaceholder")} className="field mt-1 w-full resize-none" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="btn-ghost px-4 py-2 text-sm">{t("common.cancel")}</button>
              <button type="submit" disabled={saving} className="btn-primary px-5 py-2 text-sm flex items-center gap-2">
                <Icon name="check" size={14} />
                {saving ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const STATUS_FILTERS = ["all", "reviewing", "completed", "rejected"];
const TYPE_FILTERS   = ["all", "recharge", "withdrawal"];

function money(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function short(str, h = 6, t = 6) {
  if (!str) return "";
  return str.length > h + t + 1 ? `${str.slice(0, h)}…${str.slice(-t)}` : str;
}

function explorerUrl(method, txHash) {
  if (!txHash) return null;
  if (/erc20/i.test(method)) return `https://etherscan.io/tx/${txHash}`;
  if (/trc20/i.test(method)) return `https://tronscan.org/#/transaction/${txHash}`;
  return null;
}

function TypeBadge({ type }) {
  const { t } = useI18n();
  const isIn = type === "recharge";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
      isIn ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
    }`}>
      <Icon name={isIn ? "deposit" : "withdraw"} size={11} />
      {isIn ? t("finance.badgeRecharge") : t("finance.badgeWithdrawal")}
    </span>
  );
}

export default function FinancePage() {
  const toast = useToast();
  const { t } = useI18n();
  const confirm = useConfirm();

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showColdWalletModal, setShowColdWalletModal] = useState(false);
  const [type,   setType]   = useState("all");
  const [status, setStatus] = useState("all");
  const [q,      setQ]      = useState("");

  const [recharges,    setRecharges]    = useState([]);
  const [withdrawals,  setWithdrawals]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [busyId,       setBusyId]       = useState(null);

  function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    const rParams = new URLSearchParams({ status: status === "all" ? "all" : status });
    const wParams = new URLSearchParams({ status: status === "all" ? "all" : status });
    if (q.trim()) { rParams.set("q", q.trim()); wParams.set("q", q.trim()); }

    Promise.all([
      type !== "withdrawal" ? api.get(`/recharge?${rParams}`)   .then((d) => setRecharges(d.items   || [])) : Promise.resolve(),
      type !== "recharge"   ? api.get(`/withdraw?${wParams}`)   .then((d) => setWithdrawals(d.items || [])) : Promise.resolve(),
    ]).catch(() => {}).finally(() => { if (!silent) setLoading(false); });

    if (type === "withdrawal") setRecharges([]);
    if (type === "recharge")   setWithdrawals([]);
  }

  useEffect(() => { load(); }, [type, status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the list in sync with newly submitted recharges/withdrawals while the
  // page is open: silent poll every 20s + refetch when the window regains focus.
  // (The sidebar badge polls independently, so without this the list could lag
  // behind the badge until a manual reload.)
  useEffect(() => {
    const id = setInterval(() => { if (!busyId) load({ silent: true }); }, 20000);
    const onFocus = () => { if (!busyId) load({ silent: true }); };
    window.addEventListener("focus", onFocus);
    return () => { clearInterval(id); window.removeEventListener("focus", onFocus); };
  }, [type, status, q, busyId]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSearch(e) { e.preventDefault(); load(); }

  async function reviewRecharge(id, action) {
    const ok = await confirm({
      message: action === "reject" ? t("finance.confirmRejectRecharge") : t("finance.confirmApproveRecharge"),
      danger: action === "reject",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const updated = await api.post(`/recharge/${id}/${action}`);
      setRecharges((prev) => status === "all"
        ? prev.map((i) => i.id === updated.id ? updated : i)
        : prev.filter((i) => i.id !== id));
      toast.success(action === "confirm" ? t("finance.rechargeReviewed", { account: updated.account }) : t("finance.rechargeRejected", { account: updated.account }));
      refreshBadges();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t("common.failed")); }
    finally { setBusyId(null); }
  }

  async function reviewWithdrawal(id, action) {
    const ok = await confirm({
      message: action === "reject" ? t("finance.confirmRejectWithdrawal") : t("finance.confirmApproveWithdrawal"),
      danger: action === "reject",
    });
    if (!ok) return;
    setBusyId(id);
    try {
      const updated = await api.post(`/withdraw/${id}/${action}`);
      setWithdrawals((prev) => status === "all"
        ? prev.map((i) => i.id === updated.id ? updated : i)
        : prev.filter((i) => i.id !== id));
      toast.success(action === "confirm" ? t("finance.withdrawalReviewed", { account: updated.account }) : t("finance.withdrawalRejected", { account: updated.account }));
      refreshBadges();
    } catch (err) { toast.error(err instanceof ApiError ? err.message : t("common.failed")); }
    finally { setBusyId(null); }
  }

  const allRows = [
    ...recharges  .map((r) => ({ ...r, _type: "recharge"   })),
    ...withdrawals.map((w) => ({ ...w, _type: "withdrawal"  })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Summary counts
  const pendingRecharge    = recharges  .filter((r) => r.status === "reviewing").length;
  const pendingWithdrawal  = withdrawals.filter((w) => w.status === "reviewing").length;
  const totalIn  = recharges  .filter((r) => r.status === "completed").reduce((s, r) => s + Number(r.amount), 0);
  const totalOut = withdrawals.filter((w) => w.status === "completed").reduce((s, w) => s + Number(w.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="serif text-2xl font-bold text-ink-800">{t("finance.title")}</h2>
          <p className="text-sm text-muted mt-1">{t("finance.subtitle")}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => setShowColdWalletModal(true)}
            className="btn-ghost px-4 py-2 text-sm flex items-center gap-2 border border-amber-300 text-amber-700 hover:bg-amber-50">
            <Icon name="shield" size={15} />
            {t("finance.coldWallets")}
          </button>
          <button onClick={() => setShowPaymentModal(true)}
            className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
            <Icon name="card" size={15} />
            {t("finance.paymentInfo")}
          </button>
        </div>
      </div>

      {showPaymentModal    && <PaymentModal    onClose={() => setShowPaymentModal(false)} />}
      {showColdWalletModal && <ColdWalletModal onClose={() => setShowColdWalletModal(false)} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("finance.sumPendingRecharges"),   value: pendingRecharge,   icon: "deposit",  color: "text-emerald-600 bg-emerald-50" },
          { label: t("finance.sumPendingWithdrawals"), value: pendingWithdrawal, icon: "withdraw", color: "text-amber-600 bg-amber-50"     },
          { label: t("finance.sumTotalRecharged"),     value: money(totalIn),    icon: "trending", color: "text-blue-600 bg-blue-50"       },
          { label: t("finance.sumTotalWithdrawn"),     value: money(totalOut),   icon: "receipt",  color: "text-rose-600 bg-rose-50"       },
        ].map((s) => (
          <div key={s.icon} className="card p-4 flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
              <Icon name={s.icon} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted truncate">{s.label}</p>
              <p className="text-lg font-bold text-ink-800 leading-tight">{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        {/* Type tabs */}
        <div className="flex gap-1 bg-ink-50 rounded-xl p-1 shrink-0">
          {TYPE_FILTERS.map((tf) => (
            <button key={tf} onClick={() => setType(tf)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                type === tf ? "bg-white shadow text-ink-800" : "text-muted hover:text-ink-700"
              }`}>
              {tf === "all" ? t("finance.tabAll") : tf === "recharge" ? t("finance.tabRecharge") : t("finance.tabWithdrawal")}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={onSearch} className="flex-1 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("common.searchByAccount")} className="field flex-1" />
          <button type="submit" className="btn-primary px-4 h-[46px]">
            <Icon name="search" size={18} />
          </button>
        </form>

        {/* Status */}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:w-44 shrink-0">
          {STATUS_FILTERS.map((s) => (
            <option key={s} value={s}>{s === "all" ? t("common.allStatuses") : s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("finance.colType")}</th>
                <th>{t("common.account")}</th>
                <th>{t("common.amount")}</th>
                <th>{t("finance.colDetails")}</th>
                <th>{t("finance.colProofAddress")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.date")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center text-muted py-10">{t("common.loading")}</td></tr>
              ) : allRows.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted py-10">{t("finance.noRecords")}</td></tr>
              ) : allRows.map((row) => {
                const isIn = row._type === "recharge";
                return (
                  <tr key={`${row._type}-${row.id}`}>
                    <td><TypeBadge type={row._type} /></td>
                    <td className="font-medium text-ink-800">{row.account}</td>
                    <td className={`font-semibold ${isIn ? "text-emerald-700" : "text-amber-700"}`}>
                      {isIn ? "+" : "−"}{money(row.amount)}
                    </td>
                    <td className="text-muted text-xs">
                      {isIn
                        ? <span className="capitalize">{row.method}{row.region ? ` · ${row.region}` : ""}</span>
                        : <span className="uppercase">{row.walletType}{row.fee ? ` · ${t("finance.fee", { amount: money(row.fee) })}` : ""}</span>
                      }
                    </td>
                    <td className="text-xs text-muted max-w-[160px] truncate">
                      {isIn ? (
                        row.proofUrl
                          ? <a href={row.proofUrl} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline">{t("finance.viewProof")}</a>
                          : row.txHash
                            ? explorerUrl(row.method, row.txHash)
                              ? <a href={explorerUrl(row.method, row.txHash)} target="_blank" rel="noreferrer" className="text-gold-600 hover:underline font-mono">{short(row.txHash)}</a>
                              : <span className="font-mono">{short(row.txHash)}</span>
                            : "—"
                      ) : (
                        row.walletAddress
                          ? <span className="font-mono" title={row.walletAddress}>{short(row.walletAddress)}</span>
                          : "—"
                      )}
                    </td>
                    <td><StatusPill status={row.status} /></td>
                    <td className="whitespace-nowrap text-muted text-xs">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      {row.status === "reviewing" ? (
                        <div className="flex gap-1.5">
                          <button
                            disabled={busyId === row.id}
                            onClick={() => isIn ? reviewRecharge(row.id, "confirm") : reviewWithdrawal(row.id, "confirm")}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            {t("common.confirm")}
                          </button>
                          <button
                            disabled={busyId === row.id}
                            onClick={() => isIn ? reviewRecharge(row.id, "reject") : reviewWithdrawal(row.id, "reject")}
                            className="btn-danger px-3 py-1.5 text-xs"
                          >
                            {t("common.reject")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">
                          {row.reviewedAt ? new Date(row.reviewedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
