import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Star, Loader2, PenLine, Clock, LocateFixed } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import { checkoutMetaMatch, getCartId, getSessionId, getVisitorId, track } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { getOrderingStatus, ORDER_HOURS_TEXT } from "@/lib/order-hours";
import { useOrderingStatus } from "@/hooks/use-ordering-status";
import { PAYMENT_METHODS } from "@/lib/payment";
import { formatCustomizationText } from "@/lib/customizations";
import { DeliveryPinMap } from "@/components/delivery-pin-map";

interface Branch {
  id: number;
  name: string;
  city: string;
  isOpen: boolean;
  isDefault?: boolean;
}

interface RewardSettings {
  mode: string;
  minRedeem: number;
  conversionRate: number;
  maxDiscountPercent?: number;
  rewardsEnabled?: boolean;
}

const STORE_LAT = 31.4641372;
const STORE_LNG = 74.3822137;
const STORE_ADDRESS = "Six Seven, 75 CCA, DD Block, DHA Phase 4, Lahore";
const DELIVERY_RADIUS_KM = 4;

type DeliveryArea = {
  name: string;
  lat: number;
  lng: number;
};

const LAHORE_DELIVERY_AREAS: DeliveryArea[] = [
  { name: "Aabpara Housing Society", lat: 31.4189, lng: 74.2552 },
  { name: "Abbot Road", lat: 31.5676, lng: 74.3256 },
  { name: "Allama Iqbal Town", lat: 31.5133, lng: 74.2817 },
  { name: "Askari 10", lat: 31.5356, lng: 74.4166 },
  { name: "Askari 11", lat: 31.4663, lng: 74.4312 },
  { name: "Askari 5", lat: 31.5249, lng: 74.3945 },
  { name: "Azam Gardens", lat: 31.4908, lng: 74.3295 },
  { name: "Bahria Town", lat: 31.3745, lng: 74.1841 },
  { name: "Bankers Town", lat: 31.4179, lng: 74.2441 },
  { name: "Bedian Road", lat: 31.4646, lng: 74.4351 },
  { name: "Canal Bank", lat: 31.4964, lng: 74.2468 },
  { name: "Cantt", lat: 31.5161, lng: 74.3851 },
  { name: "Cavalry Ground", lat: 31.5019, lng: 74.3677 },
  { name: "Chuburji", lat: 31.5481, lng: 74.3018 },
  { name: "DHA Phase 1", lat: 31.4856, lng: 74.3909 },
  { name: "DHA Phase 2", lat: 31.4754, lng: 74.3815 },
  { name: "DHA Phase 3", lat: 31.4722, lng: 74.3697 },
  { name: "DHA Phase 4", lat: 31.4641, lng: 74.3822 },
  { name: "DHA Phase 5", lat: 31.457, lng: 74.4027 },
  { name: "DHA Phase 6", lat: 31.4706, lng: 74.4258 },
  { name: "DHA Phase 7", lat: 31.4376, lng: 74.4244 },
  { name: "DHA Phase 8", lat: 31.489, lng: 74.4403 },
  { name: "DHA Phase 9 Prism", lat: 31.4516, lng: 74.4692 },
  { name: "DHA Rahbar", lat: 31.3809, lng: 74.2611 },
  { name: "EME Society", lat: 31.4384, lng: 74.216 },
  { name: "Faisal Town", lat: 31.4767, lng: 74.3046 },
  { name: "Ferozepur Road", lat: 31.4645, lng: 74.3257 },
  { name: "Garden Town", lat: 31.4995, lng: 74.3242 },
  { name: "Gari Shahu", lat: 31.5688, lng: 74.3408 },
  { name: "Green City", lat: 31.4429, lng: 74.4504 },
  { name: "Gulberg 1", lat: 31.524, lng: 74.3587 },
  { name: "Gulberg 2", lat: 31.5206, lng: 74.3491 },
  { name: "Gulberg 3", lat: 31.5108, lng: 74.3416 },
  { name: "Gulshan-e-Ravi", lat: 31.5435, lng: 74.2734 },
  { name: "Harbanspura", lat: 31.5849, lng: 74.4237 },
  { name: "Ichhra", lat: 31.5322, lng: 74.3194 },
  { name: "Jail Road", lat: 31.5371, lng: 74.3302 },
  { name: "Johar Town", lat: 31.467, lng: 74.2728 },
  { name: "Kahna", lat: 31.3655, lng: 74.365 },
  { name: "Karim Block", lat: 31.5105, lng: 74.2867 },
  { name: "Lake City", lat: 31.3578, lng: 74.2556 },
  { name: "LDA Avenue", lat: 31.3994, lng: 74.2415 },
  { name: "Liberty Market", lat: 31.5105, lng: 74.3441 },
  { name: "Mall Road", lat: 31.5576, lng: 74.337 },
  { name: "Model Town", lat: 31.4846, lng: 74.3225 },
  { name: "Mughalpura", lat: 31.5762, lng: 74.3779 },
  { name: "Muslim Town", lat: 31.5087, lng: 74.3182 },
  { name: "NFC Society", lat: 31.423, lng: 74.2452 },
  { name: "Paragon City", lat: 31.4494, lng: 74.4508 },
  { name: "PCSIR Housing Scheme", lat: 31.4527, lng: 74.2941 },
  { name: "PIA Housing Scheme", lat: 31.4513, lng: 74.2792 },
  { name: "Punjab Society", lat: 31.4529, lng: 74.3569 },
  { name: "Raiwind Road", lat: 31.3948, lng: 74.2248 },
  { name: "Sabzazar", lat: 31.5124, lng: 74.246 },
  { name: "Samanabad", lat: 31.5356, lng: 74.3003 },
  { name: "Shadman", lat: 31.5408, lng: 74.3331 },
  { name: "Shalimar Link Road", lat: 31.5746, lng: 74.3696 },
  { name: "State Life Housing Society", lat: 31.4563, lng: 74.4281 },
  { name: "Township", lat: 31.4504, lng: 74.3082 },
  { name: "Valencia", lat: 31.4067, lng: 74.2573 },
  { name: "Wapda Town", lat: 31.4322, lng: 74.2695 },
  { name: "Walton Road", lat: 31.4834, lng: 74.3579 },
];

function distanceFromStore({ lat, lng }: DeliveryArea) {
  const radians = Math.PI / 180;
  const a = Math.sin((lat - STORE_LAT) * radians / 2) ** 2
    + Math.cos(STORE_LAT * radians) * Math.cos(lat * radians)
    * Math.sin((lng - STORE_LNG) * radians / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export default function CheckoutPage() {
  const { items, total, clearCart, updatePrices } = useCart();
  const { user, token } = useAuth();
  const { deliveryCharge, minOrderAmount, currencySymbol, cashOnDelivery, restaurantOpen, closedMessage } = useRestaurant();
  const orderingStatus = useOrderingStatus();
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [rewardSettings, setRewardSettings] = useState<RewardSettings | null>(
    null,
  );
  const [userPoints, setUserPoints] = useState(0);

  // Form state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState(user?.phone || "");
  const [shareAdMatch, setShareAdMatch] = useState(false);
  const [selectedDeliveryAreaName, setSelectedDeliveryAreaName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [paymentMethod, setPaymentMethod] = useState(cashOnDelivery ? "cash" : "online_transfer");
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [locating, setLocating] = useState(false);
  const [deliveryPin, setDeliveryPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mapFocus, setMapFocus] = useState({ lat: STORE_LAT, lng: STORE_LNG });
  const [deliveryStatus, setDeliveryStatus] = useState<"idle" | "checking" | "ok" | "outside" | "error">("idle");
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(DELIVERY_RADIUS_KM);
  // Prevent the empty-cart redirect from firing after a successful order submission
  const submittedRef = useRef(false);
  const submittingRef = useRef(false);
  const checkoutTrackedRef = useRef(false);
  const contactTrackedRef = useRef(false);
  const adInitiatedRef = useRef(false);

  useEffect(() => {
    if (!items.length || checkoutTrackedRef.current) return
    checkoutTrackedRef.current = true
    track("checkout_started", {
      cartId: getCartId(),
      properties: { itemCount: items.length, displayedTotal: total, firstPartyOnly: true },
    })
  }, [items.length, total])

  useEffect(() => {
    if (!cashOnDelivery && paymentMethod === "cash") {
      setPaymentMethod("online_transfer");
    }
  }, [cashOnDelivery, paymentMethod]);

  useEffect(() => {
    if (items.length === 0 && !submittedRef.current) {
      navigate("/cart");
    }
  }, [items, navigate]);

  useEffect(() => {
    if (orderType === "delivery" && deliveryPin) {
      setDeliveryStatus("checking");
      const controller = new AbortController();
      const timer = setTimeout(() => {
        fetch("/api/check-delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerLat: deliveryPin.lat, customerLng: deliveryPin.lng }),
          signal: controller.signal,
        })
          .then((r) => {
            if (!r.ok) throw new Error("Delivery distance could not be checked");
            return r.json();
          })
          .then((data) => {
             if (controller.signal.aborted) return;
             if (typeof data.distanceKm === "number") {
                setDeliveryDistanceKm(data.distanceKm);
             }
             if (typeof data.radiusKm === "number") {
                setDeliveryRadiusKm(data.radiusKm);
             }
             setDeliveryStatus(!data.configured ? "error" : data.withinRadius ? "ok" : "outside");
             track("delivery_area_checked", { properties: { step: "DELIVERY_LOCATION", available: Boolean(data.configured && data.withinRadius) } });
          })
          .catch((error) => {
            if (controller.signal.aborted || error?.name === "AbortError") return;
            setDeliveryStatus("error");
          });
      }, 300);
      return () => {
        clearTimeout(timer);
        controller.abort();
      };
    } else {
      setDeliveryStatus("idle");
      setDeliveryDistanceKm(null);
    }
  }, [deliveryPin, orderType]);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.ok ? r.json() : [])
      .then((data) => {
        if (Array.isArray(data)) setBranches(data.filter((b: Branch) => b.isOpen));
      })
      .catch(() => {});

    if (user && token) {
      fetch("/api/rewards/points", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setUserPoints(d.points || 0))
        .catch(() => {});

      // Public endpoint — no admin auth needed
      fetch("/api/rewards/settings")
        .then((r) => r.json())
        .then((d) => setRewardSettings(d))
        .catch(() => {});
    }
  }, [user, token]);

  const effectiveDelivery = orderType === "delivery" ? deliveryCharge : 0;
  const belowMinimum = minOrderAmount > 0 && total < minOrderAmount;

  const pointValueCents = Math.round((rewardSettings?.conversionRate || 0) * 100);
  const maxDiscountCents = Math.round(Math.round(total * 100) * (rewardSettings?.maxDiscountPercent ?? 20) / 100);
  const pointsDiscount =
    rewardSettings && rewardSettings.rewardsEnabled !== false && pointValueCents > 0 &&
    userPoints >= rewardSettings.minRedeem &&
    pointsToRedeem >= rewardSettings.minRedeem
      ? Math.min(pointsToRedeem, userPoints, Math.floor(maxDiscountCents / pointValueCents)) * pointValueCents / 100
      : 0;

  const finalTotal = Math.max(0, total + effectiveDelivery - pointsDiscount);
  const deliveryAreas = LAHORE_DELIVERY_AREAS.filter((area) => distanceFromStore(area) <= deliveryRadiusKm);
  const pickupBranch = branches.find((branch) => branch.id === branchId)
    ?? branches.find((branch) => branch.isDefault)
    ?? (branches.length === 1 ? branches[0] : undefined);
  const pickLocation = (pin: { lat: number; lng: number }) => {
    setDeliveryPin(pin);
    setDeliveryStatus("checking");
    setDeliveryDistanceKm(null);
    setSubmitError("");
  };
  const showError = (message: string, id?: string) => {
    setSubmitError(message);
    if (id) {
      const field = document.getElementById(id);
      field?.scrollIntoView({ block: "center" });
      field?.focus({ preventScroll: true });
    }
    toast.error(message);
  };
  const contactPhone = user ? user.phone || "" : guestPhone.trim();
  const contactEmail = user ? user.email || "" : guestEmail.trim();
  const consentState = shareAdMatch ? "analytics_granted" : "unknown";
  const recordCheckoutContact = (submitting = false) => {
    if (!items.length || (!user && (!guestName.trim() || !contactPhone))) return;
    if (!user && contactEmail && document.querySelector<HTMLInputElement>("#guestEmail")?.validity.typeMismatch) return;
    const cartId = getCartId();
    if (!contactTrackedRef.current) {
      contactTrackedRef.current = true;
      track("checkout_contact_ready", { cartId, properties: { step: "CONTACT_READY" } });
    }
    if (adInitiatedRef.current || (!shareAdMatch && !submitting)) return;
    adInitiatedRef.current = true;
    const foodValue = Math.max(0, Math.round((total - pointsDiscount) * 100) / 100);
    void checkoutMetaMatch(shareAdMatch, contactPhone, contactEmail).then((metaMatch) => {
      track("checkout_ad_initiated", {
        cartId, metaMatch, consentState,
        properties: { itemCount: items.length, foodValue, currency: "PKR" },
      });
    }).catch(() => {});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0 || submittingRef.current || submittedRef.current) return;
    setSubmitError("");
    track("checkout_step_viewed", { properties: { step: "PLACE_ORDER_CLICK", orderType } });
    const currentOrderingStatus = getOrderingStatus(new Date(), restaurantOpen !== "false", closedMessage);
    if (!currentOrderingStatus.open) return showError(currentOrderingStatus.message);
    if (belowMinimum) {
      track("minimum_order_blocked", { properties: { step: "PLACE_ORDER" } });
      return showError(`Add ${formatMoney(minOrderAmount - total, currencySymbol)} to reach the minimum order.`);
    }
    if (!user && !guestName.trim()) return showError("Enter your name.", "guestName");
    if (!user && !guestPhone.trim()) return showError("Enter your phone number.", "guestPhone");
    if (!user && e.currentTarget instanceof HTMLFormElement
        && e.currentTarget.querySelector<HTMLInputElement>("#guestEmail")?.validity.typeMismatch) {
      return showError("Enter a valid email or leave it blank.", "guestEmail");
    }
    recordCheckoutContact(true);
    if (orderType === "delivery") {
      if (!deliveryPin) return showError("Choose your delivery location.", "delivery-location");
      if (deliveryStatus === "checking") return showError("Wait a moment while we check your location.", "delivery-location");
      if (deliveryStatus === "outside") return showError(`This location is outside our ${deliveryRadiusKm} km radius. Adjust the pin or choose Pickup.`, "delivery-location");
      if (deliveryStatus !== "ok") return showError("We couldn't verify this pin. Retry the check or choose Pickup.", "delivery-location");
      if (!deliveryAddress.trim()) return showError("Add your house, street and block.", "deliveryAddress");
    }
    if (orderType === "pickup" && !pickupBranch) return showError(
      branches.length ? "Choose a pickup branch." : "Pickup is unavailable. Try delivery or reload to check for open branches.",
      "pickupBranch",
    );

    submittingRef.current = true;
    setIsSubmitting(true);
    let responseStatus: number | undefined;
    try {
      track("checkout_step_viewed", { cartId: getCartId(), properties: { step: "PLACE_ORDER", orderType } });
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          customizations: i.customizations || [],
        })),
        orderType,
        paymentMethod: orderType === "pickup" ? "pay_on_pickup" : paymentMethod,
        address: orderType === "delivery"
          ? [deliveryAddress.trim(), selectedDeliveryAreaName, "Lahore"].filter(Boolean).join(", ")
          : "",
        branchId: orderType === "pickup" ? pickupBranch?.id : undefined,
        notes: notes.trim(),
        pointsToRedeem,
        expectedSubtotalCents: Math.round(total * 100),
        customerLat: orderType === "delivery" ? deliveryPin?.lat : undefined,
        customerLng: orderType === "delivery" ? deliveryPin?.lng : undefined,
        cartId: getCartId(),
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
      };

      if (!user) {
        payload.guestName = guestName.trim();
        payload.guestEmail = guestEmail.trim();
        payload.guestPhone = guestPhone.trim();
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch("/api/orders", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      responseStatus = res.status;

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 409 && err.detail?.code === "cart_prices_changed" && Array.isArray(err.detail.prices)) {
          updatePrices(items, err.detail.prices);
          throw new Error("Menu prices changed. Review your updated total and place your order again.");
        }
        throw new Error(typeof err.detail === "string"
          ? err.detail
          : res.status >= 500
            ? "The ordering service is unavailable right now. Please contact the store before retrying."
            : "Check your order details and try again.");
      }

      const order = await res.json();
      submittedRef.current = true;
      const foodValue = Math.max(0, Math.round((order.subtotal - order.discountAmount) * 100) / 100);
      void checkoutMetaMatch(shareAdMatch, contactPhone, contactEmail).then((metaMatch) => {
        track("checkout_step_completed", {
          cartId: order.cartId,
          orderId: order.id,
          metaMatch,
          consentState,
          properties: { step: "ORDER_CONFIRMED", foodValue, currency: order.currency },
        });
      }).catch(() => {});
      clearCart();
      const trackPhone = !user ? guestPhone.trim() : (user.phone || "");
      navigate(`/order-confirmation/${order.id}`, { state: { order, trackPhone } });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to place order";
      track("payment_failed", { properties: { step: "PLACE_ORDER", httpStatus: responseStatus } });
      showError(message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  if (items.length === 0 && !submittedRef.current) return null;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-24 md:pb-0">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/cart">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <h1 className="font-serif text-2xl font-bold text-foreground">
              Checkout
            </h1>
          </div>

          <form noValidate onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
            {/* Left — Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold text-foreground">
                        Ordering Hours
                      </h2>
                    </div>
                    <Badge
                      variant={orderingStatus.open ? "secondary" : "outline"}
                      className={
                        orderingStatus.open
                          ? "bg-green-100 text-green-700"
                          : "border-amber-300 text-amber-700"
                      }
                    >
                      {orderingStatus.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ORDER_HOURS_TEXT}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {orderingStatus.message}
                  </p>
                  {orderingStatus.note && <p className="text-xs text-muted-foreground">{orderingStatus.note}</p>}
                </CardContent>
              </Card>

              {/* Guest / User Info */}
              <div onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) recordCheckoutContact();
              }}>
              {!user ? (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-foreground">
                        Your Details
                      </h2>
                      <Link
                        to="/login"
                        className="text-sm text-primary hover:underline"
                      >
                        Login for faster checkout
                      </Link>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="guestName">Full Name *</Label>
                        <Input
                          id="guestName"
                          autoComplete="name"
                          placeholder="Your name"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="guestPhone">Phone Number *</Label>
                        <Input
                          id="guestPhone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="Your phone number"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guestEmail">Email (optional)</Label>
                        <Input
                          id="guestEmail"
                          type="email"
                          autoComplete="email"
                          placeholder="Your email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                        />
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="pt-6">
                    <h2 className="mb-2 font-semibold text-foreground">
                      Ordering as
                    </h2>
                    <p className="text-muted-foreground">
                      {user.firstName} {user.lastName} · {user.email}
                    </p>
                    {user.phone && (
                      <p className="text-sm text-muted-foreground">
                        {user.phone}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
              <label className="mt-2 flex items-start gap-2 px-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={shareAdMatch}
                  onChange={(event) => setShareAdMatch(event.target.checked)}
                  className="mt-0.5 accent-primary"
                />
                Allow sharing my hashed phone and email with Meta to measure ads (optional).
              </label>
              </div>

              {/* Order Type */}
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <h2 className="font-semibold text-foreground">Order Type</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {(["delivery", "pickup"] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (type !== orderType && type === "delivery" && deliveryPin) setDeliveryStatus("checking");
                          setOrderType(type);
                          setSubmitError("");
                        }}
                        className={`rounded-lg border p-3 text-sm font-medium capitalize transition-colors ${
                          orderType === type
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {orderType === "delivery" && (
                    <div className="space-y-3" id="delivery-location" tabIndex={-1}>
                      <p className="text-sm text-muted-foreground">
                        Delivery covers about {deliveryRadiusKm} km from DHA Phase 4. Further away? Choose Pickup.
                      </p>
                      <Button
                        type="button"
                        className="w-full"
                        disabled={locating}
                        onClick={() => {
                          if (!navigator.geolocation) {
                            showError("Location is unavailable. Choose an area or drop a pin.");
                            return;
                          }
                          setLocating(true);
                          navigator.geolocation.getCurrentPosition(
                            ({ coords }) => {
                              setLocating(false);
                              const pin = { lat: coords.latitude, lng: coords.longitude };
                              setSelectedDeliveryAreaName("");
                              setMapFocus(pin);
                              pickLocation(pin);
                            },
                            () => {
                              setLocating(false);
                              showError("Couldn't get your location. Choose an area or drop a pin.");
                            },
                            { enableHighAccuracy: true, timeout: 10000 },
                          );
                        }}
                      >
                        {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                        {locating ? "Finding your location..." : "Use my location"}
                      </Button>

                      <div className="space-y-1.5">
                        <Label htmlFor="deliveryArea">Nearby area (optional)</Label>
                        <Select
                          value={selectedDeliveryAreaName}
                          onValueChange={(value) => {
                            const area = deliveryAreas.find((candidate) => candidate.name === value);
                            if (!area) return;
                            setSelectedDeliveryAreaName(value);
                            setMapFocus(area);
                            pickLocation(area);
                          }}
                        >
                          <SelectTrigger id="deliveryArea">
                            <SelectValue placeholder="Choose an area to center the pin" />
                          </SelectTrigger>
                          <SelectContent className="max-h-72">
                            {deliveryAreas.map((area) => (
                              <SelectItem key={area.name} value={area.name}>{area.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-sm font-medium">Delivery pin</p>
                        <p className="text-xs text-muted-foreground">Tap the map or drag the pin to your address.</p>
                        <div className="relative z-0 overflow-hidden rounded-lg border bg-muted">
                          <DeliveryPinMap
                            store={{ lat: STORE_LAT, lng: STORE_LNG }}
                            focus={mapFocus}
                            pin={deliveryPin}
                            radiusKm={deliveryRadiusKm}
                            onPick={pickLocation}
                          />
                        </div>
                        <div aria-live="polite" className="text-sm">
                          {deliveryStatus === "checking" && <p className="text-muted-foreground">Checking delivery area...</p>}
                          {deliveryStatus === "ok" && <p className="text-green-700">This pin is within our delivery zone{deliveryDistanceKm !== null ? ` (${deliveryDistanceKm} km from the store)` : ""}.</p>}
                          {deliveryStatus === "outside" && <p className="text-destructive">Outside the {deliveryRadiusKm} km delivery zone{deliveryDistanceKm !== null ? ` (${deliveryDistanceKm} km from the store)` : ""}. Adjust your pin or choose Pickup.</p>}
                          {deliveryStatus === "error" && deliveryPin && (
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-destructive">We couldn't verify this location.</p>
                              <Button type="button" variant="outline" size="sm" onClick={() => pickLocation({ ...deliveryPin })}>Retry check</Button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="deliveryAddress">House, street and block *</Label>
                        <Input
                          id="deliveryAddress"
                          placeholder="e.g. House 75, Street 4, DD Block"
                          autoComplete="street-address"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {orderType === "pickup" && (
                    <div className="space-y-1.5" id="pickupBranch" tabIndex={-1}>
                      {branches.length > 1 ? (
                        <>
                          <Label htmlFor="pickup-branch-select">Pickup branch</Label>
                          <Select value={pickupBranch?.id.toString() || ""} onValueChange={(value) => setBranchId(Number(value))}>
                            <SelectTrigger id="pickup-branch-select">
                              <SelectValue placeholder="Choose a pickup branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {branches.map((branch) => (
                                <SelectItem key={branch.id} value={branch.id.toString()}>
                                  {branch.name} - {branch.city}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : pickupBranch ? (
                        <p className="text-sm text-muted-foreground">Pickup from {pickupBranch.name}.</p>
                      ) : null}
                    </div>
                  )}
                </CardContent>
              </Card>

              {orderType === "delivery" && (
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <h2 className="font-semibold text-foreground">
                      Payment Method
                    </h2>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {PAYMENT_METHODS.filter(
                        (pm) =>
                          pm.value !== "pay_on_pickup" &&
                          (cashOnDelivery || pm.value !== "cash"),
                      ).map((pm) => (
                        <button
                          key={pm.value}
                          type="button"
                          onClick={() => setPaymentMethod(pm.value)}
                          className={`rounded-lg border p-3 text-left text-sm font-medium transition-colors ${
                            paymentMethod === pm.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border bg-card text-muted-foreground hover:border-primary/50"
                          }`}
                        >
                          {pm.label}
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Points Redemption */}
              {user &&
                rewardSettings?.rewardsEnabled !== false &&
                rewardSettings?.mode === "points" &&
                userPoints >= rewardSettings.minRedeem && (
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-secondary" />
                        <h2 className="font-semibold text-foreground">
                          Redeem Points
                        </h2>
                        <Badge variant="secondary">
                          {userPoints} pts available
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {rewardSettings.conversionRate} currency per point. Min:{" "}
                        {rewardSettings.minRedeem} pts.
                      </p>
                      <div className="flex items-center gap-3">
                        <Input
                          type="number"
                          min={0}
                          max={userPoints}
                          step={rewardSettings.minRedeem}
                          value={pointsToRedeem}
                          onChange={(e) =>
                            setPointsToRedeem(parseInt(e.target.value) || 0)
                          }
                          className="max-w-[140px]"
                        />
                        <span className="text-sm text-muted-foreground">
                          = {formatMoney(pointsDiscount, currencySymbol)} discount
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                )}

              {/* Notes */}
              <Card className="border-dashed border-2 border-muted hover:border-primary/40 transition-colors">
                <CardContent className="pt-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <PenLine className="h-4 w-4 text-primary" />
                    <h2 className="font-semibold text-foreground">Special Instructions</h2>
                    <span className="text-xs text-muted-foreground ml-auto">Optional</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allergies, spice level, extra sauce, ring the bell — let us know anything!
                  </p>
                  <div className="relative">
                    <Textarea
                      id="notes"
                      placeholder="e.g. No onions, extra spicy, please knock on arrival..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                      rows={3}
                      className="resize-none pr-2"
                    />
                    <span className={`absolute bottom-2 right-3 text-xs ${
                      notes.length > 250 ? "text-amber-500" : "text-muted-foreground/60"
                    }`}>
                      {notes.length}/300
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right — Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-serif text-lg font-semibold text-foreground flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </h2>

                <div className="space-y-2 text-sm">
                  {items.map((item) => (
                    <div
                      key={item.lineId}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span className="flex-1 pr-2">
                        {item.name} × {item.quantity}
                        {item.customizations?.length ? (
                          <span className="mt-0.5 block text-xs">
                            {formatCustomizationText(item.customizations)}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0">
                        {formatMoney((item.price * item.quantity), currencySymbol)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatMoney(total, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span>
                    <span>
                      {orderType === "delivery"
                        ? effectiveDelivery > 0
                          ? `${formatMoney(effectiveDelivery, currencySymbol)}`
                          : "Free delivery"
                        : "N/A"}
                    </span>
                  </div>
                  {pointsDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Points discount</span>
                      <span>-{formatMoney(pointsDiscount, currencySymbol)}</span>
                    </div>
                  )}
                </div>

                {belowMinimum && (
                  <p className="text-xs font-medium text-amber-600">
                    Minimum order: {formatMoney(minOrderAmount, currencySymbol)}
                  </p>
                )}

                <Separator />

                <div className="flex justify-between font-semibold text-foreground text-base">
                  <span>Total</span>
                  <span>{formatMoney(finalTotal, currencySymbol)}</span>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  disabled={isSubmitting || !orderingStatus.open}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Placing Order...
                    </>
                  ) : (
                    "Place Order"
                  )}
                </Button>
                {submitError && <p role="alert" className="text-sm text-destructive">{submitError}</p>}

                <p className="text-center text-xs text-muted-foreground">
                  By placing your order you agree to our{" "}
                  <Link to="/terms" className="underline">
                    terms
                  </Link>
                  .
                </p>
              </div>
            </div>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
