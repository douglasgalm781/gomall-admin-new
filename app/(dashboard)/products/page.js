"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Icon from "@/components/Icon";
import ImageCropUploader, { Cropper } from "@/components/ImageCropUploader";
import Modal from "@/components/Modal";
import { useToast } from "@/components/Toast";
import { api, ApiError, fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { refreshBadges } from "@/lib/useBadges";
import { useConfirm } from "@/components/Confirm";

const CURRENCIES = ["CNY", "USD", "VND", "MYR", "THB", "SGD", "USDT-TRC20", "USDT-ERC20"];

const EMPTY_FORM = {
  brand: "",
  category: "",
  title: "",
  supplyPrice: "",
  retailPrice: "",
  commission: "",
  currency: "CNY",
  stock: "",
  rating: "",
  reviewCount: "",
  description: "",
  saleType: "none",
  saleValue: "",
  saleStartsAt: "",
  saleEndsAt: "",
};

function money(value, currency = "USD") {
  return `${currency} ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// MySQL "YYYY-MM-DD HH:mm:ss" <-> <input type="datetime-local"> "YYYY-MM-DDTHH:mm"
function toInputDateTime(v) {
  if (!v) return "";
  return String(v).replace(" ", "T").slice(0, 16);
}
function SortTh({ base, label, sort, onSort }) {
  const { t } = useI18n();
  const isAsc = sort === `${base}Asc`;
  const isDesc = sort === `${base}Desc`;
  return (
    <th>
      <button
        type="button"
        onClick={() => onSort(base)}
        className="flex items-center gap-1 bg-transparent border-0 p-0 text-inherit cursor-pointer hover:text-gold-600 transition"
        title={t("products.sortBy").replace("{label}", label)}
      >
        {label}
        <Icon
          name={isAsc ? "chevronUp" : "chevronDown"}
          size={11}
          className={isAsc || isDesc ? "text-gold-600" : "text-muted/40"}
        />
      </button>
    </th>
  );
}

function fromInputDateTime(v) {
  if (!v) return null;
  return v.replace("T", " ") + ":00";
}

export default function ProductsPage() {
  const { t } = useI18n();
  const toast   = useToast();
  const confirm = useConfirm();
  const subRef  = useRef(null);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [merchantShopId, setMerchantShopId] = useState("all");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest"); // "newest" | "discountDesc" | "discountAsc"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [tab, setTab] = useState("all"); // "all" | "pending"
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(null); // null | { product, action: 'approve'|'reject' }
  const [viewingProduct, setViewingProduct] = useState(null);

  // Pending tab controls
  const [pendingView,       setPendingView]       = useState("list"); // "list" | "grid"
  const [pendingShopFilter, setPendingShopFilter] = useState("");
  const [pendingSort,       setPendingSort]       = useState("newest");

  // Shop assignment modal
  const [assignModal,   setAssignModal]   = useState(null); // product being assigned
  const [assignShopId,  setAssignShopId]  = useState("");
  const [assigning,     setAssigning]     = useState(false);

  const [deletingId, setDeletingId] = useState(null);

  // Image state
  const [imageBlob,    setImageBlob]    = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [keepSubs,     setKeepSubs]     = useState([]);
  const [newSubs,      setNewSubs]      = useState([]);
  const [subCropFile,  setSubCropFile]  = useState(null);

  // Category management
  const [categories,      setCategories]      = useState([]);
  const [catModal,        setCatModal]        = useState(false);
  const [newCatName,      setNewCatName]      = useState("");
  const [catSaving,       setCatSaving]       = useState(false);
  const [catDeleting,     setCatDeleting]     = useState(null);
  const [editingCat,      setEditingCat]      = useState(null); // name being edited
  const [editCatName,     setEditCatName]     = useState("");
  const [catRenaming,     setCatRenaming]     = useState(null);

  // Merchant shop list for filter
  const [merchantShops, setMerchantShops] = useState([]);

  function loadCategories() {
    api.get("/products/categories").then((d) => setCategories(d.items || [])).catch(() => {});
  }

  useEffect(() => {
    loadCategories();
    api.get("/shops?status=active").then((d) => setMerchantShops(d.items || [])).catch(() => {});
  }, []);

  function load({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), pageSize: tab === "pending" ? "100" : String(pageSize) });
    if (tab === "pending") {
      params.set("approvalStatus", "pending");
    } else {
      if (category !== "all") params.set("category", category);
      if (status !== "all") params.set("status", status);
      if (merchantShopId !== "all") params.set("shopId", merchantShopId);
      if (q.trim()) params.set("q", q.trim());
      if (sort !== "newest") params.set("sort", sort);
    }

    api
      .get(`/products?${params.toString()}`)
      .then((data) => {
        setItems(data.items || []);
        setTotal(data.total || 0);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("products.failed")))
      .finally(() => { if (!silent) setLoading(false); });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, status, merchantShopId, sort, tab]);

  // The product list isn't pushed over the websocket (only badge counts are),
  // so silently refetch when the admin returns to the tab to pick up new
  // merchant submissions / changes without a manual reload.
  useEffect(() => {
    const onFocus = () => load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, category, status, merchantShopId, sort, tab, q]);

  function cycleSort(base) {
    setSort((s) => (s === `${base}Desc` ? `${base}Asc` : s === `${base}Asc` ? "newest" : `${base}Desc`));
    setPage(1);
  }

  async function approveProduct(p) {
    if (!(await confirm({ message: t("products.confirmApprove") }))) return;
    try {
      const updated = await api.post(`/products/${p.id}/approve`);
      setItems((prev) => prev.filter((x) => x.id !== updated.id));
      toast.success(t("products.approved").replace("{title}", p.title));
      refreshBadges();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.approveFailed"));
    }
  }

  async function rejectProduct(p, note) {
    try {
      await api.post(`/products/${p.id}/reject`, { note });
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      toast.success(t("products.rejectedToast").replace("{title}", p.title));
      setReviewing(null);
      setReviewNote("");
      refreshBadges();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.rejectFailed"));
    }
  }

  function onSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    load();
  }

  async function addCategory() {
    const name = newCatName.trim().toLowerCase();
    if (!name) return;
    setCatSaving(true);
    try {
      const d = await api.post("/categories", { name });
      setCategories(d.items || []);
      setNewCatName("");
      toast.success(t("products.categoryAdded").replace("{name}", name));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.addCategoryFailed"));
    } finally {
      setCatSaving(false);
    }
  }

  async function deleteCategory(name) {
    const ok = await confirm({ title: t("products.deleteCategoryTitle"), message: t("products.deleteCategoryBody").replace("{name}", name), confirmText: t("common.delete"), danger: true });
    if (!ok) return;
    setCatDeleting(name);
    try {
      await api.del(`/categories/${encodeURIComponent(name)}`);
      setCategories((prev) => prev.filter((c) => c !== name));
      toast.success(t("products.categoryRemoved").replace("{name}", name));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.removeCategoryFailed"));
    } finally {
      setCatDeleting(null);
    }
  }

  function startEditCat(name) {
    setEditingCat(name);
    setEditCatName(name);
  }

  function cancelEditCat() {
    setEditingCat(null);
    setEditCatName("");
  }

  async function saveRenameCategory() {
    const trimmed = editCatName.trim().toLowerCase();
    if (!trimmed || trimmed === editingCat) { cancelEditCat(); return; }
    setCatRenaming(editingCat);
    try {
      const d = await api.put(`/categories/${encodeURIComponent(editingCat)}`, { name: trimmed });
      setCategories(d.items || []);
      toast.success(t("products.categoryRenamed").replace("{name}", trimmed));
      cancelEditCat();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.renameCategoryFailed"));
    } finally {
      setCatRenaming(null);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY_FORM, category: categories[0] || "" });
    setImageBlob(null);
    setImagePreview(null);
    setKeepSubs([]);
    setNewSubs([]);
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditing(p);
    setForm({
      brand: p.brand,
      category: p.category,
      title: p.title,
      supplyPrice: p.supplyPrice,
      retailPrice: p.retailPrice,
      commission: p.commission,
      currency: p.currency,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      description: p.description || "",
      saleType: p.saleType || "none",
      saleValue: p.saleValue ?? "",
      saleStartsAt: toInputDateTime(p.saleStartsAt),
      saleEndsAt: toInputDateTime(p.saleEndsAt),
    });
    setImageBlob(null);
    setImagePreview(p.image ? fileUrl(p.image) : null);
    setKeepSubs(p.subImages || []);
    setNewSubs([]);
    setModalOpen(true);
  }

  // Pick a single sub-image, then send it through the same crop/fit dialog.
  function handleSubFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setSubCropFile(file);
  }

  function addCroppedSub(blob, preview) {
    setSubCropFile(null);
    setNewSubs((prev) => [...prev, { blob, preview }]);
  }

  async function save() {
    if (!form.brand.trim() || !form.title.trim()) {
      toast.error(t("products.requiredFields"));
      return;
    }
    if (!editing && !imageBlob) {
      toast.error(t("products.imageRequired"));
      return;
    }
    if (form.saleType !== "none" && !form.saleValue) {
      toast.error(t("products.saleValueRequired"));
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      const payload = {
        ...form,
        saleStartsAt: fromInputDateTime(form.saleStartsAt),
        saleEndsAt: fromInputDateTime(form.saleEndsAt),
      };
      Object.entries(payload).forEach(([k, v]) => {
        if (v != null && v !== "") fd.append(k, v);
      });
      if (imageBlob) fd.append("image", imageBlob, "image.jpg");
      fd.append("keepSubImages", JSON.stringify(keepSubs));
      newSubs.forEach(({ blob }) => fd.append("subImages", blob, "sub.jpg"));

      if (editing) {
        const updated = await api.uploadPut(`/products/${editing.id}`, fd);
        setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        toast.success(t("products.updated", { title: updated.title }));
      } else {
        const created = await api.upload("/products", fd);
        setItems((prev) => [created, ...prev]);
        setTotal((v) => v + 1);
        toast.success(t("products.created", { title: created.title }));
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(p) {
    setToggling(p.id);
    try {
      const updated = await api.patch(`/products/${p.id}/active`, { isActive: !p.isActive });
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.updateFailed"));
    } finally {
      setToggling(null);
    }
  }

  async function handleDeleteProduct(p) {
    const ok = await confirm({ title: t("products.deleteProductTitle"), message: t("products.deleteProductBody").replace("{title}", p.title), confirmText: t("common.delete"), danger: true });
    if (!ok) return;
    setDeletingId(p.id);
    try {
      await api.del(`/products/${p.id}`);
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      setTotal((v) => v - 1);
      toast.success(t("products.deletedToast").replace("{title}", p.title));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.deleteFailed"));
    } finally {
      setDeletingId(null);
    }
  }

  function openAssignModal(p) {
    setAssignModal(p);
    setAssignShopId(p.shopId ? String(p.shopId) : "");
  }

  async function saveShopAssignment() {
    if (!assignModal) return;
    setAssigning(true);
    try {
      const oldShopId = assignModal.shopId ? String(assignModal.shopId) : "";
      const newShopId = assignShopId;

      if (!newShopId && oldShopId) {
        // Unassign only
        await api.del(`/shops/${oldShopId}/products/${assignModal.id}`);
      } else if (newShopId) {
        // Assign (overwrites any existing shop — backend no longer blocks)
        await api.post(`/shops/${newShopId}/products`, { productId: assignModal.id });
      }

      const shopName = merchantShops.find((s) => String(s.id) === newShopId)?.name || null;
      setItems((prev) => prev.map((p) =>
        p.id === assignModal.id
          ? { ...p, shopId: newShopId ? Number(newShopId) : null, shopName }
          : p
      ));
      toast.success(newShopId ? t("products.assignedTo").replace("{shopName}", shopName) : t("products.assignmentRemoved"));
      setAssignModal(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("products.assignShopFailed"));
    } finally {
      setAssigning(false);
    }
  }

  // Pending tab derived data
  const pendingShops = useMemo(() => {
    if (tab !== "pending") return [];
    const seen = new Set();
    const shops = [];
    for (const p of items) {
      const key = p.shopName || p.ownerAccount || "";
      if (key && !seen.has(key)) { seen.add(key); shops.push(key); }
    }
    return shops.sort();
  }, [items, tab]);

  const displayedItems = useMemo(() => {
    if (tab !== "pending") return items;
    let list = [...items];
    if (pendingShopFilter) {
      list = list.filter((p) => (p.shopName || p.ownerAccount || "") === pendingShopFilter);
    }
    switch (pendingSort) {
      case "oldest":    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case "title_asc": list.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "shop_asc":  list.sort((a, b) => (a.shopName || a.ownerAccount || "").localeCompare(b.shopName || b.ownerAccount || "")); break;
      default:          list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); break;
    }
    return list;
  }, [items, tab, pendingShopFilter, pendingSort]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="serif text-2xl font-bold text-ink-800">{t("products.title")}</h2>
          <p className="text-sm text-muted mt-1">{t("products.subtitle")}</p>
        </div>
        <div className="flex gap-2 self-start">
          <button onClick={() => load()} disabled={loading} className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2 border border-ink-200 disabled:opacity-60">
            <Icon name="refresh" size={15} className={loading ? "animate-spin" : ""} /> {t("common.refresh")}
          </button>
          <button onClick={() => { setNewCatName(""); setCatModal(true); }} className="btn-ghost px-4 py-2.5 text-sm flex items-center gap-2 border border-ink-200">
            <Icon name="settings" size={15} /> {t("products.categoriesBtn")}
          </button>
          <button onClick={openCreate} className="btn-primary px-4 py-2.5 text-sm flex items-center gap-2">
            <Icon name="plus" size={16} /> {t("products.addProduct")}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink-200">
        {[["all", t("products.tabAll") || "All Products"], ["pending", t("products.tabPending") || "Pending Approval"]].map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1); }}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === key ? "border-gold-500 text-gold-600" : "border-transparent text-muted hover:text-ink-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "all" && <div className="card p-4 flex flex-col sm:flex-row gap-3 flex-wrap">
        <form onSubmit={onSearchSubmit} className="flex-1 flex gap-2 min-w-[200px]">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("products.searchPlaceholder")} className="field flex-1" />
          <button type="submit" className="btn-primary px-4 h-[46px]">
            <Icon name="search" size={18} />
          </button>
        </form>
        <select
          value={merchantShopId}
          onChange={(e) => { setMerchantShopId(e.target.value); setPage(1); }}
          className="field sm:w-48"
        >
          <option value="all">{t("products.allMerchants")}</option>
          {merchantShops.map((s) => (
            <option key={s.id} value={String(s.id)}>{s.name}</option>
          ))}
        </select>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          className="field sm:w-44"
        >
          <option value="all">{t("common.allCategories")}</option>
          {categories.map((c) => (
            <option key={c} value={c} className="capitalize">
              {c}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="field sm:w-40"
        >
          <option value="all">{t("common.all")}</option>
          <option value="active">{t("common.active")}</option>
          <option value="inactive">{t("common.inactive")}</option>
        </select>
      </div>}

      {/* Pending tab toolbar */}
      {tab === "pending" && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Store filter */}
          <select
            value={pendingShopFilter}
            onChange={(e) => setPendingShopFilter(e.target.value)}
            className="field !h-9 !py-0 text-sm min-w-[160px]"
          >
            <option value="">{t("products.allStores")}</option>
            {pendingShops.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Sort */}
          <div className="relative flex items-center">
            <Icon name="arrowUpDown" size={14} className="absolute left-3 text-muted pointer-events-none" />
            <select
              value={pendingSort}
              onChange={(e) => setPendingSort(e.target.value)}
              className="field !h-9 !py-0 text-sm min-w-[180px]"
              style={{ paddingLeft: "2rem" }}
            >
              <option value="newest">{t("products.sortNewestFirst")}</option>
              <option value="oldest">{t("products.sortOldestFirst")}</option>
              <option value="title_asc">{t("products.sortTitleAZ")}</option>
              <option value="shop_asc">{t("products.sortStoreAZ")}</option>
            </select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Count badge */}
          {displayedItems.length > 0 && (
            <span className="text-xs text-muted">{displayedItems.length} {t("products.countLabel")}</span>
          )}

          {/* View toggle */}
          <div className="flex rounded-lg border border-ink-200 overflow-hidden">
            <button
              onClick={() => setPendingView("list")}
              className={`px-2.5 h-9 flex items-center justify-center transition ${pendingView === "list" ? "bg-ink-800 text-white" : "text-muted hover:bg-ink-50"}`}
              title={t("products.listView")}
            >
              <Icon name="layoutList" size={15} />
            </button>
            <button
              onClick={() => setPendingView("grid")}
              className={`px-2.5 h-9 flex items-center justify-center border-l border-ink-200 transition ${pendingView === "grid" ? "bg-ink-800 text-white" : "text-muted hover:bg-ink-50"}`}
              title={t("products.gridView")}
            >
              <Icon name="layoutGrid" size={15} />
            </button>
          </div>
        </div>
      )}

      {/* Pending approval — empty state */}
      {tab === "pending" && !loading && displayedItems.length === 0 && (
        <div className="card p-8 text-center text-muted">
          {items.length === 0 ? t("products.noPendingProducts") : t("products.noFilterMatch")}
        </div>
      )}

      {/* Pending approval — LIST view */}
      {tab === "pending" && pendingView === "list" && displayedItems.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 bg-ink-50/60">
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider">{t("products.colProduct")}</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider hidden md:table-cell">{t("products.colStore")}</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider hidden sm:table-cell">{t("products.colPrice")}</th>
                <th className="text-left px-4 py-2.5 text-[11px] font-semibold text-muted uppercase tracking-wider hidden lg:table-cell">{t("common.submitted")}</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-muted uppercase tracking-wider">{t("products.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {displayedItems.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={fileUrl(p.image)}
                        alt=""
                        className="w-10 h-12 object-cover rounded-lg border border-ink-100 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-semibold text-ink-800 line-clamp-1 text-[13px]">{p.title}</p>
                        <p className="text-xs text-muted capitalize mt-0.5">{p.brand} · {p.category}</p>
                        {p.subImages?.length > 0 && (
                          <span className="text-[10px] text-gold-500 font-medium">+{p.subImages.length} photo{p.subImages.length > 1 ? "s" : ""}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-[13px] text-ink-700 font-medium">{p.shopName || "—"}</p>
                    <p className="text-xs text-muted">@{p.ownerAccount || `user#${p.ownerUserId}`}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-[13px] font-semibold text-ink-800">{p.currency} {Number(p.retailPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-xs text-muted">{t("products.stockLabel").replace("{n}", p.stock)}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-xs text-muted">{new Date(p.createdAt).toLocaleDateString()}</p>
                    <p className="text-xs text-muted/60">{new Date(p.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingProduct(p)}
                        className="h-8 px-3 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50 text-xs font-medium transition flex items-center gap-1"
                      >
                        <Icon name="eye" size={12} /> {t("common.view")}
                      </button>
                      <button
                        onClick={() => approveProduct(p)}
                        className="h-8 px-3 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-xs font-medium transition flex items-center gap-1"
                      >
                        <Icon name="check" size={12} /> {t("common.approve")}
                      </button>
                      <button
                        onClick={() => { setReviewing({ product: p, action: "reject" }); setReviewNote(""); }}
                        className="h-8 px-3 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 text-xs font-medium transition flex items-center gap-1"
                      >
                        <Icon name="close" size={12} /> {t("common.reject")}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending approval — GRID view */}
      {tab === "pending" && pendingView === "grid" && displayedItems.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {displayedItems.map((p) => (
            <div key={p.id} className="card overflow-hidden flex flex-col">
              <div className="relative w-full aspect-[4/5] bg-ink-100 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(p.image)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {p.subImages?.length > 0 && (
                  <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-md">
                    +{p.subImages.length}
                  </span>
                )}
              </div>
              <div className="p-2.5 flex-1 space-y-0.5">
                <p className="font-semibold text-ink-800 line-clamp-2 text-xs leading-snug">{p.title}</p>
                <p className="text-[10px] text-muted capitalize">{p.brand}</p>
                <p className="text-[11px] font-medium text-ink-700">{p.currency} {Number(p.retailPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                <p className="text-[10px] text-muted truncate">@{p.ownerAccount}</p>
              </div>
              <div className="px-2.5 pb-2.5 flex gap-1.5">
                <button onClick={() => setViewingProduct(p)} className="flex-1 h-7 rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50 text-[10px] font-medium transition flex items-center justify-center gap-0.5">
                  <Icon name="eye" size={11} /> {t("common.view")}
                </button>
                <button onClick={() => approveProduct(p)} className="flex-1 h-7 rounded-lg bg-gold-500 hover:bg-gold-600 text-white text-[10px] font-medium transition flex items-center justify-center gap-0.5">
                  <Icon name="check" size={11} /> {t("common.approve")}
                </button>
                <button onClick={() => { setReviewing({ product: p, action: "reject" }); setReviewNote(""); }} className="w-7 h-7 rounded-lg border border-rose-200 text-rose-500 hover:bg-rose-50 flex items-center justify-center transition">
                  <Icon name="close" size={11} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>}

      {tab === "all" && <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <SortTh base="title" label={t("products.colProduct")} sort={sort} onSort={cycleSort} />
                <SortTh base="merchant" label={t("products.colMerchant")} sort={sort} onSort={cycleSort} />
                <SortTh base="category" label={t("products.colCategory")} sort={sort} onSort={cycleSort} />
                <SortTh base="price" label={t("products.colPrice")} sort={sort} onSort={cycleSort} />
                <SortTh base="discount" label={t("products.colSale")} sort={sort} onSort={cycleSort} />
                <SortTh base="commission" label={t("orders.colCommission")} sort={sort} onSort={cycleSort} />
                <SortTh base="stock" label={t("products.colStock")} sort={sort} onSort={cycleSort} />
                <SortTh base="active" label={t("channels.colActive")} sort={sort} onSort={cycleSort} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3 min-w-[220px]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-ink-100 shrink-0" />
                        <div>
                          <div className="font-medium text-ink-800 line-clamp-1">{p.title}</div>
                          <div className="text-xs text-muted">{p.brand}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {p.shopName ? (
                        <div>
                          <p className="text-sm font-medium text-ink-700">{p.shopName}</p>
                          {p.ownerAccount && <p className="text-xs text-muted">@{p.ownerAccount}</p>}
                        </div>
                      ) : (
                        <span className="text-xs text-muted">{t("products.platformFallback")}</span>
                      )}
                    </td>
                    <td className="capitalize">{p.category}</td>
                    <td>{money(p.retailPrice, p.currency)}</td>
                    <td>
                      {p.saleType === "none" ? (
                        <span className="text-muted text-xs">{t("products.noSale")}</span>
                      ) : (
                        <span className={`pill ${p.onSale ? "pill-success" : "pill-muted"}`}>
                          {p.saleType === "percent" ? `${p.saleValue}% off` : money(p.saleValue, p.currency)}
                          {p.onSale ? "" : ` (${t("products.scheduled")})`}
                        </span>
                      )}
                    </td>
                    <td>{money(p.commission, p.currency)}</td>
                    <td>{p.stock}</td>
                    <td>
                      <button
                        disabled={toggling === p.id}
                        onClick={() => toggleActive(p)}
                        className={`pill ${p.isActive ? "pill-success" : "pill-muted"}`}
                      >
                        {p.isActive ? t("common.active") : t("common.inactive")}
                      </button>
                    </td>
                    <td className="whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openAssignModal(p)}
                          className="btn-ghost px-2.5 py-1.5 text-xs flex items-center gap-1 text-gold-600"
                          title={t("products.assignToShop")}
                        >
                          <Icon name="store" size={12} /> {t("products.shopBtn")}
                        </button>
                        <button onClick={() => openEdit(p)} className="btn-ghost px-3 py-1.5 text-xs">
                          {t("common.edit")}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          disabled={deletingId === p.id}
                          className="btn-ghost px-2 py-1.5 text-xs text-rose-500 hover:bg-rose-50 disabled:opacity-40"
                          title={t("common.delete")}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">{t("products.noProducts")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>}

      {tab === "all" && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>{t("products.pageInfo", { page, totalPages, total })}</span>
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
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? t("products.editProduct") : t("products.addProduct")}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="btn-ghost px-4 py-2 text-sm">
              {t("common.cancel")}
            </button>
            <button onClick={save} disabled={saving} className="btn-primary px-4 py-2 text-sm">
              {saving ? t("common.saving") : editing ? t("common.saveChanges") : t("products.createProductBtn")}
            </button>
          </>
        }
      >
        {/* Product image + sub-images */}
        <div className="sm:col-span-2">
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-2">{t("products.imageUrl")}</label>
          <div className="flex gap-3 flex-wrap">
            <div className="w-[80px]">
              <ImageCropUploader
                value={imagePreview}
                label={t("products.mainLabel")}
                onCrop={(blob, preview) => { setImageBlob(blob); setImagePreview(preview); }}
              />
            </div>
            {keepSubs.map((url) => (
              <div key={url} className="relative w-[80px] aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fileUrl(url)} alt="" className="w-full h-full object-cover rounded-lg border border-ink-200" />
                <button
                  type="button"
                  onClick={() => setKeepSubs((prev) => prev.filter((u) => u !== url))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-400 transition"
                >
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))}
            {newSubs.map(({ preview }, idx) => (
              <div key={idx} className="relative w-[80px] aspect-[4/5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="" className="w-full h-full object-cover rounded-lg border border-ink-200" />
                <button
                  type="button"
                  onClick={() => setNewSubs((prev) => prev.filter((_, i) => i !== idx))}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center hover:bg-rose-400 transition"
                >
                  <Icon name="x" size={10} />
                </button>
              </div>
            ))}
            {(keepSubs.length + newSubs.length) < 6 && (
              <div className="w-[80px] aspect-[4/5]">
                <input ref={subRef} type="file" accept="image/*" onChange={handleSubFile} className="hidden" />
                <button
                  type="button"
                  onClick={() => subRef.current?.click()}
                  className="w-full h-full rounded-lg border-2 border-dashed border-ink-200 hover:border-gold-400 bg-ink-50 flex flex-col items-center justify-center gap-1 text-ink-300 hover:text-ink-500 transition"
                >
                  <Icon name="plus" size={16} />
                  <span className="text-[10px]">{t("products.subLabel")}</span>
                </button>
              </div>
            )}
          </div>
          <p className="text-xs text-muted mt-1">{t("products.imageHint")}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.title_")}</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} className="field mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.brand")}</label>
            <input value={form.brand} onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))} className="field mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.category")}</label>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="field mt-1">
              <option value="">{t("products.selectCategory")}</option>
              {categories.map((c) => (
                <option key={c} value={c} className="capitalize">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.currency")}</label>
            <select value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))} className="field mt-1">
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace("USDT-", "USDT/")}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.stock")}</label>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.supplyPrice")}</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.supplyPrice}
              onChange={(e) => setForm((f) => ({ ...f, supplyPrice: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.retailPrice")}</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.retailPrice}
              onChange={(e) => setForm((f) => ({ ...f, retailPrice: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.commissionUnit")}</label>
            <input
              type="number"
              step="0.01"
              min={0}
              value={form.commission}
              onChange={(e) => setForm((f) => ({ ...f, commission: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.rating")}</label>
            <input
              type="number"
              step="0.1"
              min={0}
              max={5}
              value={form.rating}
              onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.reviewCount")}</label>
            <input
              type="number"
              min={0}
              value={form.reviewCount}
              onChange={(e) => setForm((f) => ({ ...f, reviewCount: e.target.value }))}
              className="field mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.description")}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="field mt-1 !h-24 !py-2"
            />
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-ink-100 space-y-3">
          <p className="text-xs font-semibold text-muted uppercase tracking-widest">{t("products.saleSection")}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.saleType")}</label>
              <select
                value={form.saleType}
                onChange={(e) => setForm((f) => ({ ...f, saleType: e.target.value }))}
                className="field mt-1"
              >
                <option value="none">{t("products.saleNone")}</option>
                <option value="percent">{t("products.salePercent")}</option>
                <option value="fixed">{t("products.saleFixed")}</option>
              </select>
            </div>
            {form.saleType !== "none" && (
              <div>
                <label className="text-xs font-semibold text-muted uppercase tracking-wide">
                  {form.saleType === "percent" ? t("products.salePercentOff") : t("products.saleFixedPrice")}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  max={form.saleType === "percent" ? 99 : undefined}
                  value={form.saleValue}
                  onChange={(e) => setForm((f) => ({ ...f, saleValue: e.target.value }))}
                  className="field mt-1"
                />
              </div>
            )}
            {form.saleType !== "none" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.saleStartsAt")}</label>
                  <input
                    type="datetime-local"
                    value={form.saleStartsAt}
                    onChange={(e) => setForm((f) => ({ ...f, saleStartsAt: e.target.value }))}
                    className="field mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted uppercase tracking-wide">{t("products.saleEndsAt")}</label>
                  <input
                    type="datetime-local"
                    value={form.saleEndsAt}
                    onChange={(e) => setForm((f) => ({ ...f, saleEndsAt: e.target.value }))}
                    className="field mt-1"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Sub-image crop/fit dialog */}
        {subCropFile && (
          <Cropper
            file={subCropFile}
            aspect={4 / 5}
            maxWidth={1000}
            onCropped={addCroppedSub}
            onCancel={() => setSubCropFile(null)}
          />
        )}
      </Modal>

      {/* Reject product confirmation */}
      {reviewing && (
        <Modal open onClose={() => setReviewing(null)} title={t("products.rejectTitle").replace("{title}", reviewing.product.title)}>
          <div className="space-y-4 p-4">
            <p className="text-sm text-muted">{t("products.rejectHint")}</p>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={t("products.rejectionReasonPlaceholder")}
              rows={3}
              className="field w-full"
            />
            <div className="flex justify-end gap-3">
              <button onClick={() => setReviewing(null)} className="btn-ghost px-4 py-2 text-sm">{t("common.cancel")}</button>
              <button
                onClick={() => rejectProduct(reviewing.product, reviewNote)}
                className="btn-primary px-4 py-2 text-sm bg-rose-600 hover:bg-rose-700"
              >
                {t("products.confirmReject")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Product detail modal (pending review) */}
      {viewingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => setViewingProduct(null)} />
          <div className="relative card w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-ink-100 flex items-center justify-between shrink-0">
              <h3 className="serif text-lg font-bold text-ink-800">{t("products.reviewTitle")}</h3>
              <button onClick={() => setViewingProduct(null)} className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            {/* Body */}
            <div className="overflow-y-auto flex-1 p-5 space-y-5">
              {/* Images */}
              <div className="flex gap-3">
                {/* Main image */}
                <div className="w-36 shrink-0">
                  <div className="w-full aspect-[4/5] rounded-xl overflow-hidden bg-ink-100 border border-ink-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileUrl(viewingProduct.image)} alt="" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-[10px] text-muted text-center mt-1">{t("products.mainLabel")}</p>
                </div>
                {/* Sub-images */}
                {viewingProduct.subImages?.length > 0 && (
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-2">{t("products.subImagesCount").replace("{n}", viewingProduct.subImages.length)}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {viewingProduct.subImages.map((url, i) => (
                        <div key={i} className="aspect-[4/5] rounded-lg overflow-hidden bg-ink-100 border border-ink-200">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={fileUrl(url)} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {/* Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-lg font-bold text-ink-800">{viewingProduct.title}</p>
                  <p className="text-sm text-muted capitalize">{viewingProduct.brand} · {viewingProduct.category}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-ink-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted uppercase tracking-wide">{t("products.colPrice")}</p>
                    <p className="text-sm font-semibold text-ink-800">{viewingProduct.currency} {Number(viewingProduct.retailPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted uppercase tracking-wide">{t("products.colStock")}</p>
                    <p className="text-sm font-semibold text-ink-800">{viewingProduct.stock}</p>
                  </div>
                  <div className="bg-ink-50 rounded-lg p-2.5">
                    <p className="text-[10px] text-muted uppercase tracking-wide">{t("products.colMerchant")}</p>
                    <p className="text-sm font-semibold text-ink-800 truncate">@{viewingProduct.ownerAccount || `#${viewingProduct.ownerUserId}`}</p>
                  </div>
                </div>
                {viewingProduct.description && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wide mb-1">{t("products.description")}</p>
                    <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{viewingProduct.description}</p>
                  </div>
                )}
              </div>
            </div>
            {/* Footer actions */}
            <div className="px-5 py-4 border-t border-ink-100 flex gap-3 shrink-0">
              <button
                onClick={() => { setReviewing({ product: viewingProduct, action: "reject" }); setReviewNote(""); setViewingProduct(null); }}
                className="flex-1 btn-ghost px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center justify-center gap-2"
              >
                <Icon name="close" size={14} /> {t("common.reject")}
              </button>
              <button
                onClick={() => { approveProduct(viewingProduct); setViewingProduct(null); }}
                className="flex-1 btn-primary px-4 py-2 text-sm flex items-center justify-center gap-2"
              >
                <Icon name="check" size={14} /> {t("common.approve")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shop assignment modal */}
      {assignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setAssignModal(null)} />
          <div className="relative card w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="serif text-lg font-bold text-ink-800">{t("products.assignToShopTitle")}</h3>
              <button onClick={() => setAssignModal(null)} className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
                <Icon name="close" size={18} />
              </button>
            </div>
            <div className="flex items-center gap-3 p-3 bg-ink-50 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={assignModal.image} alt="" className="w-10 h-10 rounded-lg object-cover border border-ink-100 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink-800 line-clamp-1">{assignModal.title}</p>
                <p className="text-xs text-muted">{assignModal.brand}</p>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-1.5">{t("products.shopLabel")}</label>
              <select
                value={assignShopId}
                onChange={(e) => setAssignShopId(e.target.value)}
                className="field w-full"
              >
                <option value="">{t("products.noShopPlatform")}</option>
                {merchantShops.map((s) => (
                  <option key={s.id} value={String(s.id)}>{s.name}</option>
                ))}
              </select>
            </div>
            {assignModal.shopName && assignShopId === String(assignModal.shopId) && (() => {
              const [prefix, suffix] = t("products.currentlyAssigned").split("{shopName}");
              return <p className="text-xs text-muted">{prefix}<strong>{assignModal.shopName}</strong>{suffix}</p>;
            })()}
            <div className="flex gap-3 pt-1">
              <button onClick={() => setAssignModal(null)} className="btn-ghost flex-1 py-2 text-sm">{t("common.cancel")}</button>
              <button
                onClick={saveShopAssignment}
                disabled={assigning || assignShopId === (assignModal.shopId ? String(assignModal.shopId) : "")}
                className="btn-primary flex-1 py-2 text-sm disabled:opacity-40"
              >
                {assigning ? t("common.saving") : t("common.save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category management modal */}
      {catModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => setCatModal(false)} />
          <div className="relative card w-full max-w-sm p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="serif text-lg font-bold text-ink-800">{t("products.manageCategoriesTitle")}</h3>
              <button onClick={() => setCatModal(false)} className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100">
                <Icon name="close" size={18} />
              </button>
            </div>

            {/* Add new */}
            <div className="flex gap-2">
              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                placeholder={t("products.newCategoryPlaceholder")}
                className="field flex-1 !py-2 text-sm"
              />
              <button
                onClick={addCategory}
                disabled={catSaving || !newCatName.trim()}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {catSaving ? "…" : t("common.add")}
              </button>
            </div>

            {/* Existing categories */}
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {categories.length === 0 && (
                <p className="text-sm text-muted text-center py-4">{t("products.noCategoriesYet")}</p>
              )}
              {categories.map((cat) => (
                <div key={cat} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-ink-50 group">
                  {editingCat === cat ? (
                    <>
                      <input
                        autoFocus
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveRenameCategory(); }
                          if (e.key === "Escape") cancelEditCat();
                        }}
                        className="field flex-1 !py-1 !h-8 text-sm"
                      />
                      <button
                        onClick={saveRenameCategory}
                        disabled={catRenaming === cat}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-600 hover:bg-emerald-50 transition disabled:opacity-40 shrink-0"
                        title={t("common.save")}
                      >
                        {catRenaming === cat
                          ? <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          : <Icon name="check" size={14} />
                        }
                      </button>
                      <button
                        onClick={cancelEditCat}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-400 hover:bg-ink-100 transition shrink-0"
                        title={t("common.cancel")}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-ink-800 capitalize">{cat}</span>
                      <button
                        onClick={() => startEditCat(cat)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-300 hover:text-gold-600 hover:bg-gold-50 transition opacity-0 group-hover:opacity-100 shrink-0"
                        title={t("products.renameTooltip").replace("{name}", cat)}
                      >
                        <Icon name="edit" size={13} />
                      </button>
                      <button
                        onClick={() => deleteCategory(cat)}
                        disabled={catDeleting === cat}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-ink-300 hover:text-rose-500 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100 disabled:opacity-40 shrink-0"
                        title={t("products.deleteTooltip").replace("{name}", cat)}
                      >
                        {catDeleting === cat
                          ? <div className="w-3.5 h-3.5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                          : <Icon name="trash" size={13} />
                        }
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>

            <p className="text-xs text-muted">{t("products.categoriesNote")}</p>
          </div>
        </div>
      )}
    </div>
  );
}
