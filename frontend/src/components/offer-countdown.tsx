import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useRestaurant } from "@/contexts/RestaurantContext";

const units = ["Days", "Hours", "Minutes", "Seconds"];
const formatDeadline = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Karachi", weekday: "short", month: "short", day: "numeric",
  hour: "numeric", minute: "2-digit", hour12: true,
});

export function OfferCountdown({ showMenuLink = false }: { showMenuLink?: boolean }) {
  const { globalDiscountPercent, globalDiscountEndsAt } = useRestaurant();
  const [now, setNow] = useState(Date.now);
  const end = Date.parse(globalDiscountEndsAt);
  const active = globalDiscountPercent > 0 && end > now;

  useEffect(() => {
    if (!active) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [active, end]);

  if (!active) return null;
  const seconds = Math.ceil((end - now) / 1000);
  const values = [Math.floor(seconds / 86400), Math.floor(seconds / 3600) % 24,
    Math.floor(seconds / 60) % 60, seconds % 60];
  return (
    <section aria-label="Limited-time menu offer" className="border-b border-white/15 bg-[#04272e] text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-4 py-5 text-center sm:flex-row sm:flex-wrap sm:gap-x-8 sm:gap-y-3 sm:py-6 lg:justify-between">
        <div className="space-y-1 sm:text-left">
          <h2 className="text-2xl font-extrabold leading-tight sm:text-3xl">
            <span className="text-[#ffca32]">{globalDiscountPercent}% off</span> the online menu
          </h2>
          <p className="text-sm text-white/80">Ends {formatDeadline.format(end)} PKT. Excludes fixed-price deals.</p>
        </div>
        <div role="timer" aria-label="Time left on the offer" className="grid w-full max-w-[300px] grid-cols-4 gap-2 sm:w-[300px]">
          {units.map((unit, index) => (
            <div key={unit} className="rounded-md border border-white/20 bg-white/10 px-1 py-1.5">
              <div className="text-[28px] font-extrabold leading-none tabular-nums text-[#ffca32] sm:text-4xl">{String(values[index]).padStart(2, "0")}</div>
              <div className="mt-1 text-[11px] font-medium text-white/85">{unit}</div>
            </div>
          ))}
        </div>
        {showMenuLink && (
          <Link to="/menu" className="inline-flex min-h-10 items-center gap-2 rounded-md bg-[#ffca32] px-4 text-sm font-bold text-[#04272e] hover:bg-[#ffda64] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            Order Now <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </div>
    </section>
  );
}
