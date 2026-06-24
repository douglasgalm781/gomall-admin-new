"use client";
import { useRouter, usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Icon from "./Icon";
import { NAV } from "./Sidebar";
import { useAdminSession, logout } from "@/lib/store";
import { useBadges } from "@/lib/useBadges";
import { useI18n, LANGUAGES } from "@/lib/i18n";

// Routes that have pages but no Sidebar NAV entry still need a translated title.
const EXTRA_TITLES = {
  "/orders": "nav.orders",
  "/products": "nav.products",
  "/shipping": "nav.shipping",
  "/recharge": "nav.recharge",
  "/withdrawals": "nav.withdrawals",
  "/vip": "nav.vip",
};

function pageTitleKey(pathname) {
  if (pathname === "/") return "nav.dashboard";
  const match = NAV.filter((item) => item.href !== "/" && pathname?.startsWith(item.href)).sort(
    (a, b) => b.href.length - a.href.length
  )[0];
  if (match) return match.key;
  const extra = Object.keys(EXTRA_TITLES)
    .filter((href) => pathname?.startsWith(href))
    .sort((a, b) => b.length - a.length)[0];
  if (extra) return EXTRA_TITLES[extra];
  return "nav.admin";
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin } = useAdminSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  const badges = useBadges();
  const totalBadge = badges.chat + badges.kyc + badges.finance;
  const initial = (admin?.account || "A").slice(0, 1).toUpperCase();

  return (
    <header className="admin-topbar">
      <h1 className="serif text-lg font-semibold">{t(pageTitleKey(pathname))}</h1>

      <div className="flex items-center gap-3">

        {/* Language switcher */}
        <div className="flex items-center rounded-full border border-ink-200 bg-white p-0.5">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                lang === l.code ? "bg-ink-900 text-white" : "text-ink-500 hover:text-ink-800"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* Bell */}
        <Link href="/chat" className="relative w-9 h-9 rounded-full border border-ink-200 bg-white flex items-center justify-center hover:bg-ink-50 transition-colors text-ink-500 hover:text-ink-800">
          <Icon name="bell" size={17} />
          {totalBadge > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-gold-500 text-ink-900 text-[10px] font-bold flex items-center justify-center">
              {totalBadge > 99 ? "99+" : totalBadge}
            </span>
          )}
        </Link>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-full border border-ink-200 bg-white hover:bg-ink-50 transition-colors"
        >
          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-ink-900 flex items-center justify-center text-sm font-bold">
            {initial}
          </span>
          <span className="text-sm font-medium text-ink-800 hidden sm:inline max-w-[140px] truncate">
            {admin?.account || t("nav.admin")}
          </span>
          <Icon name="chevronDown" size={15} className={`text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-60 rounded-2xl border border-ink-100 bg-white shadow-xl overflow-hidden z-50 origin-top-right">
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-ink-100 bg-ink-50/60">
              <span className="w-10 h-10 rounded-full bg-gradient-to-br from-gold-300 to-gold-600 text-ink-900 flex items-center justify-center text-base font-bold shrink-0">
                {initial}
              </span>
              <div className="min-w-0">
                <p className="text-[11px] text-muted">{t("topbar.signedInAs")}</p>
                <p className="text-sm font-semibold text-ink-800 truncate">{admin?.account || "—"}</p>
                {admin?.role && <p className="text-[11px] text-gold-600 capitalize">{admin.role}</p>}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <Icon name="logout" size={16} />
              {t("topbar.signOut")}
            </button>
          </div>
        )}
      </div>

      </div>{/* end flex items-center gap-3 */}
    </header>
  );
}
