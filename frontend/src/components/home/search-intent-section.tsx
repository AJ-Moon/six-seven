import { Link } from "react-router-dom";
import { Beef, Coffee, CupSoda, MapPin, UtensilsCrossed } from "lucide-react";

const intentLinks = [
  {
    title: "Beef Burgers",
    copy: "Juicy burgers, combo meals and fast food favorites near DHA Phase 4.",
    href: "/menu?search=beef%20burger",
    icon: Beef,
  },
  {
    title: "Loaded Fries & Wraps",
    copy: "Cheesy fries, crispy sides and wraps made for quick Lahore cravings.",
    href: "/menu?search=loaded%20fries",
    icon: UtensilsCrossed,
  },
  {
    title: "Coffee",
    copy: "Hot coffee, iced coffee and espresso drinks for pickup or delivery.",
    href: "/menu?search=coffee",
    icon: Coffee,
  },
  {
    title: "Iced Teas & Frappes",
    copy: "Iced teas, smoothies, frappes and signature drinks from Six Seven.",
    href: "/menu?search=frappe",
    icon: CupSoda,
  },
  {
    title: "DHA Phase 4 Branch",
    copy: "Find Six Seven at 75 CCA, DD Block, DHA Phase 4, Lahore.",
    href: "/branches",
    icon: MapPin,
  },
];

export function SearchIntentSection() {
  return (
    <section className="border-b border-border bg-white py-10">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="max-w-3xl">
          <h2 className="font-serif text-2xl font-bold text-foreground sm:text-3xl">
            Burgers, Coffee and Late-Night Favorites in DHA Lahore
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Six Seven brings together the Lahore searches that matter most:
            beef burgers, loaded fries, wraps, iced coffee, iced teas, smoothies
            and frappes from DHA Phase 4.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {intentLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <Icon className="h-5 w-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold text-card-foreground">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {item.copy}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
