import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { SearchBox } from "@mapbox/search-js-react";
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
import { ArrowLeft, ShoppingCart, Star, Loader2, PenLine, Clock, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import { getCartId, getSessionId, getVisitorId, track } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { getOrderingStatus, ORDER_HOURS_TEXT } from "@/lib/order-hours";
import { PAYMENT_METHODS } from "@/lib/payment";

interface Branch {
  id: number;
  name: string;
  city: string;
  isOpen: boolean;
}

interface RewardSettings {
  mode: string;
  minRedeem: number;
  conversionRate: number;
}

const STORE_LAT = 31.4641372;
const STORE_LNG = 74.3822137;
const STORE_ADDRESS = "Six Seven, 75 CCA, DD Block, DHA Phase 4, Lahore";
const DELIVERY_RADIUS_KM = 5;

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart();
  const { user, token } = useAuth();
  const { deliveryCharge, minOrderAmount, currencySymbol, cashOnDelivery } = useRestaurant();
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
  const [address, setAddress] = useState("");
  const [orderType, setOrderType] = useState<"delivery" | "pickup">(
    "delivery",
  );
  const [paymentMethod, setPaymentMethod] = useState(cashOnDelivery ? "cash" : "card");
  const [branchId, setBranchId] = useState<number | undefined>(undefined);
  const [notes, setNotes] = useState("");
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderingStatus, setOrderingStatus] = useState(() =>
    getOrderingStatus(),
  );
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<"idle" | "checking" | "ok" | "outside">("idle");
  const [deliveryDistanceKm, setDeliveryDistanceKm] = useState<number | null>(null);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(DELIVERY_RADIUS_KM);
  const [isLocating, setIsLocating] = useState(false);
  // Prevent the empty-cart redirect from firing after a successful order submission
  const submittedRef = useRef(false);
  const checkoutTrackedRef = useRef(false);

  useEffect(() => {
    if (checkoutTrackedRef.current) return
    checkoutTrackedRef.current = true
    track("checkout_started", {
      cartId: getCartId(),
      properties: { itemCount: items.length, displayedTotal: total },
    })
  }, [items.length, total])

  useEffect(() => {
    const updateOrderingStatus = () => setOrderingStatus(getOrderingStatus());
    const interval = window.setInterval(updateOrderingStatus, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!cashOnDelivery && paymentMethod === "cash") {
      setPaymentMethod("card");
    }
  }, [cashOnDelivery, paymentMethod]);

  useEffect(() => {
    if (items.length === 0 && !submittedRef.current) {
      navigate("/cart");
    }
  }, [items, navigate]);

  useEffect(() => {
    if (orderType === "delivery" && customerLat !== null && customerLng !== null) {
      setDeliveryStatus("checking");
      const timer = setTimeout(() => {
        fetch("/api/check-delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerLat, customerLng }),
        })
          .then((r) => r.json())
          .then((data) => {
             if (typeof data.distanceKm === "number") {
                setDeliveryDistanceKm(data.distanceKm);
             }
             if (typeof data.radiusKm === "number") {
                setDeliveryRadiusKm(data.radiusKm);
             }
             if (data.configured === false || data.withinRadius) {
                setDeliveryStatus("ok");
             } else {
                setDeliveryStatus("outside");
                toast.error(`Outside delivery zone — delivery is only available within ${data.radiusKm || DELIVERY_RADIUS_KM} km`);
             }
          })
          .catch(() => setDeliveryStatus("idle"));
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setDeliveryStatus("idle");
      setDeliveryDistanceKm(null);
    }
  }, [customerLat, customerLng, orderType]);

  useEffect(() => {
    fetch("/api/branches/")
      .then((r) => r.json())
      .then((data) => {
        setBranches(data.filter((b: Branch) => b.isOpen));
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

  const pointsDiscount =
    rewardSettings &&
    userPoints >= rewardSettings.minRedeem &&
    pointsToRedeem >= rewardSettings.minRedeem
      ? Math.min(pointsToRedeem * rewardSettings.conversionRate, total * 0.5)
      : 0;

  const finalTotal = Math.max(0, total + effectiveDelivery - pointsDiscount);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN || "";
  const deliveryMapSrc =
    customerLat !== null && customerLng !== null
      ? `https://www.google.com/maps?output=embed&saddr=${STORE_LAT},${STORE_LNG}&daddr=${customerLat},${customerLng}`
      : `https://www.google.com/maps?q=${STORE_LAT},${STORE_LNG}&z=15&output=embed`;
  const deliveryDirectionsUrl =
    customerLat !== null && customerLng !== null
      ? `https://www.google.com/maps/dir/?api=1&origin=${STORE_LAT},${STORE_LNG}&destination=${customerLat},${customerLng}`
      : `https://www.google.com/maps/search/?api=1&query=${STORE_LAT},${STORE_LNG}`;
  const deliveryAddressNeedsLocation =
    orderType === "delivery" && address.trim() && (customerLat === null || customerLng === null);
  const deliveryHasLocation = customerLat !== null && customerLng !== null;
  const deliveryBlocked =
    orderType === "delivery" &&
    (deliveryStatus === "outside" ||
      deliveryStatus === "checking" ||
      deliveryAddressNeedsLocation ||
      (deliveryHasLocation && deliveryStatus !== "ok"));

  const useCurrentLocation = () => {
    if (!("geolocation" in navigator)) {
      toast.error("Location services are not available in this browser.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerLat(pos.coords.latitude);
        setCustomerLng(pos.coords.longitude);
        setAddress((current) => current || "Current location");
        setIsLocating(false);
      },
      () => {
        setIsLocating(false);
        toast.error("Could not access your location. Please allow location access.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!user && !guestName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!user && !guestPhone.trim()) {
      toast.error("Please enter your phone number");
      return;
    }
    if (orderType === "delivery" && !address.trim()) {
      toast.error("Please enter your delivery address");
      return;
    }
    if (deliveryAddressNeedsLocation) {
      toast.error("Please select an address from search or use your current location so we can check delivery range.");
      return;
    }
    if (orderType === "delivery" && deliveryStatus === "outside") {
      toast.error(`This address is outside our ${deliveryRadiusKm} km delivery radius.`);
      return;
    }
    if (orderType === "delivery" && deliveryHasLocation && deliveryStatus !== "ok") {
      toast.error("Please wait for the delivery range check to finish.");
      return;
    }
    if (orderType === "pickup" && !branchId) {
      toast.error("Please select a branch for pickup");
      return;
    }
    if (!orderingStatus.open) {
      toast.error(orderingStatus.message);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        items: items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
        })),
        orderType,
        paymentMethod: orderType === "pickup" ? "pay_on_pickup" : paymentMethod,
        address,
        branchId,
        notes: notes.trim(),
        pointsToRedeem,
        customerLat,
        customerLng,
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

      const res = await fetch("/api/orders/", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to place order");
      }

      const order = await res.json();
      track("checkout_step_completed", {
        cartId: order.cartId,
        orderId: order.id,
        properties: { step: "ORDER_CONFIRMED", total: order.total, currency: order.currency },
        consentState: "essential",
      })
      submittedRef.current = true;
      clearCart();
      const trackPhone = !user ? guestPhone.trim() : (user.phone || "");
      navigate(`/order-confirmation/${order.id}`, { state: { order, trackPhone } });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to place order";
      toast.error(message);
    } finally {
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

          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-3">
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
                </CardContent>
              </Card>

              {/* Guest / User Info */}
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
                          placeholder="John Doe"
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
                          placeholder="+1 234 567 8900"
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
                        placeholder="you@example.com"
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
                          setOrderType(type);
                          setBranchId(undefined);
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
                    <div className="space-y-3">
                      <Label htmlFor="address">Delivery Address *</Label>
                      <div className="relative z-50">
                        {mapboxToken ? (
                          <SearchBox
                            accessToken={mapboxToken}
                            options={{
                              language: "en",
                              proximity: {
                                lng: STORE_LNG,
                                lat: STORE_LAT,
                              },
                            }}
                            value={address}
                            onChange={(value) => {
                              setAddress(value);
                              setCustomerLat(null);
                              setCustomerLng(null);
                              setDeliveryDistanceKm(null);
                              setDeliveryStatus("idle");
                            }}
                            onRetrieve={(res) => {
                              const feature = res.features[0];
                              if (feature) {
                                setCustomerLng(feature.geometry.coordinates[0]);
                                setCustomerLat(feature.geometry.coordinates[1]);
                                setAddress(feature.properties.full_address || feature.properties.name || "");
                              }
                            }}
                          />
                        ) : (
                          <Input
                            id="address"
                            placeholder="Enter your delivery address"
                            value={address}
                            onChange={(e) => {
                              setAddress(e.target.value);
                              setCustomerLat(null);
                              setCustomerLng(null);
                              setDeliveryDistanceKm(null);
                              setDeliveryStatus("idle");
                            }}
                          />
                        )}
                      </div>
                      <div className="overflow-hidden rounded-xl border bg-muted">
                        <iframe
                          title="Delivery route from Six Seven"
                          src={deliveryMapSrc}
                          className="h-64 w-full border-0"
                          loading="lazy"
                          referrerPolicy="no-referrer-when-downgrade"
                          allowFullScreen
                        />
                      </div>
                      <div className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>
                            Delivery starts from {STORE_ADDRESS}. Radius: {deliveryRadiusKm} km.
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={useCurrentLocation}
                          disabled={isLocating}
                          className="shrink-0"
                        >
                          {isLocating ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Locating
                            </>
                          ) : (
                            "Use my location"
                          )}
                        </Button>
                      </div>
                      <a
                        href={deliveryDirectionsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-xs font-medium text-primary hover:underline"
                      >
                        View route from store in Google Maps
                      </a>
                      {deliveryStatus === "checking" && (
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking delivery area...
                        </div>
                      )}
                      {deliveryStatus === "ok" && (
                        <div className="flex items-center text-sm text-green-600 mt-1 font-medium">
                          We deliver to your area
                          {deliveryDistanceKm !== null ? ` (${deliveryDistanceKm} km from store)` : ""}
                        </div>
                      )}
                      {deliveryStatus === "outside" && (
                        <div className="flex items-center text-sm text-red-600 mt-1 font-medium">
                          Outside delivery zone
                          {deliveryDistanceKm !== null ? ` (${deliveryDistanceKm} km from store)` : ""}.
                          Delivery is available within {deliveryRadiusKm} km only.
                        </div>
                      )}
                      {deliveryAddressNeedsLocation && (
                        <p className="text-xs font-medium text-amber-600">
                          Select an address from search or use your current location to continue delivery.
                        </p>
                      )}
                    </div>
                  )}

                  {branches.length > 0 && (
                    <div className="space-y-1.5">
                      <Label>
                        Branch
                        {orderType === "pickup" && (
                          <span className="ml-1 text-destructive">*</span>
                        )}
                      </Label>
                      <Select
                        value={branchId?.toString() || ""}
                        onValueChange={(v) => setBranchId(parseInt(v))}
                      >
                        <SelectTrigger
                          className={(
                            orderType === "pickup" && !branchId
                              ? "border-destructive/50 focus:ring-destructive/30"
                              : ""
                          )}
                        >
                          <SelectValue
                            placeholder={
                              orderType === "pickup"
                                ? "Select pickup branch *"
                                : "Select branch (optional)"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((b) => (
                            <SelectItem key={b.id} value={b.id.toString()}>
                              {b.name} — {b.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {orderType === "pickup" && !branchId && (
                        <p className="text-xs text-destructive">
                          Please select a branch to pick up your order from.
                        </p>
                      )}
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
                      key={item.menuItemId}
                      className="flex justify-between text-muted-foreground"
                    >
                      <span className="flex-1 pr-2">
                        {item.name} × {item.quantity}
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
                  disabled={isSubmitting || !orderingStatus.open || deliveryBlocked}
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
