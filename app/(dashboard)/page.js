"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

const CARDS = [
  { key: "members", labelKey: "dashboard.cardMembers", icon: "users", format: "int" },
  { key: "pendingKyc", labelKey: "dashboard.cardPendingKyc", icon: "idCard", format: "int" },
  { key: "pendingShops", labelKey: "dashboard.cardPendingShops", icon: "store", format: "int" },
  { key: "pendingRecharge", labelKey: "dashboard.cardPendingRecharge", icon: "deposit", format: "int" },
  { key: "pendingWithdrawals", labelKey: "dashboard.cardPendingWithdrawals", icon: "withdraw", format: "int" },
  { key: "ordersToday", labelKey: "dashboard.cardOrdersToday", icon: "receipt", format: "int" },
  { key: "totalBalance", labelKey: "dashboard.cardTotalBalance", icon: "wallet", format: "money" },
  { key: "revenueToday", labelKey: "dashboard.cardRevenueToday", icon: "trending", format: "money" },
];

function formatValue(value, format) {
  if (value === undefined || value === null) return "—";
  if (format === "money") {
    return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return Number(value).toLocaleString();
}

function money(v) {
  return `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function activityDescription(row, t) {
  let status = "";
  if (row.status) {
    const sk = `activity.status.${row.status}`;
    const localized = t(sk);
    status = localized === sk ? row.status : localized;
  }
  switch (row.type) {
    case "recharge": return t("activity.recharge", { account: row.account, amount: money(row.amount), status });
    case "withdraw": return t("activity.withdraw", { account: row.account, amount: money(row.amount), status });
    case "kyc":      return t("activity.kyc", { account: row.account, status });
    case "shop":     return t("activity.shop", { account: row.account, name: row.shopName, status });
    case "order":    return t("activity.order", { account: row.account, id: row.orderId, amount: money(row.amount) });
    default:         return row.description || "";
  }
}

export default function DashboardPage() {
  const { t } = useI18n();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get("/dashboard/stats")
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : t("dashboard.failed"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("dashboard.welcome")}</h2>
        <p className="text-sm text-muted mt-1">
          {t("dashboard.subtitle")}
        </p>
      </div>

      {error && (
        <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CARDS.map((c) => (
          <div key={c.key} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="w-10 h-10 rounded-xl bg-gold-50 text-gold-600 flex items-center justify-center">
                <Icon name={c.icon} size={20} />
              </span>
            </div>
            <p className="text-2xl font-bold text-ink-800 serif">
              {loading ? "…" : formatValue(stats?.[c.key], c.format)}
            </p>
            <p className="text-xs text-muted mt-1 uppercase tracking-wide">{t(c.labelKey)}</p>
          </div>
        ))}
      </div>

      <div className="card p-6">
        <h3 className="serif text-lg font-bold text-ink-800 mb-3">{t("dashboard.recentActivity")}</h3>
        {loading ? (
          <p className="text-sm text-muted">{t("common.loading")}</p>
        ) : stats?.recentActivity?.length ? (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t("dashboard.colTime")}</th>
                  <th>{t("dashboard.colType")}</th>
                  <th>{t("dashboard.colDescription")}</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentActivity.map((row, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap text-muted">
                      {row.time ? new Date(row.time).toLocaleString() : "—"}
                    </td>
                    <td className="whitespace-nowrap">
                      <span className="pill pill-muted">{t(`activity.type.${row.type}`)}</span>
                    </td>
                    <td>{activityDescription(row, t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted">{t("dashboard.noActivity")}</p>
        )}
      </div>
    </div>
  );
}
