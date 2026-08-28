import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { supabase } from "@/lib/supabase";
import { formatMoney } from "@/lib/money";
import type { SelectedCustomization } from "@/types/menu";

export function adminFetch(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem("admin_token");
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  category?: string;
  customizations?: SelectedCustomization[];
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  guestName: string;
  guestPhone: string;
  items: OrderItem[];
  subtotal: number;
  total: number;
  status: string;
  orderType: string;
  paymentMethod: string;
  branchName: string;
  address: string;
  notes: string;
  createdAt: string;
  source: string;
}

export type StageStatus = "received" | "preparing" | "ready" | "delivered";
export type RealtimeStatus = "connecting" | "live" | "off";

type BrowserWindowWithAudio = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

type ActiveOrderAlarm = {
  gain: GainNode;
  oscillators: OscillatorNode[];
  sweepTimer: number;
};

type AdminOrderAlertsContextValue = {
  orders: Order[];
  setOrders: Dispatch<SetStateAction<Order[]>>;
  loading: boolean;
  realtimeStatus: RealtimeStatus;
  soundEnabled: boolean;
  soundReady: boolean;
  hasUnpreparedOrder: boolean;
  fetchOrders: (showSpinner?: boolean) => Promise<void>;
  enableSound: () => Promise<void>;
  disableSound: () => void;
};

const AdminOrderAlertsContext =
  createContext<AdminOrderAlertsContextValue | null>(null);

export function normalizeStageStatus(status: string): StageStatus {
  if (status === "delivered") return "delivered";
  if (status === "ready" || status === "out_for_delivery") return "ready";
  if (status === "preparing") return "preparing";
  return "received";
}

function getRestaurantId(): number {
  try {
    const token = localStorage.getItem("admin_token");
    if (!token) return 1;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return Number(payload.restaurant_id ?? 1);
  } catch {
    return 1;
  }
}

function getOrderNotificationBody(order: Order) {
  const customer = order.customerName || order.guestName || "Guest";
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return `${customer} • ${itemCount} item${itemCount === 1 ? "" : "s"} • ${formatMoney(order.total)}`;
}

export function AdminOrderAlertsProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("admin_order_sound") !== "off";
  });
  const [soundReady, setSoundReady] = useState(false);
  const [realtimeStatus, setRealtimeStatus] =
    useState<RealtimeStatus>("connecting");

  const fetchOrdersRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmRef = useRef<ActiveOrderAlarm | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const hasHydratedOrdersRef = useRef(false);
  const originalTitleRef = useRef<string | null>(null);
  const titleTimerRef = useRef<number | null>(null);

  const hasUnpreparedOrder = useMemo(
    () =>
      orders.some((order) => normalizeStageStatus(order.status) === "received"),
    [orders],
  );

  const fetchOrders = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await adminFetch("/api/admin/orders/current");
      if (res.ok) setOrders(await res.json());
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  fetchOrdersRef.current = () => fetchOrders(false);

  const getAudioContext = useCallback(() => {
    if (typeof window === "undefined") return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as BrowserWindowWithAudio).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }
    return audioContextRef.current;
  }, []);

  const stopOrderAlarm = useCallback(() => {
    const alarm = alarmRef.current;
    if (!alarm) return;

    window.clearInterval(alarm.sweepTimer);
    alarm.oscillators.forEach((osc) => {
      try {
        osc.stop();
      } catch {
        // Already stopped.
      }
      osc.disconnect();
    });
    alarm.gain.disconnect();
    alarmRef.current = null;
  }, []);

  const startOrderAlarm = useCallback(async () => {
    const ctx = getAudioContext();
    if (!ctx) return false;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }
    if (alarmRef.current) {
      setSoundReady(true);
      return true;
    }

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.connect(ctx.destination);

    const mainOsc = ctx.createOscillator();
    mainOsc.type = "sine";
    mainOsc.frequency.setValueAtTime(523.25, now);
    mainOsc.connect(gain);

    const overtoneOsc = ctx.createOscillator();
    overtoneOsc.type = "triangle";
    overtoneOsc.frequency.setValueAtTime(659.25, now);
    overtoneOsc.connect(gain);

    const chime = () => {
      const start = ctx.currentTime;
      gain.gain.cancelScheduledValues(start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.16, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.055, start + 0.28);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.92);

      mainOsc.frequency.cancelScheduledValues(start);
      overtoneOsc.frequency.cancelScheduledValues(start);
      mainOsc.frequency.setValueAtTime(523.25, start);
      overtoneOsc.frequency.setValueAtTime(659.25, start);
      mainOsc.frequency.exponentialRampToValueAtTime(587.33, start + 0.22);
      overtoneOsc.frequency.exponentialRampToValueAtTime(783.99, start + 0.22);
    };

    mainOsc.start(now);
    overtoneOsc.start(now);
    chime();
    const sweepTimer = window.setInterval(chime, 2200);

    alarmRef.current = {
      gain,
      oscillators: [mainOsc, overtoneOsc],
      sweepTimer,
    };

    mainOsc.addEventListener("ended", () => {
      if (alarmRef.current?.oscillators.includes(mainOsc)) {
        alarmRef.current = null;
      }
    });

    setSoundReady(true);
    return true;
  }, [getAudioContext]);

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return false;
    }
    if (Notification.permission === "granted") return true;
    if (Notification.permission === "denied") return false;

    try {
      return (await Notification.requestPermission()) === "granted";
    } catch {
      return false;
    }
  }, []);

  const enableSound = useCallback(async () => {
    setSoundEnabled(true);
    localStorage.setItem("admin_order_sound", "on");
    const ctx = getAudioContext();
    const ready = await ctx
      ?.resume()
      .then(() => true)
      .catch(() => false);
    await requestNotificationPermission();
    setSoundReady(Boolean(ready));
    if (ready && hasUnpreparedOrder) {
      void startOrderAlarm().catch(() => setSoundReady(false));
    }
  }, [
    getAudioContext,
    hasUnpreparedOrder,
    requestNotificationPermission,
    startOrderAlarm,
  ]);

  const disableSound = useCallback(() => {
    setSoundEnabled(false);
    setSoundReady(false);
    localStorage.setItem("admin_order_sound", "off");
    stopOrderAlarm();
  }, [stopOrderAlarm]);

  const notifyForNewOrders = useCallback(
    (newOrders: Order[]) => {
      if (
        !soundEnabled ||
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const shouldNotify =
        document.hidden ||
        !window.location.pathname.includes("/admin/orders/current");
      if (!shouldNotify) return;

      newOrders.forEach((order) => {
        const notification = new Notification("New Six Seven order", {
          body: getOrderNotificationBody(order),
          icon: "/icon-192.png",
          tag: `six-seven-order-${order.id}`,
          requireInteraction: true,
        });
        notification.onclick = () => {
          window.focus();
          window.location.assign("/admin/orders/current");
          notification.close();
        };
      });
    },
    [soundEnabled],
  );

  useEffect(() => {
    fetchOrders();

    const poll = window.setInterval(() => fetchOrdersRef.current(), 15000);

    let channel: ReturnType<NonNullable<typeof supabase>["channel"]> | null =
      null;
    if (supabase) {
      const restaurantId = getRestaurantId();
      const onChange = {
        schema: "public",
        table: "orders",
        filter: `restaurant_id=eq.${restaurantId}`,
      } as const;
      channel = supabase
        .channel(`orders-live-${restaurantId}`)
        .on("postgres_changes", { event: "INSERT", ...onChange }, () =>
          fetchOrdersRef.current(),
        )
        .on("postgres_changes", { event: "UPDATE", ...onChange }, () =>
          fetchOrdersRef.current(),
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") setRealtimeStatus("live");
          else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
            setRealtimeStatus("off");
          }
        });
    } else {
      setRealtimeStatus("off");
    }

    return () => {
      window.clearInterval(poll);
      if (channel) supabase?.removeChannel(channel);
      stopOrderAlarm();
    };
  }, [fetchOrders, stopOrderAlarm]);

  useEffect(() => {
    if (!soundEnabled) return;

    const unlock = () => {
      void getAudioContext()
        ?.resume()
        .then(() => {
          setSoundReady(true);
          void requestNotificationPermission();
        })
        .catch(() => setSoundReady(false));
    };

    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [getAudioContext, requestNotificationPermission, soundEnabled]);

  useEffect(() => {
    const currentOrderIds = new Set(orders.map((order) => order.id));
    const newReceivedOrders = orders.filter(
      (order) =>
        normalizeStageStatus(order.status) === "received" &&
        !knownOrderIdsRef.current.has(order.id),
    );

    if (hasHydratedOrdersRef.current && newReceivedOrders.length > 0) {
      notifyForNewOrders(newReceivedOrders);
    }

    knownOrderIdsRef.current = currentOrderIds;
    hasHydratedOrdersRef.current = true;
  }, [notifyForNewOrders, orders]);

  useEffect(() => {
    if (!soundEnabled || !hasUnpreparedOrder) {
      stopOrderAlarm();
      return;
    }

    void startOrderAlarm().catch(() => setSoundReady(false));

    return () => {
      stopOrderAlarm();
    };
  }, [hasUnpreparedOrder, soundEnabled, startOrderAlarm, stopOrderAlarm]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    if (!originalTitleRef.current) {
      originalTitleRef.current = document.title;
    }

    if (!hasUnpreparedOrder) {
      if (titleTimerRef.current) {
        window.clearInterval(titleTimerRef.current);
        titleTimerRef.current = null;
      }
      document.title = originalTitleRef.current;
      return undefined;
    }

    let showAlert = true;
    document.title = "New order - Six Seven";
    titleTimerRef.current = window.setInterval(() => {
      document.title = showAlert
        ? originalTitleRef.current || "Six Seven"
        : "New order - Six Seven";
      showAlert = !showAlert;
    }, 1200);

    return () => {
      if (titleTimerRef.current) {
        window.clearInterval(titleTimerRef.current);
        titleTimerRef.current = null;
      }
      document.title = originalTitleRef.current || "Six Seven";
    };
  }, [hasUnpreparedOrder]);

  const value = useMemo(
    () => ({
      orders,
      setOrders,
      loading,
      realtimeStatus,
      soundEnabled,
      soundReady,
      hasUnpreparedOrder,
      fetchOrders,
      enableSound,
      disableSound,
    }),
    [
      disableSound,
      enableSound,
      fetchOrders,
      hasUnpreparedOrder,
      loading,
      orders,
      realtimeStatus,
      soundEnabled,
      soundReady,
    ],
  );

  return (
    <AdminOrderAlertsContext.Provider value={value}>
      {children}
    </AdminOrderAlertsContext.Provider>
  );
}

export function useAdminOrderAlerts() {
  const context = useContext(AdminOrderAlertsContext);
  if (!context) {
    throw new Error(
      "useAdminOrderAlerts must be used within AdminOrderAlertsProvider",
    );
  }
  return context;
}
