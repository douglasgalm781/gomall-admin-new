"use client";
import { useEffect, useState } from "react";
import { useToast } from "@/components/Toast";
import { api, ApiError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";

export default function CurrencyPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [base, setBase] = useState("USD");
  const [date, setDate] = useState(null);
  const [rates, setRates] = useState([]);
  const [edits, setEdits] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingCode, setSavingCode] = useState(null);

  function load() {
    setLoading(true);
    setError(null);
    api
      .get("/currency")
      .then((data) => {
        setBase(data.base);
        setDate(data.date);
        setRates(data.rates || []);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : t("currency.failed")))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function save(code) {
    const value = edits[code];
    const rate = Number(value);
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error(t("currency.rateMustBePositive"));
      return;
    }
    setSavingCode(code);
    try {
      const data = await api.put(`/currency/${code}`, { rate });
      setBase(data.base);
      setDate(data.date);
      setRates(data.rates || []);
      setEdits((e) => {
        const next = { ...e };
        delete next[code];
        return next;
      });
      toast.success(t("currency.rateUpdated", { code }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("currency.updateFailed"));
    } finally {
      setSavingCode(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("currency.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("currency.subtitle", { base })}</p>
        {date && <p className="text-xs text-muted mt-1">{t("currency.lastUpdated", { date: new Date(date).toLocaleDateString() })}</p>}
      </div>

      {error && <div className="card p-4 text-sm text-rose-600 bg-rose-50 border-rose-200">{error}</div>}

      <div className="card p-0 overflow-hidden">
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t("currency.colCurrency")}</th>
                <th>{t("currency.colSymbol")}</th>
                <th>{t("currency.colRate", { base })}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-8">{t("common.loading")}</td>
                </tr>
              ) : (
                rates.map((r) => (
                  <tr key={r.code}>
                    <td className="font-medium text-ink-800">
                      {r.code} {r.isBase && <span className="pill pill-muted ml-2">{t("currency.base")}</span>}
                    </td>
                    <td>{r.symbol}</td>
                    <td>
                      {r.isBase ? (
                        <span className="text-muted">{t("currency.fixed")}</span>
                      ) : (
                        <input
                          type="number"
                          step="0.0001"
                          min={0}
                          value={edits[r.code] ?? r.rate}
                          onChange={(e) => setEdits((ed) => ({ ...ed, [r.code]: e.target.value }))}
                          className="field !h-10 !py-1 w-36"
                        />
                      )}
                    </td>
                    <td>
                      {!r.isBase && (
                        <button
                          disabled={savingCode === r.code || edits[r.code] === undefined || Number(edits[r.code]) === Number(r.rate)}
                          onClick={() => save(r.code)}
                          className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40"
                        >
                          {savingCode === r.code ? t("common.saving") : t("common.save")}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
