"use client";
import { useEffect, useState } from "react";
import StatusPill from "@/components/StatusPill";
import { useToast } from "@/components/Toast";
import { api, ApiError, fileUrl } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const STATUS_FILTERS = ["pending", "verified", "rejected", "all"];

export default function KycPage() {
  const toast = useToast();
  const { t } = useI18n();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get(`/kyc?status=${status}`)
      .then((data) => setItems(data.items || []))
      .catch((err) => setError(err instanceof ApiError ? err.message : t("kyc.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function review(id, action) {
    setBusyId(id);
    try {
      const updated = await api.post(`/kyc/${id}/${action}`);
      if (status === "all") {
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      } else {
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
      toast.success(action === "approve" ? t("kyc.reviewedApproved", { account: updated.account }) : t("kyc.reviewedRejected", { account: updated.account }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("kyc.updateFailed"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="serif text-2xl font-bold text-ink-800">{t("kyc.title")}</h2>
          <p className="text-sm text-muted mt-1">{t("kyc.subtitle")}</p>
        </div>
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
                <th>{t("kyc.colFullName")}</th>
                <th>{t("kyc.colIdType")}</th>
                <th>{t("kyc.colIdNumber")}</th>
                <th>{t("kyc.colIdPhoto")}</th>
                <th>{t("kyc.colPhone")}</th>
                <th>{t("kyc.colContact")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.submitted")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : items.length ? (
                items.map((k) => (
                  <tr key={k.id}>
                    <td className="font-medium text-ink-800">{k.account}</td>
                    <td>{k.fullName}</td>
                    <td className="capitalize">{k.idType}</td>
                    <td>{k.idNumber}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {[{ url: k.idImageUrl, label: "F" }, { url: k.idImageBackUrl, label: "B" }].map(({ url, label }) =>
                          url ? (
                            <a key={label} href={fileUrl(url)} target="_blank" rel="noopener noreferrer" title={label === "F" ? t("kyc.viewFront") : t("kyc.viewBack")} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={fileUrl(url)} alt={label} className="w-14 h-10 rounded border border-ink-100 object-cover hover:ring-2 hover:ring-gold-400 transition" />
                              <span className="absolute bottom-0.5 left-0.5 text-[9px] font-bold bg-black/60 text-white px-1 rounded">{label}</span>
                            </a>
                          ) : (
                            <span key={label} className="w-14 h-10 rounded border border-ink-100 bg-ink-50 flex items-center justify-center text-[10px] text-muted">{label}</span>
                          )
                        )}
                      </div>
                    </td>
                    <td>{k.phone}</td>
                    <td className="text-muted text-xs">
                      {k.telegram && <div>TG: {k.telegram}</div>}
                      {k.whatsapp && <div>WA: {k.whatsapp}</div>}
                      {k.email && <div>{k.email}</div>}
                      {!k.telegram && !k.whatsapp && !k.email && "—"}
                    </td>
                    <td><StatusPill status={k.status} /></td>
                    <td className="whitespace-nowrap text-muted">{k.createdAt ? new Date(k.createdAt).toLocaleDateString() : "—"}</td>
                    <td className="whitespace-nowrap">
                      {k.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            disabled={busyId === k.id}
                            onClick={() => review(k.id, "approve")}
                            className="btn-primary px-3 py-1.5 text-xs"
                          >
                            {t("common.approve")}
                          </button>
                          <button
                            disabled={busyId === k.id}
                            onClick={() => review(k.id, "reject")}
                            className="btn-danger px-3 py-1.5 text-xs"
                          >
                            {t("common.reject")}
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted text-xs">
                          {k.reviewedAt ? new Date(k.reviewedAt).toLocaleDateString() : "—"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="text-center text-muted py-8">{t("kyc.noApplications")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
