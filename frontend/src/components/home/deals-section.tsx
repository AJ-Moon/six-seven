import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchJsonWithRetry } from "@/lib/api";
import { formatMoney } from "@/lib/money";
import { useRestaurant } from "@/contexts/RestaurantContext";
import type { PublicMenuItem } from "@/types/menu";

export function DealsSection() {
  const { dealsSectionTitle, dealsSectionSubtitle, currencySymbol } = useRestaurant();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["menu-deals"],
    queryFn: () =>
      fetchJsonWithRetry<PublicMenuItem[]>("/api/menu?category=Deals", undefined, {
        timeoutMs: 15000,
        retries: 1,
      }),
    retry: 0,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <section className="border-y bg-muted/40 py-12 lg:py-16" aria-label="Featured deals">
        <div className="mx-auto grid max-w-7xl gap-5 px-4 sm:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="aspect-[4/5] animate-pulse rounded-md bg-card" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="border-y bg-muted/40 py-12 text-center">
        <p className="text-sm text-muted-foreground">Could not load deals right now.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </section>
    );
  }

  const deals = data || [];
  if (!deals.length) return null;

  return (
    <section id="featured-deals" className="border-y bg-muted/40 py-12 lg:py-16">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
              {dealsSectionTitle}
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              {dealsSectionSubtitle}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/menu?category=Deals">
              All deals <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {deals.map((deal) => (
            <article key={deal.id} className="overflow-hidden rounded-md border bg-card">
              <Link
                to={`/menu?category=Deals&search=${encodeURIComponent(deal.name)}`}
                aria-label={`Choose options for ${deal.name}`}
                className="block aspect-[4/5] bg-muted"
              >
                <img
                  src={deal.image}
                  alt={`${deal.name} deal poster`}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              </Link>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg font-semibold">{deal.name}</h3>
                  <span className="shrink-0 font-semibold text-primary">
                    {formatMoney(deal.price, currencySymbol)}
                  </span>
                </div>
                <p className="line-clamp-3 text-sm text-muted-foreground">{deal.description}</p>
                <Button size="sm" className="w-full" asChild>
                  <Link to={`/menu?category=Deals&search=${encodeURIComponent(deal.name)}`}>
                    Choose options
                  </Link>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
