"use client";
/**
 * useWss — subscribes to the GoMall WebSocket server as an admin.
 *
 * Connects on mount, auto-reconnects with exponential back-off,
 * and disconnects on unmount.  Pass an `onMessage` callback to
 * receive parsed event objects.
 *
 * WS URL: derived from NEXT_PUBLIC_API_BASE_URL via getWsUrl() (auto-upgrades to wss:// on HTTPS)
 * Auth:   Bearer token read from localStorage via getToken()
 */

import { useCallback, useEffect, useRef } from "react";
import { getToken, getWsUrl } from "@/lib/api";

export function useWss(onMessage) {
  const wsRef    = useRef(null);
  const retryRef = useRef(null);
  const delayRef = useRef(1000);
  const mountRef = useRef(true);
  const cbRef    = useRef(onMessage);

  // Keep callback ref fresh without re-connecting
  useEffect(() => { cbRef.current = onMessage; }, [onMessage]);

  const connect = useCallback(() => {
    if (!mountRef.current) return;
    const token  = typeof window !== "undefined" ? getToken()  : null;
    const wsBase = typeof window !== "undefined" ? getWsUrl()  : null;
    if (!token || !wsBase) return;

    const url = `${wsBase}?token=${encodeURIComponent(token)}`;
    let ws;
    try { ws = new WebSocket(url); }
    catch { return; }

    wsRef.current = ws;

    ws.onopen = () => {
      delayRef.current = 1000; // reset back-off on success
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type !== "connected") cbRef.current?.(data);
      } catch (_) {}
    };

    ws.onclose = () => {
      if (!mountRef.current) return;
      const delay = delayRef.current;
      delayRef.current = Math.min(delay * 2, 30_000); // cap at 30 s
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      try { ws.close(); } catch (_) {}
    };
  }, []);

  useEffect(() => {
    mountRef.current = true;
    connect();
    return () => {
      mountRef.current = false;
      clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  return wsRef;
}
