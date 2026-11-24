import { useEffect, useState } from "react";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { getOrderingStatus } from "@/lib/order-hours";

export function useOrderingStatus() {
  const { restaurantOpen, closedMessage } = useRestaurant();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const timer = window.setInterval(refresh, 15_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return getOrderingStatus(now, restaurantOpen !== "false", closedMessage);
}
