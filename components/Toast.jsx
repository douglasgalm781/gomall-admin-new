"use client";
import { createContext, useContext, useCallback, useState } from "react";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

const ToastContext = createContext({
  show: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
});

let counter = 0;

const VARIANTS = {
  success: { icon: "checkCircle", chip: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500" },
  error: { icon: "alert", chip: "bg-rose-50 text-rose-600", bar: "bg-rose-500" },
  warning: { icon: "alert", chip: "bg-gold-50 text-gold-600", bar: "bg-gold-500" },
  info: { icon: "info", chip: "bg-gold-50 text-gold-600", bar: "bg-gold-500" },
};

export function ToastProvider({ children }) {
  const { t } = useI18n();
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.map((tt) => (tt.id === id ? { ...tt, leaving: true } : tt)));
    setTimeout(() => setToasts((prev) => prev.filter((tt) => tt.id !== id)), 220);
  }, []);

  const show = useCallback(
    (message, type = "info", duration = 3200) => {
      const id = ++counter;
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const api = {
    show,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "error", d),
    warning: (m, d) => show(m, "warning", d),
    info: (m, d) => show(m, "info", d),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* Toaster */}
      <div className="fixed top-4 right-4 w-full max-w-sm px-3 z-[70] flex flex-col items-stretch gap-2 pointer-events-none">
        {toasts.map((tt) => {
          const v = VARIANTS[tt.type] || VARIANTS.info;
          return (
            <div
              key={tt.id}
              className={`pointer-events-auto w-full bg-white rounded-2xl gold-hairline shadow-card overflow-hidden ${
                tt.leaving ? "toast-out" : "toast-in"
              }`}
              role="status"
            >
              <div className="flex items-center gap-3 px-3.5 py-3">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${v.chip}`}>
                  <Icon name={v.icon} size={18} />
                </span>
                <p className="flex-1 text-[13.5px] leading-snug text-ink-800 whitespace-pre-line">{tt.message}</p>
                <button
                  onClick={() => remove(tt.id)}
                  className="w-7 h-7 flex items-center justify-center text-ink-400 hover:text-ink-600 shrink-0"
                  aria-label={t("common.close")}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
              <div className={`h-0.5 w-full ${v.bar} opacity-80`} />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
