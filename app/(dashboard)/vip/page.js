"use client";
import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function VipPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get("/vip")
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("vip.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(level) {
    setEditing(level);
    setForm({
      name: level.name,
      commissionRate: level.commissionRate,
      minCommission: level.minCommission,
      perks: (level.perks || []).join("\n"),
    });
  }

  async function save() {
    if (!editing || !form) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        commissionRate: Number(form.commissionRate),
        minCommission: Number(form.minCommission),
        perks: form.perks
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
      };
      const updated = await api.put(`/vip/${editing.level}`, payload);
      setItems((prev) => prev.map((v) => (v.level === updated.level ? updated : v)));
      toast.success(t("vip.updated", { name: updated.name }));
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("vip.updateFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("vip.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("vip.subtitle")}</p>
      </div>

      {error && <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>}

      {loading ? (
        <div className="card p-8 text-center text-muted">{t("common.loading")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((v) => (
            <div key={v.level} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="pill pill-warning">{t("vip.level", { level: v.level })}</span>
                  <h3 className="serif text-lg font-bold text-ink-800 mt-1">{v.name}</h3>
                </div>
                <button onClick={() => openEdit(v)} className="btn-ghost px-3 py-1.5 text-xs">
                  {t("common.edit")}
                </button>
              </div>
              <div className="text-sm text-ink-700 space-y-1">
                <div>
                  {t("vip.commissionRateLabel")}{" "}<span className="font-semibold">{Number(v.commissionRate)}%</span>
                </div>
                <div>
                  {t("vip.minCommissionLabel")}{" "}<span className="font-semibold">${Number(v.minCommission).toFixed(2)}</span>
                </div>
              </div>
              {v.perks && v.perks.length > 0 && (
                <ul className="text-xs text-muted space-y-1 list-disc list-inside">
                  {v.perks.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? t("vip.editTitle", { name: editing.name, level: editing.level }) : ""}
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
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("vip.name")}</label>
              <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("vip.commissionRate")}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.commissionRate}
                  onChange={(e) => setForm((f) => ({ ...f, commissionRate: e.target.value }))}
                  className="field mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("vip.minCommission")}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.minCommission}
                  onChange={(e) => setForm((f) => ({ ...f, minCommission: e.target.value }))}
                  className="field mt-1"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("vip.perks")}</label>
              <textarea
                value={form.perks}
                onChange={(e) => setForm((f) => ({ ...f, perks: e.target.value }))}
                className="field mt-1 !h-32 !py-2"
                placeholder={t("vip.perksPlaceholder")}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
