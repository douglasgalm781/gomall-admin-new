"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { login } from "@/lib/store";
import { ApiError } from "@/lib/api";
import { useI18n, LANGUAGES } from "@/lib/i18n";

export default function AdminLoginPage() {
  const router = useRouter();
  const toast = useToast();
  const { t, lang, setLang } = useI18n();
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!account || !password) {
      toast.warning(t("login.enterCredentials"));
      return;
    }
    setLoading(true);
    try {
      await login(account.trim(), password);
      toast.success(t("login.welcomeBack"));
      router.replace("/");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : t("login.failed");
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="relative min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, #1c1813 0%, #2c2519 55%, #15110a 100%)" }}
    >
      {/* Language switcher */}
      <div className="absolute top-5 right-5 flex items-center rounded-full border border-white/15 bg-white/5 p-0.5 backdrop-blur">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLang(l.code)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              lang === l.code
                ? "bg-gradient-to-br from-gold-300 to-gold-600 text-ink-900"
                : "text-white/55 hover:text-white/90"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center mb-8 text-center">
          <span className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-gold-300 to-gold-600 text-ink-900 mb-4 shadow-card">
            <Icon name="crown" size={28} />
          </span>
          <h1 className="serif text-2xl font-bold text-cream">
            GoMall <span className="gold-text">Admin</span>
          </h1>
          <p className="text-sm text-white/45 mt-1">{t("login.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 sm:p-7 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              {t("login.account")}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                <Icon name="user" size={17} />
              </span>
              <input
                className="field !pl-10"
                type="text"
                autoComplete="username"
                placeholder="admin"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">
              {t("login.password")}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
                <Icon name="lock" size={17} />
              </span>
              <input
                className="field !pl-10 !pr-10"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
                tabIndex={-1}
                aria-label={t("login.togglePassword")}
              >
                <Icon name={showPassword ? "eyeOff" : "eye"} size={17} />
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary w-full h-12 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? t("login.signingIn") : t("login.signIn")}
          </button>
        </form>

        <p className="text-center text-xs text-white/30 mt-6">
          {t("login.footer")}
        </p>
      </div>
    </div>
  );
}
