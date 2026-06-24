"use client";
import { useEffect, useRef, useState } from "react";
import { api, ApiError, fileUrl } from "@/lib/api";
import { useToast } from "@/components/Toast";
import Icon from "@/components/Icon";
import { useI18n } from "@/lib/i18n";

const LANGS = [
  { code: "en", label: "English" },
  { code: "zh", label: "中文" },
  { code: "es", label: "Español" },
  { code: "vi", label: "Tiếng Việt" },
];

const EMPTY = {
  heroImage:       "",
  heroTitle:       { en: "", zh: "", es: "", vi: "" },
  heroSub:         { en: "", zh: "", es: "", vi: "" },
  collectionImage: "",
  collectionLabel: { en: "", zh: "", es: "", vi: "" },
  collectionTitle: { en: "", zh: "", es: "", vi: "" },
};

function LangTabs({ activeLang, onChange }) {
  return (
    <div className="flex gap-1 mb-3">
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => onChange(l.code)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
            activeLang === l.code
              ? "bg-gold-500 text-ink-900"
              : "bg-white/5 text-muted hover:bg-white/10"
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function ImageField({ label, value, onChange, hint }) {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const data = await api.upload("/site-config/upload", form);
      onChange(fileUrl(data.url));
      toast.success(t("home.imageUploaded"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("home.uploadFailed"));
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-muted uppercase tracking-wide">{label}</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("home.urlPlaceholder")}
          className="field flex-1 font-mono text-sm"
        />
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFile}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="btn-secondary h-10 px-3 text-sm flex items-center gap-1.5 shrink-0 disabled:opacity-60"
        >
          <Icon name={uploading ? "clock" : "upload"} size={14} />
          {uploading ? t("common.uploading") : t("common.upload")}
        </button>
      </div>
      {hint && <p className="text-xs text-muted">{hint}</p>}
      {value && (
        <div className="mt-2 rounded-xl overflow-hidden border border-ink-100 max-h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="preview" className="w-full h-40 object-cover" onError={(e) => { e.target.style.display = "none"; }} />
        </div>
      )}
    </div>
  );
}

export default function HomeConfigPage() {
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lang, setLang] = useState("en");

  useEffect(() => {
    api.get("/site-config/home")
      .then((data) => setForm({ ...EMPTY, ...data }))
      .catch(() => toast.error(t("home.loadFailed")))
      .finally(() => setLoading(false));
  }, []);

  function setLangField(field, langCode, value) {
    setForm((f) => ({ ...f, [field]: { ...f[field], [langCode]: value } }));
  }

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/site-config/home", form);
      toast.success(t("home.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("home.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted text-sm">
        {t("common.loading")}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-6 max-w-2xl">
      <div>
        <h2 className="serif text-2xl font-bold text-ink-800">{t("home.title")}</h2>
        <p className="text-sm text-muted mt-1">
          {t("home.subtitle")}
        </p>
      </div>

      {/* ── Hero banner ───────────────────────────────────────────── */}
      <div className="card p-5 space-y-5">
        <h3 className="font-semibold text-ink-800">{t("home.heroBanner")}</h3>

        <ImageField
          label={t("home.backgroundImage")}
          value={form.heroImage}
          onChange={(v) => setForm((f) => ({ ...f, heroImage: v }))}
          hint={t("home.heroImageHint")}
        />

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-2">
            {t("home.heroTitle")} <span className="normal-case font-normal">{t("home.perLanguage")}</span>
          </label>
          <LangTabs activeLang={lang} onChange={setLang} />
          <input
            type="text"
            value={form.heroTitle[lang]}
            onChange={(e) => setLangField("heroTitle", lang, e.target.value)}
            placeholder={t("home.i18nDefaultHint")}
            className="field w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-2">
            {t("home.heroSubtitle")} <span className="normal-case font-normal">{t("home.perLanguage")}</span>
          </label>
          <LangTabs activeLang={lang} onChange={setLang} />
          <textarea
            rows={2}
            value={form.heroSub[lang]}
            onChange={(e) => setLangField("heroSub", lang, e.target.value)}
            placeholder={t("home.i18nDefaultHint")}
            className="field w-full resize-none"
          />
        </div>
      </div>

      {/* ── Featured Collection banner ─────────────────────────────── */}
      <div className="card p-5 space-y-5">
        <h3 className="font-semibold text-ink-800">{t("home.featuredCollection")}</h3>

        <ImageField
          label={t("home.backgroundImage")}
          value={form.collectionImage}
          onChange={(v) => setForm((f) => ({ ...f, collectionImage: v }))}
          hint={t("home.collectionImageHint")}
        />

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-2">
            {t("home.collectionLabel")} <span className="normal-case font-normal">{t("home.collectionLabelHint")}</span>
          </label>
          <LangTabs activeLang={lang} onChange={setLang} />
          <input
            type="text"
            value={form.collectionLabel[lang]}
            onChange={(e) => setLangField("collectionLabel", lang, e.target.value)}
            placeholder={t("home.collectionLabelPlaceholder")}
            className="field w-full"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-muted uppercase tracking-wide block mb-2">
            {t("home.collectionTitle")} <span className="normal-case font-normal">{t("home.perLanguage")}</span>
          </label>
          <LangTabs activeLang={lang} onChange={setLang} />
          <input
            type="text"
            value={form.collectionTitle[lang]}
            onChange={(e) => setLangField("collectionTitle", lang, e.target.value)}
            placeholder={t("home.collectionTitlePlaceholder")}
            className="field w-full"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="submit" disabled={saving} className="btn-primary px-6 py-2 text-sm">
          {saving ? t("common.saving") : t("common.saveChanges")}
        </button>
      </div>
    </form>
  );
}
