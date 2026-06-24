"use client";
import { useEffect, useState } from "react";
import { api } from "./api";

let listeners = [];
let state = { chat: 0, kyc: 0, shops: 0, products: 0, finance: 0, shipping: 0, alerts: 0 };
let timer = null;

function notify() {
  listeners.forEach((fn) => fn({ ...state }));
}

async function fetchBadges() {
  try {
    const [dash, chatList, shippingList, alerts] = await Promise.all([
      api.get("/dashboard/stats"),
      api.get("/chat"),
      api.get("/shipping?pageSize=100"),
      api.get("/alerts?status=unread"),
    ]);
    state = {
      chat:     (chatList.items || []).reduce((s, c) => s + (c.unread || 0), 0),
      kyc:      dash.pendingKyc         || 0,
      shops:    dash.pendingShops       || 0,
      products: dash.pendingProducts    || 0,
      finance:  (dash.pendingRecharge   || 0) + (dash.pendingWithdrawals || 0),
      shipping: (shippingList.items || []).reduce((s, o) => s + (o.unread || 0), 0),
      alerts:   alerts.unread           || 0,
    };
    notify();
  } catch {}
}

// Call after an action that changes pending/unread counts (e.g. reading a
// chat thread) so the sidebar badges update immediately instead of waiting
// for the next poll.
export function refreshBadges() {
  fetchBadges();
}

function startPolling() {
  if (timer) return;
  fetchBadges();
  timer = setInterval(fetchBadges, 30000);
}

function stopPolling() {
  if (listeners.length > 0) return;
  clearInterval(timer);
  timer = null;
}

export function useBadges() {
  const [badges, setBadges] = useState({ ...state });

  useEffect(() => {
    listeners.push(setBadges);
    startPolling();
    return () => {
      listeners = listeners.filter((fn) => fn !== setBadges);
      stopPolling();
    };
  }, []);

  return badges;
}
