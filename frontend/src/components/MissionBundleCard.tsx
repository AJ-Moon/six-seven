import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { getCartId, getSessionId, getVisitorId, track } from "@/lib/analytics";

type Bundle = {
  missionId: number;
  bundle: {
    items: Array<{ id: number; name: string; priceCents: number; image?: string }>;
    regularPriceCents: number;
    proposedBundlePriceCents: number;
    discountCents: number;
    contributionMarginCents: number;
  };
};

export function MissionBundleCard() {
  const { items: cartItems } = useCart();
  const navigate = useNavigate();
  const [offer, setOffer] = useState<Bundle | null>(null);
  const visitorId = useMemo(() => getVisitorId(), []);
  const sessionId = useMemo(() => getSessionId(), []);

  useEffect(() => {
    if (!cartItems.length) return;
    const controller = new AbortController();
    fetch("/api/v1/mission-assignments/bundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitorId, sessionId, cartId: getCartId() }),
      signal: controller.signal,
    })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setOffer(result?.assigned ? result : null))
      .catch(() => undefined);
    return () => controller.abort();
  }, [cartItems.length, sessionId, visitorId]);

  if (!offer) return null;
  const addBundle = () => {
    track("promotion_clicked", { cartId: getCartId(), missionId: String(offer.missionId), properties: { type: "intelligent_bundle" } });
    navigate("/menu");
    setOffer(null);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
        <div>
          <p className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" />Frequently ordered together</p>
          <p className="text-sm text-muted-foreground">{offer.bundle.items.map((item) => item.name).join(" + ")}</p>
          <p className="mt-1 text-xs text-muted-foreground">Server-validated contribution margin: {(offer.bundle.contributionMarginCents / 100).toFixed(2)}</p>
        </div>
        <Button onClick={addBundle}>Choose options</Button>
      </CardContent>
    </Card>
  );
}
