import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Flame,
  Search,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart } from "@/contexts/CartContext";
import { useRestaurant } from "@/contexts/RestaurantContext";
import { toast } from "sonner";
import { fetchJsonWithRetry } from "@/lib/api";
import { track } from "@/lib/analytics";
import { formatMoney } from "@/lib/money";
import { srcSetFor } from "@/lib/images";

const toTitle = (value: string) =>
  value
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (m) => m.toUpperCase());

type MenuItem = {
  id: number;
  category: string;
  name: string;
  description: string;
  price: number;
  salePrice?: number | null;
  image: string;
  isSpicy: boolean;
  isPopular: boolean;
  isFeatured?: boolean;
};

export default function MenuPage() {
  const { addItem } = useCart();
  const { restaurantName, menuSubtitle } = useRestaurant();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(
    () => searchParams.get("category") || "all",
  );
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") || "",
  );
  const [priceRange, setPriceRange] = useState([0, 9999]);
  const [sortBy, setSortBy] = useState(
    () => searchParams.get("sort") || "popular",
  );
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 300);
  const lastTrackedResultKey = useRef("");

  useEffect(() => {
    const nextCategory = searchParams.get("category") || "all";
    const nextSearch = searchParams.get("search") || "";
    const nextSort = searchParams.get("sort") || "popular";
    setActiveCategory((current) =>
      current === nextCategory ? current : nextCategory,
    );
    setSearchQuery((current) => (current === nextSearch ? current : nextSearch));
    setSortBy((current) => (current === nextSort ? current : nextSort));
  }, [searchParams]);

  const {
    data: rawCategories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery({
    queryKey: ["categories"],
    queryFn: () =>
      fetchJsonWithRetry<string[]>("/api/menu/categories", undefined, {
        timeoutMs: 15000,
        retries: 1,
      }),
    staleTime: 1000 * 60 * 10,
    retry: 0,
  });

  const categories = [
    { id: "all", name: "All Items" },
    ...(rawCategories ?? []).map((c) => ({ id: c, name: toTitle(c) })),
  ];

  const menuParams = new URLSearchParams();
  if (activeCategory !== "all") menuParams.set("category", activeCategory);
  if (debouncedSearch) menuParams.set("search", debouncedSearch);
  if (sortBy !== "popular") menuParams.set("sort", sortBy);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    if (activeCategory !== "all") nextParams.set("category", activeCategory);
    if (debouncedSearch) nextParams.set("search", debouncedSearch);
    if (sortBy !== "popular") nextParams.set("sort", sortBy);
    setSearchParams(nextParams, { replace: true });
  }, [activeCategory, debouncedSearch, sortBy, setSearchParams]);

  const menuPath = menuParams.toString()
    ? `/api/menu?${menuParams.toString()}`
    : "/api/menu";

  const {
    data: allItems = [],
    isLoading: itemsLoading,
    isFetching: itemsFetching,
    isError: itemsError,
    refetch: refetchItems,
  } = useQuery({
    queryKey: ["menu", activeCategory, debouncedSearch, sortBy],
    queryFn: () =>
      fetchJsonWithRetry<MenuItem[]>(menuPath, undefined, {
        timeoutMs: 15000,
        retries: 1,
      }),
    retry: 0,
  });

  const filteredItems = allItems.filter((item) => {
    if (item.price < priceRange[0]) return false;
    if (priceRange[1] < 9999 && item.price > priceRange[1]) return false;
    return true;
  });

  const maxPrice = allItems.length > 0
    ? Math.ceil(Math.max(...allItems.map((i) => i.price)))
    : 100;

  useEffect(() => {
    track("menu_viewed");
  }, []);

  useEffect(() => {
    if (itemsLoading || itemsFetching || itemsError) return;
    const key = `${activeCategory}|${debouncedSearch}|${sortBy}|${allItems.map((item) => item.id).join(",")}`;
    if (lastTrackedResultKey.current === key) return;
    lastTrackedResultKey.current = key;
    if (activeCategory !== "all") {
      track("category_viewed", { categoryId: activeCategory });
    }
    if (debouncedSearch) {
      track("search_performed", {
        properties: { query: debouncedSearch, resultCount: allItems.length },
      });
    }
    for (const item of allItems.slice(0, 50)) {
      track("item_impression", { itemId: item.id, categoryId: item.category });
    }
  }, [activeCategory, allItems, debouncedSearch, itemsError, itemsFetching, itemsLoading, sortBy]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pb-20 md:pb-0">
        {/* Hero */}
        <section className="bg-accent py-8 sm:py-12 lg:py-16">
          <div className="mx-auto max-w-7xl px-4 text-center lg:px-8">
            <h1 className="six7-rise font-serif text-3xl font-bold text-accent-foreground sm:text-4xl md:text-5xl">
              {restaurantName} Menu
            </h1>
            <p className="six7-rise mx-auto mt-3 max-w-2xl text-sm text-accent-foreground/70 sm:mt-4 sm:text-base">
              {menuSubtitle}
            </p>
          </div>
        </section>

        {/* Filters Bar */}
        <section className="sticky top-16 z-40 border-b border-border bg-background/95 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8">
            {/* Search takes its own row on a phone; at 375px it was being
                squeezed to a couple of characters when it shared with the
                sort and filter controls. */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="relative w-full sm:w-auto sm:max-w-xs sm:flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search menu..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-10"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-10 flex-1 sm:w-35 sm:flex-none">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popular">Popular</SelectItem>
                  <SelectItem value="price-low">Price: Low</SelectItem>
                  <SelectItem value="price-high">Price: High</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="six7-press h-10 gap-2"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {(priceRange[0] > 0 || priceRange[1] < 9999) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    1
                  </Badge>
                )}
              </Button>

              {/* Refetch indicator */}
              {itemsFetching && !itemsLoading && (
                <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            {showFilters && (
              <div className="mt-4 rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-foreground">
                    Price Range
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPriceRange([0, 9999])}
                    className="h-auto p-0 text-xs text-muted-foreground"
                  >
                    Reset
                  </Button>
                </div>
                <div className="mt-4">
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    min={0}
                    max={maxPrice}
                    step={1}
                    className="w-full"
                  />
                  <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                    <span>{formatMoney(priceRange[0])}</span>
                    <span>{priceRange[1] >= maxPrice ? "Any" : formatMoney(priceRange[1])}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Category Tabs */}
        <section className="border-b border-border bg-background">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="flex gap-1 overflow-x-auto py-3 scrollbar-hide">
              {categoriesLoading && (
                <div className="px-2 py-2 text-sm text-muted-foreground">
                  Loading categories...
                </div>
              )}
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={activeCategory === category.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "shrink-0 rounded-full px-4",
                    activeCategory === category.id && "shadow-md",
                  )}
                >
                  {category.name}
                </Button>
              ))}
              {categoriesError && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchCategories()}
                >
                  Retry Categories
                </Button>
              )}
            </div>
          </div>
        </section>

        {/* Menu Grid */}
        <section className="py-8 lg:py-12">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            {itemsLoading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 animate-pulse rounded-2xl bg-muted"
                  />
                ))}
              </div>
            ) : itemsError ? (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">
                  Menu failed to load.
                </p>
                <Button variant="outline" onClick={() => refetchItems()}>
                  Retry
                </Button>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-lg text-muted-foreground">No items found</p>
                <Button
                  variant="link"
                  onClick={() => {
                    setActiveCategory("all");
                    setSearchQuery("");
                    setPriceRange([0, 9999]);
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            ) : (
              <div
                className={cn(
                  "six7-stagger grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4 transition-opacity duration-200",
                  itemsFetching && "opacity-60 pointer-events-none",
                )}
              >
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "six7-card group overflow-hidden rounded-2xl border border-border bg-card",
                      "hover:border-primary/30",
                    )}
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-[#FDF1D7]">
                      {/* Items without a photo (add-ons, for example) fall back to
                          the brand mark. Rendering <img src=""> makes the browser
                          re-request the page, so the tag is omitted entirely. */}
                      {item.image ? (
                        <img
                          src={item.image}
                          {...srcSetFor(item.image)}
                          alt={item.name}
                          loading="lazy"
                          decoding="async"
                          className="six7-card-img absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img
                            src="/images/six-seven-mark.png"
                            alt=""
                            loading="lazy"
                            className="h-12 w-12 opacity-45"
                          />
                        </div>
                      )}
                      <div className="absolute left-3 top-3 flex flex-col gap-2">
                        {item.isPopular && (
                          <Badge className="bg-secondary text-secondary-foreground">
                            Popular
                          </Badge>
                        )}
                        {item.isSpicy && (
                          <Badge variant="destructive" className="gap-1">
                            <Flame className="h-3 w-3" />
                            Spicy
                          </Badge>
                        )}
                      </div>
                      <Button
                        size="icon"
                        aria-label={`Add ${item.name} to cart`}
                        className="six7-add six7-press absolute bottom-2 right-2 h-11 w-11 rounded-full shadow-lg sm:bottom-3 sm:right-3"
                        onClick={() => {
                          const finalPrice =
                            item.salePrice != null && item.salePrice < item.price
                              ? item.salePrice
                              : item.price;
                          addItem({
                            menuItemId: item.id,
                            name: item.name,
                            price: finalPrice,
                            image: item.image,
                          });
                          toast.success(`${item.name} added to cart`, {
                            action: {
                              label: "View Cart",
                              onClick: () => navigate("/cart"),
                            },
                          });
                        }}
                      >
                        <Plus className="h-5 w-5" />
                        <span className="sr-only">Add to cart</span>
                      </Button>
                    </div>
                    <div className="p-3 sm:p-4">
                      <h3 className="font-serif text-base font-semibold text-card-foreground line-clamp-2 sm:text-lg sm:line-clamp-1">
                        {item.name}
                      </h3>
                      <p className="mt-1 hidden text-sm text-muted-foreground line-clamp-2 sm:block">
                        {item.description}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 sm:mt-3">
                        <div className="flex items-baseline gap-2">
                          {item.salePrice != null &&
                          item.salePrice < item.price ? (
                            <>
                              <span className="font-serif text-base font-bold text-primary sm:text-xl">
                                {formatMoney(item.salePrice)}
                              </span>
                              <span className="text-sm text-muted-foreground line-through">
                                {formatMoney(item.price)}
                              </span>
                            </>
                          ) : (
                            <span className="font-serif text-base font-bold text-primary sm:text-xl">
                              {formatMoney(item.price)}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          className="six7-press h-8 px-2.5 text-xs sm:h-9 sm:px-3 sm:text-sm"
                          onClick={() => {
                            const finalPrice =
                              item.salePrice != null &&
                              item.salePrice < item.price
                                ? item.salePrice
                                : item.price;
                            addItem({
                              menuItemId: item.id,
                              name: item.name,
                              price: finalPrice,
                              image: item.image,
                            });
                            toast.success(`${item.name} added to cart`, {
                              action: {
                                label: "View Cart",
                                onClick: () => navigate("/cart"),
                              },
                            });
                          }}
                        >
                          Add to Cart
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
