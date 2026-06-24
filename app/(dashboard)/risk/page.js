"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function RiskPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [flagging, setFlagging] = useState(null);
  const [note, setNote] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    api
      .get("/risk")
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("risk.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openFlag(user) {
    setFlagging(user);
    setNote(user.riskNote || "");
  }

  async function submitFlag() {
    if (!flagging) return;
    setBusyId(flagging.id);
    try {
      const updated = await api.post(`/risk/${flagging.id}/flag`, { note: note.trim() || null });
      setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast.success(t("risk.flaggedFor", { account: updated.account }));
      setFlagging(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("risk.flagFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function unflag(user) {
    if (!(await confirm({ message: t("risk.confirmUnflag", { account: user.account }) }))) return;
    setBusyId(user.id);
    try {
      const updated = await api.post(`/risk/${user.id}/unflag`);
      if (Number(updated.creditScore) >= 60) {
        setItems((prev) => prev.filter((u) => u.id !== user.id));
      } else {
        setItems((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      }
      toast.success(t("risk.flagCleared", { account: updated.account }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("risk.unflagFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("risk.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("risk.subtitle")}</p>
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
                <th>{t("members.colRisk")}</th>
                <th>{t("risk.colNote")}</th>
                <th>{t("common.joined")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium text-ink-800">{u.account}</td>
                    <td>{money(u.balance)}</td>
                    <td className={Number(u.creditScore) < 60 ? "text-rose-600 font-semibold" : ""}>{u.creditScore}</td>
                    <td><StatusPill status={u.status} /></td>
                    <td>
                      {u.riskFlag ? <span className="pill pill-danger">{t("risk.flagged")}</span> : <span className="pill pill-muted">{t("risk.clear")}</span>}
                    </td>
                    <td className="text-muted text-xs max-w-xs truncate" title={u.riskNote || ""}>{u.riskNote || "—"}</td>
                    <td className="whitespace-nowrap text-muted">{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="whitespace-nowrap">
                      {u.riskFlag ? (
                        <button disabled={busyId === u.id} onClick={() => unflag(u)} className="btn-ghost px-3 py-1.5 text-xs">
                          {t("risk.unflag")}
                        </button>
                      ) : (
                        <button disabled={busyId === u.id} onClick={() => openFlag(u)} className="btn-danger px-3 py-1.5 text-xs">
                          {t("risk.flag")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("risk.none")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={!!flagging}
        onClose={() => setFlagging(null)}
        title={flagging ? t("risk.flagTitle", { account: flagging.account }) : ""}
        footer={
          <>
            <button onClick={() => setFlagging(null)} className="btn-ghost px-4 py-2 text-sm">
              {t("common.cancel")}
            </button>
            <button onClick={submitFlag} disabled={busyId === flagging?.id} className="btn-danger px-4 py-2 text-sm">
              {busyId === flagging?.id ? t("common.saving") : t("risk.flagAccount")}
            </button>
          </>
        }
      >
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("risk.riskNote")}</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="field mt-1 !h-24 !py-2"
            placeholder={t("risk.riskNotePlaceholder")}
          />
        </div>
      </Modal>
    </div>
  );
}
