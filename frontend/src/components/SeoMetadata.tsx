import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ORDER_HOURS_TEXT } from "@/lib/order-hours";

const SITE_URL = "https://sixseven.pk";
const BRAND_NAME = "Six Seven";
const DEFAULT_IMAGE = `${SITE_URL}/images/six-seven-logo.png`;
const STORE_ADDRESS = "75 CCA, DD Block, DHA Phase 4, Lahore";
const PHONE_TEXT = "DM @sixseven.pk";

const ROUTE_META: Record<
  string,
  {
    title: string;
    description: string;
    index?: boolean;
  }
> = {
  "/": {
    title: "Six Seven | Fast Food, Beef Burgers & Coffee in DHA Lahore",
    description:
      "Order Six Seven burgers, fast food, specialty coffee, iced teas, smoothies and frappes from DHA Phase 4 Lahore for delivery or pickup.",
  },
  "/menu": {
    title: "Six Seven Menu | Burgers, Fast Food, Coffee & Drinks Lahore",
    description:
      "Explore the Six Seven menu: beef burgers, loaded snacks, signature drinks, iced teas, smoothies, frappes, iced coffee and hot coffee.",
  },
  "/branches": {
    title: "Six Seven Branch Locator | DHA Phase 4 Lahore",
    description:
      "Find the Six Seven branch at 75 CCA, DD Block, DHA Phase 4 Lahore with directions, timings, pickup and delivery details.",
  },
  "/contact": {
    title: "Contact Six Seven | DHA Phase 4 Lahore",
    description:
      "Contact Six Seven Lahore for orders, delivery help, pickup details, feedback and brand inquiries.",
  },
  "/faq": {
    title: "Six Seven FAQ | Ordering, Delivery, Pickup & Payments",
    description:
      "Answers about Six Seven ordering hours, delivery radius, pickup, payment options and the DHA Phase 4 Lahore branch.",
  },
  "/about": {
    title: "About Six Seven | Good Food, Good Coffee, Good Mood",
    description:
      "Learn about Six Seven, a Lahore cafe and fast food brand serving burgers, loaded snacks, coffee and signature drinks.",
  },
  "/privacy": {
    title: "Privacy Policy | Six Seven",
    description:
      "Read how Six Seven handles customer information for online orders, delivery, pickup and support.",
  },
  "/terms": {
    title: "Terms of Service | Six Seven",
    description:
      "Read Six Seven terms for online ordering, item availability, delivery radius, pickup and payments.",
  },
  "/rewards": {
    title: "Six Seven Rewards | Points & Offers",
    description:
      "Earn rewards and offers when ordering from Six Seven Lahore.",
  },
  "/track": {
    title: "Track Your Six Seven Order",
    description:
      "Track your Six Seven delivery or pickup order status online.",
    index: false,
  },
  "/careers": {
    title: "Careers at Six Seven Lahore",
    description:
      "Explore opportunities to work with Six Seven in Lahore.",
  },
  "/franchise": {
    title: "Six Seven Franchise & Partnership Inquiries",
    description:
      "Contact Six Seven for franchise, partnership and brand growth inquiries.",
  },
};

const NO_INDEX_PREFIXES = [
  "/admin",
  "/cart",
  "/checkout",
  "/claim-order",
  "/history",
  "/login",
  "/order-confirmation",
  "/points",
  "/profile",
];

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let tag = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attr, name);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

function setLink(rel: string, href: string) {
  let tag = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!tag) {
    tag = document.createElement("link");
    tag.rel = rel;
    document.head.appendChild(tag);
  }
  tag.href = href;
}

function setJsonLd(id: string, value: object) {
  let tag = document.getElementById(id) as HTMLScriptElement | null;
  if (!tag) {
    tag = document.createElement("script");
    tag.id = id;
    tag.type = "application/ld+json";
    document.head.appendChild(tag);
  }
  tag.text = JSON.stringify(value);
}

function pageMeta(pathname: string) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (pathname.startsWith("/menu")) return ROUTE_META["/menu"];
  return {
    title: "Six Seven | Fast Food, Burgers & Coffee in Lahore",
    description:
      "Six Seven serves fast food, beef burgers, specialty coffee and signature drinks in DHA Phase 4 Lahore.",
    index: false,
  };
}

export function SeoMetadata() {
  const { pathname } = useLocation();

  useEffect(() => {
    const meta = pageMeta(pathname);
    const canonicalPath = ROUTE_META[pathname] ? pathname : "/";
    const canonical = `${SITE_URL}${canonicalPath === "/" ? "" : canonicalPath}`;
    const shouldIndex =
      meta.index !== false &&
      !NO_INDEX_PREFIXES.some((prefix) => pathname.startsWith(prefix));

    document.title = meta.title;
    setMeta("description", meta.description);
    setMeta("robots", shouldIndex ? "index,follow" : "noindex,follow");
    setLink("canonical", canonical);

    setMeta("og:site_name", BRAND_NAME, "property");
    setMeta("og:type", "website", "property");
    setMeta("og:title", meta.title, "property");
    setMeta("og:description", meta.description, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:image", DEFAULT_IMAGE, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", DEFAULT_IMAGE);

    setJsonLd("six-seven-local-business", {
      "@context": "https://schema.org",
      "@type": ["FastFoodRestaurant", "CafeOrCoffeeShop"],
      "@id": `${SITE_URL}/#business`,
      name: BRAND_NAME,
      url: SITE_URL,
      image: DEFAULT_IMAGE,
      logo: DEFAULT_IMAGE,
      priceRange: "Rs.",
      servesCuisine: [
        "Fast food",
        "Burgers",
        "Beef burgers",
        "Coffee",
        "Iced tea",
        "Smoothies",
        "Frappes",
      ],
      address: {
        "@type": "PostalAddress",
        streetAddress: "75 CCA, DD Block, DHA Phase 4",
        addressLocality: "Lahore",
        addressCountry: "PK",
      },
      geo: {
        "@type": "GeoCoordinates",
        latitude: 31.4641372,
        longitude: 74.3822137,
      },
      areaServed: {
        "@type": "City",
        name: "Lahore",
      },
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "customer support",
        url: "https://instagram.com/sixseven.pk",
      },
      sameAs: [
        "https://instagram.com/sixseven.pk",
        "https://facebook.com/sixseven.pk",
      ],
      hasMap: "https://maps.google.com/?q=31.4641372,74.3822137",
      openingHours: ORDER_HOURS_TEXT,
      hasMenu: `${SITE_URL}/menu`,
      acceptsReservations: false,
      slogan: "Good Food. Good Coffee. Good Mood.",
      description:
        "Six Seven is a Lahore fast food and coffee brand serving burgers, loaded snacks, specialty coffee, iced teas, smoothies and frappes from DHA Phase 4.",
    });

    if (pathname === "/faq") {
      setJsonLd("six-seven-faq", {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What are Six Seven's online ordering hours?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Online orders are accepted Mon-Thu 12 PM-1:30 AM, Friday 2 PM-2:30 AM, Saturday 12 PM-2:30 AM, and Sunday 5 PM-1:30 AM.",
            },
          },
          {
            "@type": "Question",
            name: "Where is Six Seven located?",
            acceptedAnswer: {
              "@type": "Answer",
              text: STORE_ADDRESS,
            },
          },
          {
            "@type": "Question",
            name: "How can I pay for a Six Seven order?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Delivery orders can be paid by cash on delivery, card on delivery, or online transfer. Pickup orders can be paid at the branch.",
            },
          },
        ],
      });
    } else {
      document.getElementById("six-seven-faq")?.remove();
    }

    if (pathname === "/menu") {
      setJsonLd("six-seven-menu-page", {
        "@context": "https://schema.org",
        "@type": "Menu",
        name: "Six Seven Menu",
        url: `${SITE_URL}/menu`,
        provider: { "@id": `${SITE_URL}/#business` },
        description:
          "Burgers, fast food, signature drinks, iced teas, smoothies, frappes, iced coffees and hot coffees from Six Seven Lahore.",
      });
    } else {
      document.getElementById("six-seven-menu-page")?.remove();
    }
  }, [pathname]);

  return null;
}
