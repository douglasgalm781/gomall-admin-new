"use client";
import { useState } from "react";
import { useToast } from "@/components/Toast";
import { api, ApiError } from "@/lib/api";
import { useAdminSession } from "@/lib/store";
import { useI18n } from "@/lib/i18n";

const EMPTY_PW = { currentPassword: "", newPassword: "", confirmPassword: "" };

export default function SettingsPage() {
  const { t } = useI18n();
  const toast = useToast();
  const { admin } = useAdminSession();
  const [form, setForm] = useState(EMPTY_PW);
  const [saving, setSaving] = useState(false);

  async function changePassword(e) {
    e.preventDefault();
    if (!form.currentPassword) { toast.error(t("settings.currentRequired")); return; }
    if (form.newPassword.length < 6) { toast.error(t("settings.newTooShort")); return; }
    if (form.newPassword !== form.confirmPassword) { toast.error(t("settings.noMatch")); return; }
    setSaving(true);
    try {
      await api.put("/auth/password", { currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success(t("settings.passwordUpdated"));
      setForm(EMPTY_PW);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("settings.updateFailed"));
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("settings.title")}</h2>
        <p className="text-sm text-muted mt-1">{t("settings.subtitle")}</p>
      </div>

      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-ink-800">{t("settings.profile")}</h3>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[[t("settings.account"), admin?.account], [t("settings.name"), admin?.name], [t("settings.role"), admin?.role]].map(([l, v]) => (
            <div key={l}>
              <div className="text-xs font-semibold text-muted uppercase tracking-wide">{l}</div>
              <div className="text-ink-800 mt-1 capitalize">{v || "—"}</div>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={changePassword} className="card p-5 space-y-3">
        <h3 className="font-semibold text-ink-800">{t("settings.changePassword")}</h3>
        {[[t("settings.currentPassword"),"currentPassword"],[t("settings.newPassword"),"newPassword"],[t("settings.confirmPassword"),"confirmPassword"]].map(([label, key]) => (
          <div key={key}>
            <label className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
            <input type="password" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} className="field mt-1 w-full" />
          </div>
        ))}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-4 py-2 text-sm">
            {saving ? t("common.saving") : t("settings.updatePassword")}
          </button>
        </div>
      </form>
    </div>
  );
}
