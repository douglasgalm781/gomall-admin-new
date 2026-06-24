"use client";
import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { useAdminSession } from "@/lib/store";
import { getToken } from "@/lib/api";
import { useWss } from "@/lib/wss";
import { refreshBadges } from "@/lib/useBadges";
import { useToast } from "@/components/Toast";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { ready } = useAdminSession();
  const toast = useToast();

  useEffect(() => {
    if (ready && !getToken()) {
      router.replace("/login");
    }
  }, [ready, router]);

  const onWsMessage = useCallback((d) => {
    if (d.type === "badge" || d.type === "chat" || d.type === "product_pending") {
      refreshBadges();
    }
    if (d.type === "notification" && d.notification?.title && !d.userId) {
      toast.info(d.notification.title);
    }
    if (d.type === "product_pending") {
      toast.info(`New product for review: "${d.productTitle}" by ${d.merchantName}`);
    }
  }, [toast]);

  useWss(onWsMessage);

  if (!ready) return null;

  return (
    <div className="admin-shell">
      <Sidebar />
      <div className="admin-main">
        <Topbar />
        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}
