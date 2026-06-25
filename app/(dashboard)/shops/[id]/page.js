"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { useConfirm } from "@/components/Confirm";
import { api, ApiError, fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function money(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function StoreDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();

  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);
  const [assigned, setAssigned] = useState([]);
  const [loadingAssigned, setLoadingAssigned] = useState(true);
  const [stats, setStats] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [suspendModal, setSuspendModal] = useState(false);
  const [suspendNote,  setSuspendNote]  = useState("");

  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState("");
  const [available, setAvailable] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [assigningId, setAssigningId] = useState(null);

  function loadShop() {
    setLoading(true);
    api.get(`/shops/${id}`).then(setShop).catch(() => setShop(null)).finally(() => setLoading(false));
  }

  function loadAssigned() {
    setLoadingAssigned(true);
    api.get(`/products?shopId=${id}&pageSize=100`)
      .then((d) => setAssigned(d.items || []))
      .catch(() => {})
      .finally(() => setLoadingAssigned(false));
  }

  useEffect(() => {
    loadShop();
    loadAssigned();
    api.get(`/shops/stats/summary?shopId=${id}&period=month`).then(setStats).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function loadAvailable(query) {
    setLoadingAvailable(true);
    const params = new URLSearchParams({ pageSize: "50" });
    if (query.trim()) params.set("q", query.trim());
    api.get(`/products?${params}`)
      .then((d) => {
        const assignedIds = new Set(assigned.map((p) => p.id));
        setAvailable((d.items || []).filter((p) => !assignedIds.has(p.id)));
      })
      .catch(() => {})
      .finally(() => setLoadingAvailable(false));
  }

  function openPicker() {
    setPickerOpen(true);
    setQ("");
    loadAvailable("");
  }

  async function assign(productId) {
    setAssigningId(productId);
    try {
      await api.post(`/shops/${id}/products`, { productId });
      setAvailable((prev) => prev.filter((p) => p.id !== productId));
      loadAssigned();
      toast.success(t("stores.productAssigned"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stores.assignFailed"));
    } finally {
      setAssigningId(null);
    }
  }

  async function unassign(productId) {
    if (!(await confirm({ message: t("stores.confirmUnassign") }))) return;
    setBusyId(productId);
    try {
      await api.del(`/shops/${id}/products/${productId}`);
      setAssigned((prev) => prev.filter((p) => p.id !== productId));
      toast.success(t("stores.productUnassigned"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stores.unassignFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function transition(action, body) {
    // "suspend" is confirmed via its own modal (handleSuspend); confirm the rest here.
    if (action !== "suspend") {
      if (!(await confirm({ message: t("stores.confirmAction", { action }), danger: action === "reject" }))) return;
    }
    setBusyId("status");
    try {
      const updated = await api.post(`/shops/${id}/${action}`, body);
      setShop((s) => ({ ...s, ...updated }));
      toast.success(t("stores.statusChanged"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("stores.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspend() {
    setSuspendModal(false);
    await transition("suspend", { note: suspendNote.trim() });
    setSuspendNote("");
  }

  if (loading) return <div className="text-center text-muted py-16">{t("common.loading")}</div>;
  if (!shop) return <div className="card p-6 text-center text-muted">{t("stores.notFound")}</div>;

  return (
    <div className="space-y-6">
      <button onClick={() => router.push("/shops")} className="text-sm text-muted hover:text-ink-700 flex items-center gap-1">
        <Icon name="chevronLeft" size={14} /> {t("stores.backToStores")}
      </button>

      {/* Header */}
      <div className="card p-5 flex items-center gap-4">
        {shop.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={fileUrl(shop.logoUrl)} alt="" className="w-16 h-16 rounded-xl object-cover border border-ink-100 shrink-0" />
        ) : (
          <span className="w-16 h-16 rounded-xl bg-ink-50 flex items-center justify-center text-ink-300 shrink-0">
            <Icon name="store" size={28} />
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="serif text-xl font-bold text-ink-800">{shop.name}</h2>
            <StatusPill status={shop.status} />
          </div>
          {shop.description && <p className="text-sm text-muted mt-1">{shop.description}</p>}
          <div className="text-xs text-muted mt-1 flex gap-3 flex-wrap">
            {shop.contactName && <span>{shop.contactName}</span>}
            {shop.email && <span>{shop.email}</span>}
            {shop.phone && <span>{shop.phone}</span>}
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {shop.status === "pending" && (
            <>
              <button disabled={busyId === "status"} onClick={() => transition("approve")} className="btn-primary px-4 py-2 text-sm">{t("stores.activate")}</button>
              <button disabled={busyId === "status"} onClick={() => transition("reject")} className="btn-danger px-4 py-2 text-sm">{t("common.reject")}</button>
            </>
          )}
          {shop.status === "active" && (
            <button disabled={busyId === "status"} onClick={() => { setSuspendNote(""); setSuspendModal(true); }} className="btn-danger px-4 py-2 text-sm">{t("common.suspend")}</button>
          )}
          {(shop.status === "suspended" || shop.status === "rejected") && (
            <button disabled={busyId === "status"} onClick={() => transition("reactivate")} className="btn-primary px-4 py-2 text-sm">{t("stores.activate")}</button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card p-4">
            <p className="text-xs text-muted">{t("stores.revenueThisMonth")}</p>
            <p className="serif text-xl font-bold text-ink-800 mt-1">{money(stats.revenue)}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">{t("stores.ordersThisMonth")}</p>
            <p className="serif text-xl font-bold text-ink-800 mt-1">{stats.orders}</p>
          </div>
          <div className="card p-4">
            <p className="text-xs text-muted">{t("stores.colProducts")}</p>
            <p className="serif text-xl font-bold text-ink-800 mt-1">{assigned.length}</p>
          </div>
        </div>
      )}

      {/* Assigned products */}
      <div className="card p-0 overflow-hidden">
        <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between">
          <h3 className="font-semibold text-ink-800">{t("stores.assignedProducts")}</h3>
          <button onClick={openPicker} className="btn-primary h-9 px-4 text-xs flex items-center gap-1.5">
            <Icon name="plus" size={13} /> {t("stores.addProducts")}
          </button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("products.colProduct")}</th>
                <th>{t("products.colRetail")}</th>
                <th>{t("products.colStock")}</th>
                <th>{t("channels.colActive")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loadingAssigned ? (
                <tr><td colSpan={5} className="text-center text-muted py-8">{t("common.loading")}</td></tr>
              ) : assigned.length ? (
                assigned.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-[200px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="w-9 h-9 rounded-lg object-cover border border-ink-100 shrink-0" />
                        <div>
                          <div className="font-medium text-ink-800 text-sm line-clamp-1">{p.title}</div>
                          <div className="text-xs text-muted">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td>{money(p.retailPrice)}{p.onSale && <span className="text-emerald-600 text-xs ml-1">({t("stores.onSale")})</span>}</td>
                    <td>{p.stock}</td>
                    <td><span className={`pill ${p.isActive ? "pill-success" : "pill-muted"}`}>{p.isActive ? t("common.active") : t("common.inactive")}</span></td>
                    <td className="whitespace-nowrap">
                      <button disabled={busyId === p.id} onClick={() => unassign(p.id)} className="btn-ghost px-3 py-1.5 text-xs text-rose-600">
                        {t("stores.unassign")}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="text-center text-muted py-8">{t("stores.noProductsAssigned")}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Suspend reason modal */}
      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" />
          <div className="relative card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="serif text-lg font-bold text-ink-800">{t("common.suspend")} — {shop.name}</h3>
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
                rows={4}
                placeholder={t("stores.suspensionPlaceholder")}
                className={`field w-full resize-none ${!suspendNote.trim() ? "border-rose-200 focus:border-rose-400" : ""}`}
              />
              {!suspendNote.trim() && (
                <p className="text-xs text-rose-500 mt-1">{t("stores.suspensionRequired")}</p>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setSuspendModal(false)} className="btn-ghost flex-1 py-2 text-sm">{t("common.cancel")}</button>
              <button
                onClick={handleSuspend}
                disabled={busyId === "status" || !suspendNote.trim()}
                className="btn-danger flex-1 py-2 text-sm disabled:opacity-40"
              >
                {busyId === "status" ? t("common.saving") : t("common.suspend")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product picker */}
      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setPickerOpen(false)} />
          <div className="relative card w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="serif text-lg font-bold text-ink-800">{t("stores.addProducts")}</h3>
              <button onClick={() => setPickerOpen(false)} className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="relative mb-4">
              <Icon name="search" size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="field !pl-9 w-full"
                placeholder={t("stores.searchUnassigned")}
                value={q}
                onChange={(e) => { setQ(e.target.value); loadAvailable(e.target.value); }}
              />
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto">
              {loadingAvailable ? (
                <div className="text-center text-muted py-8">{t("common.loading")}</div>
              ) : available.length ? (
                available.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-ink-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-ink-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-800 line-clamp-1">{p.title}</div>
                      <div className="text-xs text-muted">{p.brand} · {money(p.retailPrice)}</div>
                    </div>
                    <button
                      disabled={assigningId === p.id}
                      onClick={() => assign(p.id)}
                      className="btn-primary px-3 py-1.5 text-xs shrink-0"
                    >
                      {assigningId === p.id ? t("common.saving") : t("stores.assign")}
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted py-8">{t("stores.noUnassignedProducts")}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
