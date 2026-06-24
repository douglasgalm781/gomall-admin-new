"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { useBadges } from "@/lib/useBadges";
import { useI18n } from "@/lib/i18n";

export const NAV = [
  { href: "/", key: "nav.dashboard", label: "Dashboard", icon: "home" },
  { href: "/members", key: "nav.members", label: "Members", icon: "users" },
  { href: "/kyc", key: "nav.kyc", label: "KYC Review", icon: "idCard" },
  { href: "/products", key: "nav.products", label: "Products", icon: "package" },
  { href: "/shops", key: "nav.shops", label: "Stores", icon: "store" },
  { href: "/store-stats", key: "nav.storeStats", label: "Store Analytics", icon: "barChart" },
  { href: "/orders", key: "nav.orders", label: "Orders", icon: "receipt" },
  { href: "/finance", key: "nav.finance", label: "Finance", icon: "coins" },
  { href: "/shipping", key: "nav.shipping", label: "Shipping", icon: "truck" },
  { href: "/currency", key: "nav.currency", label: "Currency Rates", icon: "globe" },
  { href: "/payment-channels", key: "nav.channels", label: "Payment Channels", icon: "card" },
  { href: "/notifications", key: "nav.notifications", label: "Notifications", icon: "bell" },
  { href: "/chat", key: "nav.chat", label: "Support Chat", icon: "message" },
  { href: "/risk", key: "nav.risk", label: "Risk Control", icon: "shieldCheck" },
  { href: "/home-config", key: "nav.home", label: "Configuration", icon: "sliders" },
  { href: "/settings", key: "nav.settings", label: "Settings", icon: "settings" },
];

const BADGE_MAP = {
  "/chat":          "chat",
  "/kyc":           "kyc",
  "/shops":         "shops",
  "/products":      "products",
  "/finance":       "finance",
  "/shipping":      "shipping",
  "/notifications": "alerts",
};

export default function Sidebar() {
  const pathname = usePathname();
  const badges = useBadges();
  const { t } = useI18n();

  return (
    <aside className="admin-sidebar">
      <div className="px-6 py-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-gold-300 to-gold-600 text-ink-900 shrink-0">
            <Icon name="crown" size={18} />
          </span>
          <span className="serif text-lg font-bold leading-tight">
            GoMall <span className="gold-text">Admin</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-none pb-4">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : (pathname === item.href || pathname?.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link ${active ? "active" : ""}`}
            >
              <Icon name={item.icon} size={18} />
              <span className="flex-1">{t(item.key)}</span>
              {BADGE_MAP[item.href] && badges[BADGE_MAP[item.href]] > 0 && (
                <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-gold-500 text-ink-900 text-[11px] font-bold flex items-center justify-center">
                  {badges[BADGE_MAP[item.href]] > 99 ? "99+" : badges[BADGE_MAP[item.href]]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-[11px] uppercase tracking-wider text-white/35">{t("nav.appName")}</p>
      </div>
    </aside>
  );
}
