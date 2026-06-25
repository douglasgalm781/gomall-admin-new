"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Modal from "@/components/Modal";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError, fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_FILTERS = ["all", "pending", "active", "suspended", "rejected"];

const EMPTY_FORM = {
  name: "", logoUrl: "", description: "", contactName: "", email: "", phone: "", telegram: "", whatsapp: "",
  addressLine1: "", addressLine2: "", city: "", state: "", country: "", postalCode: "",
};

function StoreForm({ form, setForm }) {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  function set(key) {
    return (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleLogoFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form2 = new FormData();
      form2.append("file", file);
      const data = await api.upload("/shops/upload", form2);
      setForm((f) => ({ ...f, logoUrl: data.url }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stores.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {form.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(form.logoUrl)} alt="" className="w-16 h-16 rounded-xl object-cover border border-ink-100 shrink-0" />
        ) : (
          <span className="w-16 h-16 rounded-xl bg-ink-50 flex items-center justify-center text-ink-300 shrink-0">
            <Icon name="store" size={24} />
          </span>
        )}
        <div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoFile} />
          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary h-9 px-4 text-sm disabled:opacity-60">
            {uploading ? t("common.uploading") : t("stores.uploadLogo")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.storeName")} *</label>
          <input value={form.name} onChange={set("name")} className="field mt-1 w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.description")}</label>
          <textarea value={form.description} onChange={set("description")} className="field mt-1 w-full !h-20 !py-2" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.contactName")}</label>
          <input value={form.contactName} onChange={set("contactName")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.email")}</label>
          <input type="email" value={form.email} onChange={set("email")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.phone")}</label>
          <input value={form.phone} onChange={set("phone")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.telegram")}</label>
          <input value={form.telegram} onChange={set("telegram")} className="field mt-1 w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.addressLine1")}</label>
          <input value={form.addressLine1} onChange={set("addressLine1")} className="field mt-1 w-full" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.addressLine2")}</label>
          <input value={form.addressLine2} onChange={set("addressLine2")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.city")}</label>
          <input value={form.city} onChange={set("city")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.state")}</label>
          <input value={form.state} onChange={set("state")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.country")}</label>
          <input value={form.country} onChange={set("country")} className="field mt-1 w-full" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("stores.postalCode")}</label>
          <input value={form.postalCode} onChange={set("postalCode")} className="field mt-1 w-full" />
        </div>
      </div>
    </div>
  );
}

export default function ShopsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendingShop, setSuspendingShop] = useState(null);
  const [suspendNote, setSuspendNote] = useState("");

  function load() {
    setLoading(true);
    setError(null);
    api
      .get(`/shops?status=${status}`)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("stores.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      name: s.name || "", logoUrl: s.logoUrl || "", description: s.description || "",
      contactName: s.contactName || "", email: s.email || "", phone: s.phone || "",
      telegram: s.telegram || "", whatsapp: s.whatsapp || "",
      addressLine1: s.addressLine1 || "", addressLine2: s.addressLine2 || "",
      city: s.city || "", state: s.state || "", country: s.country || "", postalCode: s.postalCode || "",
    });
    setModalOpen(true);
  }

  async function save() {
    if (!form.name.trim()) { toast.error(t("stores.nameRequired")); return; }
    setSaving(true);
    try {
      if (editing) {
        const updated = await api.put(`/shops/${editing.id}`, form);
        setItems((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
        toast.success(t("stores.updated", { name: updated.name }));
      } else {
        const created = await api.post("/shops", form);
        setItems((prev) => [created, ...prev]);
        toast.success(t("stores.created", { name: created.name }));
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stores.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function transition(id, action, label, body) {
    if (!(await confirm({ message: t("stores.confirmAction", { action }), danger: action === "reject" }))) {
      return;
    }
    setBusyId(id);
    try {
      const updated = await api.post(`/shops/${id}/${action}`, body);
      if (status === "all") {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
      toast.success(t("stores.statusUpdated", { name: updated.name, label }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stores.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  function openSuspendModal(shop) {
    setSuspendingShop(shop);
    setSuspendNote("");
    setSuspendModal(true);
  }

  async function handleSuspend() {
    if (!suspendNote.trim() || !suspendingShop) return;
    setSuspendModal(false);
    await transition(suspendingShop.id, "suspend", t("stores.labelSuspended"), { note: suspendNote.trim() });
    setSuspendingShop(null);
    setSuspendNote("");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="serif text-2xl font-bold text-ink-800">{t("stores.title")}</h2>
          <p className="text-sm text-muted mt-1">{t("stores.subtitle")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="field sm:w-44">
            {STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>{s === "all" ? t("common.allStatuses") : s}</option>
            ))}
          </select>
          <button onClick={openCreate} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
            <Icon name="plus" size={16} /> {t("stores.newStore")}
          </button>
        </div>
      </div>

      {error && <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("stores.colStoreName")}</th>
                <th>{t("stores.colContact")}</th>
                <th>{t("stores.colProducts")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.created")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center text-muted py-8">{t("common.loading")}</td></tr>
              ) : items.length ? (
                items.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        {s.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(s.logoUrl)} alt="" className="w-8 h-8 rounded-lg object-cover border border-ink-100 shrink-0" onError={(e) => { e.target.style.display = "none"; }} />
                        ) : (
                          <span className="w-8 h-8 rounded-lg bg-ink-50 flex items-center justify-center text-ink-300 text-xs shrink-0">
                            {s.name?.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <Link href={`/shops/${s.id}`} className="font-medium text-ink-800 hover:text-gold-600 hover:underline">
                          {s.name}
                        </Link>
                      </div>
                    </td>
                    <td className="text-muted text-xs">
                      {s.contactName && <div>{s.contactName}</div>}
                      {s.email && <div>{s.email}</div>}
                      {s.phone && <div>{s.phone}</div>}
                      {!s.contactName && !s.email && !s.phone && "—"}
                    </td>
                    <td>{s.productCount ?? 0}</td>
                    <td><StatusPill status={s.status} /></td>
                    <td className="whitespace-nowrap text-muted">{s.createdAt ? new Date(s.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="whitespace-nowrap">
                      <div className="flex gap-1.5 justify-end">
                        <Link href={`/shops/${s.id}`} className="btn-ghost px-3 py-1.5 text-xs">{t("stores.manage")}</Link>
                        <button onClick={() => openEdit(s)} className="btn-ghost px-3 py-1.5 text-xs">{t("common.edit")}</button>
                        {s.status === "pending" && (
                          <>
                            <button disabled={busyId === s.id} onClick={() => transition(s.id, "approve", t("stores.labelActive"))} className="btn-primary px-3 py-1.5 text-xs">{t("stores.activate")}</button>
                            <button disabled={busyId === s.id} onClick={() => transition(s.id, "reject", t("stores.labelRejected"))} className="btn-danger px-3 py-1.5 text-xs">{t("common.reject")}</button>
                          </>
                        )}
                        {s.status === "active" && (
                          <button disabled={busyId === s.id} onClick={() => openSuspendModal(s)} className="btn-danger px-3 py-1.5 text-xs">{t("common.suspend")}</button>
                        )}
                        {(s.status === "suspended" || s.status === "rejected") && (
                          <button disabled={busyId === s.id} onClick={() => transition(s.id, "reactivate", t("stores.labelActive"))} className="btn-primary px-3 py-1.5 text-xs">{t("stores.activate")}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="text-center text-muted py-8">{t("stores.noStores")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("stores.editStore") : t("stores.newStore")}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-sm">{t("common.cancel")}</button>
            <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? t("common.saving") : editing ? t("common.saveChanges") : t("common.create")}
            </button>
          </>
        }
      >
        <StoreForm form={form} setForm={setForm} />
      </Modal>

      {/* Suspend reason modal */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
          <div className="relative card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="serif text-lg font-bold text-ink-800">{t("common.suspend")} — {suspendingShop?.name}</h3>
              <button onClick={() => setSuspendModal(false)} className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            <p className="text-sm text-muted">{t("stores.suspendHint")}</p>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">
                {t("stores.suspensionReason")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={suspendNote}
                onChange={(e) => setSuspendNote(e.target.value)}
                rows={6}
                placeholder={t("stores.suspensionPlaceholder")}
                className={`field w-full resize-none ${!suspendNote.trim() ? "border-rose-200 focus:border-rose-400" : ""}`}
                style={{ height: "auto", borderRadius: "6px", padding: "12px 14px" }}
              />
              {!suspendNote.trim() && (
                <p className="text-xs text-rose-500 mt-1">{t("stores.suspensionRequired")}</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setSuspendModal(false)} className="btn-ghost flex-1 py-2 text-sm">{t("common.cancel")}</button>
              <button
                onClick={handleSuspend}
                disabled={busyId === suspendingShop?.id || !suspendNote.trim()}
                className="btn-danger flex-1 py-2 text-sm disabled:opacity-40"
              >
                {busyId === suspendingShop?.id ? t("common.saving") : t("common.suspend")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
