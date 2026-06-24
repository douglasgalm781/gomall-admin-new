"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const REGIONS = [
  { key: "global", labelKey: "channels.regionGlobal" },
  { key: "th", labelKey: "channels.regionTh" },
  { key: "vn", labelKey: "channels.regionVn" },
  { key: "my", labelKey: "channels.regionMy" },
  { key: "cn", labelKey: "channels.regionCn" },
];

const TYPES = ["usdt", "bank", "qr", "ewallet"];

const EMPTY_FORM = {
  region: "global",
  key: "",
  name: "",
  type: TYPES[0],
  icon: "",
  rangeLabel: "",
  sortOrder: 0,
  isActive: true,
};

export default function PaymentChannelsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [region, setRegion] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (region !== "all") params.set("region", region);
    api
      .get(`/payment-channels?${params.toString()}`)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("channels.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [region]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      region: c.region,
      key: c.key,
      name: c.name,
      type: c.type,
      icon: c.icon || "",
      rangeLabel: c.rangeLabel || "",
      sortOrder: c.sortOrder,
      isActive: c.isActive,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.key.trim() || !form.name.trim()) {
      toast.error(t("channels.keyNameRequired"));
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, sortOrder: Number(form.sortOrder) || 0 };
      if (editing) {
        const updated = await api.put(`/payment-channels/${editing.id}`, payload);
        setItems((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success(t("channels.updated", { name: updated.name }));
      } else {
        const created = await api.post("/payment-channels", payload);
        setItems((prev) => [...prev, created]);
        toast.success(t("channels.created", { name: created.name }));
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("channels.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(c) {
    setBusyId(c.id);
    try {
      const updated = await api.put(`/payment-channels/${c.id}`, { isActive: !c.isActive });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("channels.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function remove(c) {
    if (!(await confirm({ message: t("channels.deleteConfirm", { name: c.name }), danger: true }))) return;
    setBusyId(c.id);
    try {
      await api.del(`/payment-channels/${c.id}`);
      setItems((prev) => prev.filter((x) => x.id !== c.id));
      toast.success(t("channels.deleted", { name: c.name }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("channels.deleteFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="serif text-2xl font-bold text-ink-800">{t("channels.title")}</h2>
          <p className="text-sm text-muted mt-1">{t("channels.subtitle")}</p>
        </div>
        <button onClick={openCreate} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2 self-start">
          <Icon name="plus" size={16} /> {t("channels.addChannel")}
        </button>
      </div>

      <div className="card p-4">
        <select value={region} onChange={(e) => setRegion(e.target.value)} className="field sm:w-44">
          <option value="all">{t("common.allRegions")}</option>
          {REGIONS.map((r) => (
            <option key={r.key} value={r.key}>
              {t(r.labelKey)}
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
                <th>{t("channels.colRegion")}</th>
                <th>{t("channels.colKey")}</th>
                <th>{t("channels.colName")}</th>
                <th>{t("channels.colType")}</th>
                <th>{t("channels.colRange")}</th>
                <th>{t("channels.colSort")}</th>
                <th>{t("channels.colActive")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((c) => (
                  <tr key={c.id}>
                    <td className="uppercase text-xs">{c.region}</td>
                    <td className="font-mono text-xs text-muted">{c.key}</td>
                    <td className="font-medium text-ink-800">{c.name}</td>
                    <td className="capitalize">{c.type}</td>
                    <td className="text-muted text-xs">{c.rangeLabel || "—"}</td>
                    <td>{c.sortOrder}</td>
                    <td>
                      <button
                        disabled={busyId === c.id}
                        onClick={() => toggleActive(c)}
                        className={`pill ${c.isActive ? "pill-success" : "pill-muted"}`}
                      >
                        {c.isActive ? t("common.active") : t("common.inactive")}
                      </button>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(c)} className="btn-ghost px-3 py-1.5 text-xs">
                          {t("common.edit")}
                        </button>
                        <button disabled={busyId === c.id} onClick={() => remove(c)} className="btn-danger px-3 py-1.5 text-xs">
                          {t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center text-muted py-8">{t("channels.noChannels")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("channels.editChannel") : t("channels.createChannel")}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-sm">
              {t("common.cancel")}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? t("common.saving") : editing ? t("common.saveChanges") : t("channels.createChannelBtn")}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.colRegion")}</label>
            <select value={form.region} onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))} className="field mt-1">
              {REGIONS.map((r) => (
                <option key={r.key} value={r.key}>
                  {t(r.labelKey)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.colType")}</label>
            <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="field mt-1">
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.colKey")}</label>
            <input value={form.key} onChange={(e) => setForm((f) => ({ ...f, key: e.target.value }))} className="field mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.colName")}</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="field mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.icon")}</label>
            <input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} className="field mt-1" placeholder={t("channels.iconPlaceholder")} />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.sortOrder")}</label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("channels.rangeLabel")}</label>
            <input
              value={form.rangeLabel}
              onChange={(e) => setForm((f) => ({ ...f, rangeLabel: e.target.value }))}
              className="field mt-1"
              placeholder={t("channels.rangePlaceholder")}
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input
              id="isActive"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              className="w-4 h-4"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-ink-800">
              {t("common.active")}
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
}
