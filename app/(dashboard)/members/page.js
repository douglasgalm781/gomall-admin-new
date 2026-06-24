"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_FILTERS = ["all", "active", "banned"];

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function MembersPage() {
  const toast = useToast();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);

    api
      .get(`/members?${params.toString()}`)
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("members.failed")))
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

  function openEdit(member) {
    setEditing(member);
    setForm({
      status: member.status,
      creditScore: member.creditScore,
      riskFlag: member.riskFlag,
      riskNote: member.riskNote || "",
      balanceDelta: "",
      isMerchant: !!member.isMerchant,
      isSupplier: !!member.isSupplier,
    });
  }

  async function save() {
    if (!editing || !form) return;
    const payload = {};
    if (form.status !== editing.status) payload.status = form.status;
    if (Number(form.creditScore) !== editing.creditScore) payload.creditScore = Number(form.creditScore);
    if (form.riskFlag !== editing.riskFlag) payload.riskFlag = form.riskFlag;
    if ((form.riskNote || "") !== (editing.riskNote || "")) payload.riskNote = form.riskNote || null;
    if (form.balanceDelta && Number(form.balanceDelta) !== 0) payload.balanceDelta = Number(form.balanceDelta);
    if (form.isMerchant !== !!editing.isMerchant) payload.isMerchant = form.isMerchant;
    if (form.isSupplier !== !!editing.isSupplier) payload.isSupplier = form.isSupplier;

    if (!Object.keys(payload).length) {
      setEditing(null);
      return;
    }

    setSaving(true);
    try {
      const updated = await api.patch(`/members/${editing.id}`, payload);
      setItems((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
      toast.success(t("members.updated", { account: updated.account }));
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("members.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("members.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("members.subtitle")}</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3 sm:items-center">
        <form onSubmit={onSearchSubmit} className="flex-1 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("common.searchByAccount")}
            className="field flex-1"
          />
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
                <th>{t("common.account")}</th>
                <th>{t("members.colBalance")}</th>
                <th>{t("members.colCredit")}</th>
                <th>{t("common.status")}</th>
                <th>{t("members.colKyc")}</th>
                <th>{t("members.colShop")}</th>
                <th>{t("members.colMerchant")}</th>
                <th>{t("members.colSupplier")}</th>
                <th>{t("members.colRisk")}</th>
                <th>{t("common.joined")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((m) => (
                  <tr key={m.id}>
                    <td className="font-medium text-ink-800">{m.account}</td>
                    <td>{money(m.balance)}</td>
                    <td>{m.creditScore}</td>
                    <td><StatusPill status={m.status} /></td>
                    <td><StatusPill status={m.kycStatus} /></td>
                    <td><StatusPill status={m.shopStatus} /></td>
                    <td>
                      {m.isMerchant ? <span className="pill pill-success">{t("common.yes")}</span> : <span className="pill pill-muted">{t("common.no")}</span>}
                    </td>
                    <td>
                      {m.isSupplier ? <span className="pill pill-success">{t("common.yes")}</span> : <span className="pill pill-muted">{t("common.no")}</span>}
                    </td>
                    <td>
                      {m.riskFlag ? <span className="pill pill-danger">{t("members.flagged")}</span> : <span className="pill pill-muted">{t("members.clear")}</span>}
                    </td>
                    <td className="whitespace-nowrap text-muted">{m.createdAt ? new Date(m.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="whitespace-nowrap">
                      <button onClick={() => openEdit(m)} className="btn-ghost px-3 py-1.5 text-xs">
                        {t("members.manage")}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="text-center text-muted py-8">{t("members.noMembers")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            {t("members.pageInfo", { page, totalPages, total })}
          </span>
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

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? t("members.manageTitle", { account: editing.account }) : ""}
        footer={
          <>
            <button onClick={() => setEditing(null)} className="btn-ghost px-4 py-2 text-sm">
              {t("common.cancel")}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? t("common.saving") : t("common.saveChanges")}
            </button>
          </>
        }
      >
        {editing && form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("members.accountStatus")}</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="field mt-1"
                >
                  <option value="active">{t("members.statusActive")}</option>
                  <option value="banned">{t("members.statusBanned")}</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("members.creditScore")}</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={form.creditScore}
                  onChange={(e) => setForm((f) => ({ ...f, creditScore: e.target.value }))}
                  className="field mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">
                {t("members.balanceAdjustment", { balance: money(editing.balance) })}
              </label>
              <input
                type="number"
                step="0.01"
                placeholder={t("members.balancePlaceholder")}
                value={form.balanceDelta}
                onChange={(e) => setForm((f) => ({ ...f, balanceDelta: e.target.value }))}
                className="field mt-1"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("members.roleFlags")}</label>
              <div className="flex items-center gap-2">
                <input
                  id="isMerchant"
                  type="checkbox"
                  checked={form.isMerchant}
                  onChange={(e) => setForm((f) => ({ ...f, isMerchant: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isMerchant" className="text-sm font-medium text-ink-800">
                  {t("members.merchantAccess")}
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isSupplier"
                  type="checkbox"
                  checked={form.isSupplier}
                  onChange={(e) => setForm((f) => ({ ...f, isSupplier: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="isSupplier" className="text-sm font-medium text-ink-800">
                  {t("members.supplierAccess")}
                </label>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="riskFlag"
                type="checkbox"
                checked={form.riskFlag}
                onChange={(e) => setForm((f) => ({ ...f, riskFlag: e.target.checked }))}
                className="w-4 h-4"
              />
              <label htmlFor="riskFlag" className="text-sm font-medium text-ink-800">
                {t("members.flagAsRisky")}
              </label>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("members.riskNote")}</label>
              <textarea
                value={form.riskNote}
                onChange={(e) => setForm((f) => ({ ...f, riskNote: e.target.value }))}
                className="field mt-1 !h-20 !py-2"
                placeholder={t("members.riskNotePlaceholder")}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
