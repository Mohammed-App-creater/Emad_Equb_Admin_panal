"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useToast } from "@/hooks/use-toast";

// ============================================================================
// Live updates over one shared WebSocket — per the backend's
// "Equb WebSocket API — Frontend Integration Guide":
//
//   URL      ws(s)://<api>/api/v1/ws?token=<jwt>   (NEXT_PUBLIC_WS_URL, else
//            derived from NEXT_PUBLIC_API_BASE_URL). Bad token → HTTP 401, the
//            socket never upgrades (the browser just sees a close).
//   Channels user:<id> and global are auto-subscribed on connect; Equb pages
//            send {type:"subscribe"|"unsubscribe", channel:"equb:<group_id>"}.
//   Events   { type, data, timestamp } — no channel field, so Equb listeners
//            match on data.group_id.
//   Close    1000 clean (stop) · 4001/4002 token invalid/revoked (wait for a
//            new token) · 1001/1011/anything else → retry with backoff.
//   Heartbeat server WS pings every 30s; the browser answers — nothing to do.
// ============================================================================

export type LiveEventName =
  | "equb.draw.started"
  | "equb.draw.completed"
  | "equb.draw.failed"
  | "equb.winner.selected"
  | "equb.contribution.paid"
  | "equb.payout.processed"
  | "equb.group.updated"
  | "notification.new";

export interface LiveEvent {
  type: LiveEventName | string;
  data: Record<string, unknown>;
  timestamp?: number;
}
type Listener = (e: LiveEvent) => void;

const RECONNECT_MS = [1000, 2000, 5000, 10000, 30000];

function wsUrl(token: string): string | null {
  const explicit = process.env.NEXT_PUBLIC_WS_URL;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  const url = explicit || (base ? base.replace(/^http/, "ws").replace(/\/+$/, "") + "/ws" : "");
  if (!url) return null;
  return url + (url.includes("?") ? "&" : "?") + "token=" + encodeURIComponent(token);
}

/** One connection per tab; kept open while anything listens. Channels are ref-counted. */
class Realtime {
  private ws: WebSocket | null = null;
  private attempt = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private channels = new Map<string, number>();
  private listeners = new Set<Listener>();
  private token: string | undefined;
  /** Server rejected the token (4001/4002): wait for a new one before reconnecting. */
  private needsNewToken = false;

  setToken(token?: string) {
    if (token === this.token) return;
    this.token = token;
    this.needsNewToken = false;
    this.close();
    this.attempt = 0;
    if (this.listeners.size > 0) this.connect();
  }

  /** Receive every event (user / global / subscribed Equb channels). */
  listen(listener: Listener): () => void {
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) this.close();
    };
  }

  /** Join an Equb's channel for as long as the returned function isn't called. */
  subscribe(channel: string): () => void {
    this.channels.set(channel, (this.channels.get(channel) ?? 0) + 1);
    if (this.isOpen()) this.send({ type: "subscribe", channel });
    else this.connect();
    return () => {
      const n = (this.channels.get(channel) ?? 1) - 1;
      if (n > 0) { this.channels.set(channel, n); return; }
      this.channels.delete(channel);
      if (this.isOpen()) this.send({ type: "unsubscribe", channel });
    };
  }

  private isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private send(msg: unknown) {
    try { this.ws?.send(JSON.stringify(msg)); } catch { /* socket went away; reconnect handles it */ }
  }

  private connect() {
    if (typeof window === "undefined" || !this.token || this.needsNewToken || this.listeners.size === 0) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;
    const url = wsUrl(this.token);
    if (!url) return;
    let ws: WebSocket;
    try { ws = new WebSocket(url); } catch { this.scheduleReconnect(); return; }
    this.ws = ws;
    ws.onopen = () => {
      this.attempt = 0;
      for (const channel of this.channels.keys()) this.send({ type: "subscribe", channel });
    };
    ws.onmessage = (m) => {
      let raw: unknown;
      try { raw = JSON.parse(String(m.data)); } catch { return; }
      if (!raw || typeof raw !== "object") return;
      const o = raw as Record<string, unknown>;
      const type = String(o.type ?? "");
      if (!type || type === "pong") return;
      const e: LiveEvent = { type, data: (o.data ?? {}) as Record<string, unknown>, timestamp: typeof o.timestamp === "number" ? o.timestamp : undefined };
      for (const l of this.listeners) l(e);
    };
    ws.onclose = (ev) => {
      if (this.ws === ws) this.ws = null;
      if (ev.code === 1000) return; // clean disconnect (ours or the server's)
      if (ev.code === 4001 || ev.code === 4002) { this.needsNewToken = true; return; } // re-auth on next token
      if (this.listeners.size > 0) this.scheduleReconnect(); // 1001 deploy, 1011 error, 1006 dropped/401…
    };
    ws.onerror = () => { /* onclose follows and decides */ };
  }

  private scheduleReconnect() {
    if (this.timer) return;
    const wait = RECONNECT_MS[Math.min(this.attempt++, RECONNECT_MS.length - 1)];
    this.timer = setTimeout(() => { this.timer = null; this.connect(); }, wait);
  }

  private close() {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    const ws = this.ws;
    this.ws = null;
    try { ws?.close(1000); } catch { /* ignore */ }
  }
}

export const realtime = new Realtime();

const str = (v: unknown) => (typeof v === "string" ? v : "");
const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

/** The Equb an event belongs to (top-level group_id, or inside its payload object). */
export function eventGroupId(e: LiveEvent): string {
  const d = e.data;
  return str(d.group_id) || str(obj(d.contribution).equb_group_id) || str(obj(d.payout).equb_group_id) || str(obj(d.group).id) || str(obj(d.winner).equb_group_id);
}
/** The round an event is about, wherever the payload puts it. */
export function eventRoundId(e: LiveEvent): string {
  const d = e.data;
  return str(d.round_id) || str(d.equb_round_id) || str(obj(d.draw).equb_round_id) || str(obj(d.contribution).equb_round_id) || str(obj(d.winner).equb_round_id);
}

/**
 * App-wide: keep the socket connected while signed in and show in-app
 * notifications (they arrive on the auto-subscribed user / global channels).
 * Mount once, in the dashboard shell.
 */
export function useRealtimeConnection() {
  const token = useAuthStore((s) => s.token);
  const { toast } = useToast();
  useEffect(() => { realtime.setToken(token ?? undefined); }, [token]);
  useEffect(() => {
    return realtime.listen((e) => {
      if (e.type !== "notification.new") return;
      const title = str(e.data.title);
      if (title) toast({ title, description: str(e.data.body) || undefined });
    });
  }, [toast]);
}

/**
 * Subscribe a screen to one Equb's channel. Each event refreshes the queries
 * it touches; `onEvent` lets the page react (draw animation etc.).
 */
export function useLiveUpdates(equbId: string | null | undefined, onEvent?: (e: LiveEvent) => void) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!equbId) return;
    const inv = (keys: (readonly unknown[])[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: k }));
    const unsubscribe = realtime.subscribe(`equb:${equbId}`);
    const unlisten = realtime.listen((e) => {
      if (!e.type.startsWith("equb.")) return;
      const gid = eventGroupId(e);
      if (gid && gid !== equbId) return; // another Equb's event
      const roundId = eventRoundId(e);
      switch (e.type) {
        case "equb.draw.started":
          inv([["round", roundId], ["equb-rounds", equbId]]);
          break;
        case "equb.draw.completed":
        case "equb.draw.failed":
          inv([["round", roundId], ["draw-preview", roundId], ["round-winners", roundId], ["equb-rounds", equbId], ["equb-winners", equbId], ["equb-dashboard", equbId]]);
          break;
        case "equb.winner.selected":
          inv([["round-winners"], ["equb-winners", equbId]]);
          break;
        case "equb.contribution.paid":
          inv([["round"], ["equb-rounds", equbId], ["draw-preview"], ["round-admin-fees"], ["equb-admin-fees", equbId], ["equb-dashboard", equbId], ["member-standing", equbId], ["equb-takaful", equbId], ["equb-takaful-balance", equbId], ["my-collections"], ["fee-ledger"]]);
          break;
        case "equb.payout.processed":
          inv([["round-winners"], ["equb-winners", equbId], ["equb-dashboard", equbId]]);
          break;
        case "equb.group.updated":
          inv([["equb", equbId], ["equbs"], ["equb-members", equbId], ["equb-dashboard", equbId]]);
          break;
        default:
          break;
      }
      onEvent?.(e);
    });
    return () => { unlisten(); unsubscribe(); };
    // onEvent is intentionally not a dependency: callers pass fresh closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equbId, qc]);
}
