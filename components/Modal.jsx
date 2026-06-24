"use client";
import Icon from "./Icon";
import { useI18n } from "@/lib/i18n";

export default function Modal({ open, onClose, title, children, footer, maxWidth = "max-w-lg" }) {
  const { t } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative card w-full ${maxWidth} max-h-[90vh] overflow-y-auto p-6`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="serif text-lg font-bold text-ink-800">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-ink-400 hover:text-ink-600 rounded-lg hover:bg-ink-100"
            aria-label={t("common.close")}
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div>{children}</div>
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}
