"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

function money(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function BarChart({ bars = [], labels = [] }) {
  const max = Math.max(...bars, 1);
  return (
    <div className="flex items-end gap-1.5 h-28 mt-3">
      {bars.map((v, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
          <div
            className="w-full rounded-t"
            style={{
              height: `${Math.max((v / max) * 96, v > 0 ? 4 : 0)}px`,
              background: v > 0 ? "linear-gradient(to top, #b8903a, #e2c56a)" : "#f1ede8",
            }}
          />
          {labels[i] && <span className="text-[9px] text-muted leading-none">{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

const PERIODS = [
  { key: "today", labelKey: "storeStats.periodToday" },
  { key: "week", labelKey: "storeStats.periodWeek" },
  { key: "month", labelKey: "storeStats.periodMonth" },
  { key: "all", labelKey: "storeStats.periodAll" },
];

export default function StoreStatsPage() {
  const { t } = useI18n();
  const [period, setPeriod] = useState("week");
  const [shopId, setShopId] = useState("all");
  const [stores, setStores] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/shops?status=all").then((d) => setStores(d.items || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ period });
    if (shopId !== "all") params.set("shopId", shopId);
    api.get(`/shops/stats/summary?${params}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [period, shopId]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("storeStats.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("storeStats.subtitle")}</p>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex gap-2 flex-wrap">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-4 h-9 rounded-full text-sm font-medium border transition-colors ${
                period === p.key ? "bg-gold-600 border-gold-600 text-white" : "bg-white border-ink-200 text-ink-600 hover:border-gold-400"
              }`}
            >
              {t(p.labelKey)}
            </button>
          ))}
        </div>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="field sm:w-56 sm:ml-auto">
          <option value="all">{t("storeStats.allStores")}</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center text-muted py-16">{t("common.loading")}</div>
      ) : !data ? (
        <div className="text-center text-muted py-16">{t("storeStats.noData")}</div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5">
              <p className="text-sm text-muted">{t("storeStats.revenue")}</p>
              <p className="serif text-2xl font-bold mt-1 text-ink-800">{money(data.revenue)}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm text-muted">{t("storeStats.orders")}</p>
              <p className="serif text-2xl font-bold mt-1 text-ink-800">{data.orders ?? "—"}</p>
            </div>
          </div>

          {data.bars && data.bars.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-ink-800">{t("storeStats.revenueChart")}</h3>
              <BarChart bars={data.bars} labels={data.labels} />
            </div>
          )}

          {data.topStores && data.topStores.length > 0 && (
            <div className="card p-0 overflow-hidden">
              <div className="px-5 py-4 border-b border-ink-100 font-semibold text-ink-800">{t("storeStats.topStores")}</div>
              <div className="table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t("stores.colStoreName")}</th>
                      <th>{t("storeStats.revenue")}</th>
                      <th>{t("storeStats.orders")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topStores.map((s) => (
                      <tr key={s.id}>
                        <td><Link href={`/shops/${s.id}`} className="text-ink-800 font-medium hover:text-gold-600 hover:underline">{s.name}</Link></td>
                        <td>{money(s.revenue)}</td>
                        <td>{s.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
