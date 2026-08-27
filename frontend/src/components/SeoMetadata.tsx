import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ORDER_HOURS_TEXT } from "@/lib/order-hours";

const SITE_URL = "https://sixseven.pk";
const BRAND_NAME = "Six Seven";
const DEFAULT_IMAGE = `${SITE_URL}/images/six-seven-logo.png`;
const STORE_ADDRESS = "75 CCA, DD Block, DHA Phase 4, Lahore";
const PHONE_TEXT = "+923246756767";
const ORDERING_URL = `${SITE_URL}/menu`;

const SITE_NAVIGATION = [
  {
    name: "Menu",
    url: `${SITE_URL}/menu`,
    description: "Six Seven burgers, fast food, coffee and drinks menu.",
  },
  {
    name: "Branch Locator",
    url: `${SITE_URL}/branches`,
    description: "Six Seven DHA Phase 4 Lahore location and directions.",
  },
  {
    name: "Contact Us",
    url: `${SITE_URL}/contact`,
    description: "Customer support, order help and brand inquiries.",
  },
  {
    name: "About Us",
    url: `${SITE_URL}/about`,
    description: "Six Seven brand story and Lahore cafe positioning.",
  },
  {
    name: "FAQ",
    url: `${SITE_URL}/faq`,
    description: "Ordering, delivery, pickup and payment questions.",
  },
  {
    name: "Rewards",
    url: `${SITE_URL}/rewards`,
    description: "Six Seven points, loyalty and offers.",
  },
];

const OPENING_HOURS_SPECIFICATION = [
  { dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday"], opens: "12:00", closes: "01:30" },
  { dayOfWeek: "Friday", opens: "14:00", closes: "02:30" },
  { dayOfWeek: "Saturday", opens: "12:00", closes: "02:30" },
  { dayOfWeek: "Sunday", opens: "17:00", closes: "01:30" },
];

const MENU_KEYWORDS = [
  "Six Seven Lahore",
  "sixseven.pk",
  "fast food Lahore",
  "beef burger Lahore",
  "burger near me Lahore",
  "fast food near me Lahore",
  "Mighty Zinger Lahore",
  "zinger burger Lahore",
  "Australian beef burger Lahore",
  "beef smash burger Lahore",
  "burgers near DHA Phase 4",
  "DHA Phase 4 restaurants",
  "chicken tenders Lahore",
  "loaded chicken fries Lahore",
  "crispy chicken wrap Lahore",
  "grilled sandwich Lahore",
  "waffles Lahore",
  "mini pancakes Lahore",
  "coffee Lahore",
  "coffee near me Lahore",
  "iced coffee Lahore",
  "iced tea Lahore",
  "smoothies Lahore",
  "frappes Lahore",
  "loaded fries Lahore",
  "wraps Lahore",
];

type RouteMeta = {
  title: string;
  description: string;
  keywords: string[];
  pageType?: string;
  index?: boolean;
};

const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    title: "Six Seven | Fast Food, Beef Burgers & Coffee in DHA Lahore",
    description:
      "Order Six Seven burgers, fast food, specialty coffee, iced teas, smoothies and frappes from DHA Phase 4 Lahore for delivery or pickup.",
    keywords: [
      "Six Seven",
      "67 Six Seven",
      "sixseven.pk",
      "fast food Lahore",
      "fast food near me",
      "beef burger Lahore",
      "beef burger near me",
      "coffee Lahore",
      "coffee near me",
      "DHA Phase 4 Lahore food",
      "DHA Phase 4 restaurants",
      "late night food Lahore",
      "online food ordering Lahore",
    ],
    pageType: "WebPage",
  },
  "/menu": {
    title: "Six Seven Food Menu | Burgers, Tenders, Loaded Fries & Coffee Lahore",
    description:
      "Explore the Six Seven menu: Mighty Zinger, Australian beef burgers, chicken tenders, loaded chicken fries, wraps, grilled sandwiches, salads, mini pancakes, waffles and drinks.",
    keywords: [
      "Six Seven menu",
      "sixseven.pk menu",
      "Six Seven food menu",
      "Mighty Zinger Lahore",
      "zinger burger Lahore",
      "Australian beef burger Lahore",
      "beef burger Lahore",
      "beef burger near me",
      "chicken burger Lahore",
      "chicken tenders Lahore",
      "loaded fries Lahore",
      "loaded chicken fries Lahore",
      "wraps Lahore",
      "wraps near me",
      "grilled sandwich Lahore",
      "fresh salad Lahore",
      "kids meal Lahore",
      "mini pancakes Lahore",
      "waffles Lahore",
      "signature drinks Lahore",
      "iced tea Lahore",
      "smoothies Lahore",
      "frappes Lahore",
      "iced coffee Lahore",
      "cold coffee near me",
      "hot coffee Lahore",
    ],
    pageType: "CollectionPage",
  },
  "/branches": {
    title: "Six Seven Branch Locator | DHA Phase 4 Lahore",
    description:
      "Find the Six Seven branch at 75 CCA, DD Block, DHA Phase 4 Lahore with directions, timings, pickup and delivery details.",
    keywords: [
      "Six Seven branch",
      "Six Seven location",
      "Six Seven DHA Phase 4",
      "75 CCA DD Block DHA Phase 4",
      "DHA Phase 4 restaurants",
      "branch locator Lahore",
      "fast food delivery DHA Lahore",
    ],
    pageType: "WebPage",
  },
  "/contact": {
    title: "Contact Six Seven | DHA Phase 4 Lahore",
    description:
      "Contact Six Seven Lahore for orders, delivery help, pickup details, feedback and brand inquiries.",
    keywords: [
      "Six Seven contact",
      "Six Seven phone number",
      "contact fast food Lahore",
      "DHA Phase 4 food delivery",
      "Six Seven customer support",
    ],
    pageType: "ContactPage",
  },
  "/faq": {
    title: "Six Seven FAQ | Ordering, Delivery, Pickup & Payments",
    description:
      "Answers about Six Seven ordering hours, delivery radius, pickup, payment options and the DHA Phase 4 Lahore branch.",
    keywords: [
      "Six Seven FAQ",
      "Six Seven delivery radius",
      "Six Seven payment options",
      "cash on delivery Lahore restaurant",
      "card on delivery Lahore",
      "pickup order Lahore",
      "Six Seven timings",
    ],
    pageType: "FAQPage",
  },
  "/about": {
    title: "About Six Seven | Good Food, Good Coffee, Good Mood",
    description:
      "Learn about Six Seven, a Lahore cafe and fast food brand serving burgers, loaded snacks, coffee and signature drinks.",
    keywords: [
      "About Six Seven",
      "Six Seven Lahore brand",
      "Lahore cafe",
      "fast food cafe Lahore",
      "Good Food Good Coffee Good Mood",
      "burger and coffee Lahore",
    ],
    pageType: "AboutPage",
  },
  "/privacy": {
    title: "Privacy Policy | Six Seven",
    description:
      "Read how Six Seven handles customer information for online orders, delivery, pickup and support.",
    keywords: [
      "Six Seven privacy policy",
      "sixseven.pk privacy",
      "online ordering privacy Lahore",
      "restaurant customer data policy",
    ],
    pageType: "WebPage",
  },
  "/terms": {
    title: "Terms of Service | Six Seven",
    description:
      "Read Six Seven terms for online ordering, item availability, delivery radius, pickup and payments.",
    keywords: [
      "Six Seven terms",
      "sixseven.pk terms",
      "online food ordering terms",
      "delivery radius policy Lahore",
      "pickup payment terms",
    ],
    pageType: "WebPage",
  },
  "/rewards": {
    title: "Six Seven Rewards | Points & Offers",
    description:
      "Earn rewards and offers when ordering from Six Seven Lahore.",
    keywords: [
      "Six Seven rewards",
      "Six Seven points",
      "restaurant loyalty Lahore",
      "fast food deals Lahore",
      "Six Seven offers",
    ],
    pageType: "WebPage",
  },
  "/track": {
    title: "Track Your Six Seven Order",
    description:
      "Track your Six Seven delivery or pickup order status online.",
    keywords: [
      "track Six Seven order",
      "Six Seven order status",
      "track food delivery Lahore",
    ],
    index: false,
  },
  "/careers": {
    title: "Careers at Six Seven Lahore",
    description:
      "Explore opportunities to work with Six Seven in Lahore.",
    keywords: [
      "Six Seven careers",
      "restaurant jobs Lahore",
      "cafe jobs Lahore",
      "fast food jobs Lahore",
      "DHA Lahore restaurant careers",
    ],
    pageType: "WebPage",
  },
  "/franchise": {
    title: "Six Seven Franchise & Partnership Inquiries",
    description:
      "Contact Six Seven for franchise, partnership and brand growth inquiries.",
    keywords: [
      "Six Seven franchise",
      "restaurant franchise Lahore",
      "fast food franchise Pakistan",
      "cafe partnership Lahore",
      "Six Seven partnership",
    ],
    pageType: "WebPage",
  },
  "/cart": {
    title: "Your Cart | Six Seven",
    description: "Review your Six Seven order before checkout.",
    keywords: ["Six Seven cart", "online food cart", "Lahore food order"],
    index: false,
  },
  "/checkout": {
    title: "Checkout | Six Seven",
    description: "Place a Six Seven pickup or delivery order from Lahore.",
    keywords: ["Six Seven checkout", "food delivery checkout Lahore", "pickup order Lahore"],
    index: false,
  },
  "/history": {
    title: "Order History | Six Seven",
    description: "View your previous Six Seven orders.",
    keywords: ["Six Seven order history", "previous food orders", "reorder Six Seven"],
    index: false,
  },
  "/login": {
    title: "Login | Six Seven",
    description: "Sign in to your Six Seven account.",
    keywords: ["Six Seven login", "Six Seven account", "restaurant account Lahore"],
    index: false,
  },
  "/points": {
    title: "Points | Six Seven",
    description: "Check your Six Seven reward points.",
    keywords: ["Six Seven points", "Six Seven rewards account", "restaurant points Lahore"],
    index: false,
  },
  "/profile": {
    title: "Profile | Six Seven",
    description: "Manage your Six Seven account profile.",
    keywords: ["Six Seven profile", "Six Seven account settings"],
    index: false,
  },
  "/claim-order": {
    title: "Claim Order | Six Seven",
    description: "Claim a Six Seven order in your account.",
    keywords: ["claim Six Seven order", "Six Seven order account"],
    index: false,
  },
  "/restaurant-not-found": {
    title: "Restaurant Not Found | Six Seven",
    description: "The requested Six Seven restaurant page could not be found.",
    keywords: ["Six Seven restaurant not found", "Six Seven Lahore"],
    index: false,
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

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

function pageLabel(pathname: string, meta: RouteMeta) {
  if (pathname === "/") return BRAND_NAME;
  return meta.title.split("|")[0].trim();
}

function pageMeta(pathname: string) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname];
  if (pathname.startsWith("/menu")) return ROUTE_META["/menu"];
  return {
    title: "Six Seven | Fast Food, Burgers & Coffee in Lahore",
    description:
      "Six Seven serves fast food, beef burgers, specialty coffee and signature drinks in DHA Phase 4 Lahore.",
    keywords: MENU_KEYWORDS,
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
    setMeta("keywords", meta.keywords.join(", "));
    setMeta("author", BRAND_NAME);
    setMeta("robots", shouldIndex ? "index,follow" : "noindex,follow");
    setLink("canonical", canonical);

    setMeta("og:site_name", BRAND_NAME, "property");
    setMeta("og:locale", "en_PK", "property");
    setMeta("og:type", "website", "property");
    setMeta("og:title", meta.title, "property");
    setMeta("og:description", meta.description, "property");
    setMeta("og:url", canonical, "property");
    setMeta("og:image", DEFAULT_IMAGE, "property");
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", meta.title);
    setMeta("twitter:description", meta.description);
    setMeta("twitter:image", DEFAULT_IMAGE);

    setJsonLd("six-seven-website", {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: BRAND_NAME,
      alternateName: ["67", "67 - Six Seven", "sixseven.pk"],
      url: `${SITE_URL}/`,
      inLanguage: "en-PK",
      publisher: { "@id": `${SITE_URL}/#business` },
      potentialAction: {
        "@type": "SearchAction",
        target: `${SITE_URL}/menu?search={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    });

    setJsonLd("six-seven-site-navigation", {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "@id": `${SITE_URL}/#site-navigation`,
      name: "Six Seven main pages",
      itemListElement: SITE_NAVIGATION.map((item, index) => ({
        "@type": "SiteNavigationElement",
        position: index + 1,
        name: item.name,
        url: item.url,
        description: item.description,
      })),
    });

    setJsonLd("six-seven-web-page", {
      "@context": "https://schema.org",
      "@type": meta.pageType || "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: pageLabel(pathname, meta),
      headline: meta.title,
      description: meta.description,
      keywords: meta.keywords.join(", "),
      inLanguage: "en-PK",
      isPartOf: { "@id": `${SITE_URL}/#website` },
      about: { "@id": `${SITE_URL}/#business` },
      publisher: { "@id": `${SITE_URL}/#business` },
    });

    setJsonLd("six-seven-local-business", {
      "@context": "https://schema.org",
      "@type": ["FastFoodRestaurant", "CafeOrCoffeeShop"],
      "@id": `${SITE_URL}/#business`,
      name: BRAND_NAME,
      url: SITE_URL,
      telephone: PHONE_TEXT,
      image: DEFAULT_IMAGE,
      logo: DEFAULT_IMAGE,
      priceRange: "Rs.",
      keywords: MENU_KEYWORDS.join(", "),
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
      openingHoursSpecification: OPENING_HOURS_SPECIFICATION.map((hours) => ({
        "@type": "OpeningHoursSpecification",
        ...hours,
      })),
      hasMenu: ORDERING_URL,
      menu: ORDERING_URL,
      acceptsReservations: false,
      paymentAccepted: ["Cash on delivery", "Card on delivery", "Online transfer"],
      potentialAction: {
        "@type": "OrderAction",
        target: ORDERING_URL,
        deliveryMethod: [
          "https://schema.org/OnSitePickup",
          "https://schema.org/DeliveryModeOwnFleet",
        ],
      },
      makesOffer: [
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MenuItem",
            name: "Mighty burgers and Australian beef stacks",
            description: "Six Seven Mighty Zinger, grilled chicken burgers, Australian beef stacks and beef specials in DHA Phase 4 Lahore.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MenuItem",
            name: "Chicken tenders, loaded fries and wraps",
            description: "Golden tenders, cheesy tenders, fully loaded chicken fries, crispy wraps and grilled wraps.",
          },
        },
        {
          "@type": "Offer",
          itemOffered: {
            "@type": "MenuItem",
            name: "Coffee and signature drinks",
            description: "Hot coffee, iced coffee, iced teas, smoothies and frappes.",
          },
        },
      ],
      slogan: "Good Food. Good Coffee. Good Mood.",
      description:
        "Six Seven is a Lahore fast food and coffee brand serving Mighty Zinger burgers, Australian beef burgers, chicken tenders, loaded fries, wraps, grilled sandwiches, sweets, specialty coffee, iced teas, smoothies and frappes from DHA Phase 4.",
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
      removeJsonLd("six-seven-faq");
    }

    if (pathname === "/menu") {
      setJsonLd("six-seven-menu-page", {
        "@context": "https://schema.org",
        "@type": "Menu",
        "@id": `${SITE_URL}/menu#menu`,
        name: "Six Seven Menu",
        url: `${SITE_URL}/menu`,
        provider: { "@id": `${SITE_URL}/#business` },
        description:
          "Mighty Zinger, Australian beef burgers, chicken tenders, loaded fries, wraps, sandwiches, salads, sweets, signature drinks, iced teas, smoothies, frappes, iced coffees and hot coffees from Six Seven Lahore.",
        hasMenuSection: [
          "Burgers",
          "Chicken Tenders",
          "Loaded Fries",
          "Fries",
          "Wraps",
          "Grilled Sandwiches",
          "Fresh Salads",
          "Little 6-7",
          "Sweet Side",
          "Signature Drinks",
          "Iced Teas",
          "Smoothies",
          "Frappes",
          "Iced Coffees",
          "Hot Coffees",
        ].map((name) => ({
          "@type": "MenuSection",
          name,
          url: `${SITE_URL}/menu`,
        })),
      });
    } else {
      removeJsonLd("six-seven-menu-page");
    }

    if (shouldIndex && canonicalPath !== "/") {
      setJsonLd("six-seven-breadcrumbs", {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: `${SITE_URL}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: pageLabel(pathname, meta),
            item: canonical,
          },
        ],
      });
    } else {
      removeJsonLd("six-seven-breadcrumbs");
    }
  }, [pathname]);

  return null;
}
