"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

const ConfirmContext = createContext(() => Promise.resolve(false));

export function ConfirmProvider({ children }) {
  const { t } = useI18n();
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  // confirm({ title?, message, confirmText?, cancelText?, danger? }) -> Promise<boolean>
  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setOpts(typeof options === "string" ? { message: options } : options);
    });
  }, []); 

  const close = useCallback((result) => {
    if (resolver.current) resolver.current(result);
    resolver.current = null;
    setOpts(null);
  }, []);

  useEffect(() => {
    if (!opts) return;
    function onKey(e) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [opts, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {opts && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={() => close(false)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white border border-ink-100 shadow-2xl p-6">
            <div className="flex items-start gap-3">
              <span className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${opts.danger ? "bg-rose-50 text-rose-500" : "bg-gold-50 text-gold-600"}`}>
                <Icon name={opts.danger ? "alert" : "info"} size={20} />
              </span>
              <div className="min-w-0 pt-0.5">
                <h3 className="serif text-lg font-bold text-ink-800">{opts.title || t("common.confirmTitle")}</h3>
                {opts.message && <p className="text-sm text-muted mt-1.5 whitespace-pre-line leading-relaxed">{opts.message}</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => close(false)}
                className="h-10 px-4 rounded-xl border border-ink-200 text-sm font-medium text-ink-700 hover:bg-ink-50 transition-colors"
              >
                {opts.cancelText || t("common.cancel")}
              </button>
              <button
                onClick={() => close(true)}
                className={`h-10 px-5 text-sm ${opts.danger ? "btn-danger" : "btn-primary"}`}
                autoFocus
              >
                {opts.confirmText || t("common.confirm")}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  return useContext(ConfirmContext);
}
