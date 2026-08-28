/**
 * Writes one static HTML file per public route after the Vite build.
 *
 * The app is a single-page app, so every URL is served the same index.html.
 * Before React runs, a crawler asking for /branches or /about receives the
 * homepage's title, description, canonical and body copy — so those pages have
 * no distinct content to index at the moment they are first fetched. Google
 * does execute JavaScript eventually, but it is slower, less reliable, and
 * social and AI crawlers mostly do not bother at all.
 *
 * Each generated file is the real build output with the head rewritten and the
 * pre-hydration body copy replaced. React hydrates over it exactly as before,
 * so nothing changes for a human visitor.
 *
 * Titles and descriptions mirror ROUTE_META in src/components/SeoMetadata.tsx,
 * which stays the runtime source of truth — these are the pre-JavaScript copy.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
const SITE = "https://sixseven.pk";
const IMAGE = `${SITE}/static/uploads/double-stack.webp`;

const ROUTES = [
  {
    path: "/menu",
    title: "Six Seven Food Menu | Burgers, Tenders, Loaded Fries & Coffee Lahore",
    description:
      "Explore the Six Seven menu: Mighty Zinger, Australian beef Single/Double/Triple Stack burgers, chicken tenders, loaded chicken fries, wraps, grilled sandwiches, salads, mini pancakes, waffles and drinks.",
    h1: "Six Seven Menu — Burgers, Tenders, Loaded Fries and Coffee in DHA Lahore",
    body: "The Six Seven menu includes Australian beef burgers (Single Stack, Double Stack and Triple Stack), the Mighty Zinger and Mighty Grilled Chicken, beef specials such as the Mushroom Melt and Smoky Barbecue Melt, Golden and Cheesy chicken tenders, loaded fries, 10-inch wraps, grilled sandwiches, fresh salads, kids meals, waffles and mini pancakes, signature drinks, iced teas, smoothies, frappes, iced coffees and hot coffees. Order online for delivery across DHA Phase 4 Lahore or collect from the branch.",
  },
  {
    path: "/branches",
    title: "Six Seven Branch Locator | DHA Phase 4 Lahore",
    description:
      "Find the Six Seven branch at 75 CCA, DD Block, DHA Phase 4 Lahore with directions, timings, pickup and delivery details.",
    h1: "Six Seven Branch — 75 CCA, DD Block, DHA Phase 4, Lahore",
    body: "Six Seven is located at 75 CCA, DD Block, DHA Phase 4, Lahore. Call 0324-6756767. Delivery covers a 5 km radius around DHA Phase 4, and pickup is available from the counter. Open Mon-Thu 12 PM-1:30 AM, Friday 2 PM-2:30 AM, Saturday 12 PM-2:30 AM and Sunday 5 PM-1:30 AM.",
  },
  {
    path: "/about",
    title: "About Six Seven | Good Food, Good Coffee, Good Mood",
    description:
      "Learn about Six Seven, a Lahore cafe and fast food brand serving burgers, loaded snacks, coffee and signature drinks.",
    h1: "About Six Seven, a DHA Phase 4 Lahore cafe and fast food brand",
    body: "Six Seven serves Australian beef burgers, chicken burgers, loaded snacks, specialty coffee and signature drinks from DHA Phase 4, Lahore. Good Food. Good Coffee. Good Mood.",
  },
  {
    path: "/contact",
    title: "Contact Six Seven | DHA Phase 4 Lahore",
    description:
      "Contact Six Seven Lahore for orders, delivery help, pickup details, feedback and brand inquiries.",
    h1: "Contact Six Seven, DHA Phase 4 Lahore",
    body: "Call 0324-6756767 or email contact@sixseven.pk for orders, delivery help, pickup details, feedback and brand inquiries. The branch is at 75 CCA, DD Block, DHA Phase 4, Lahore.",
  },
  {
    path: "/faq",
    title: "Six Seven FAQ | Ordering, Delivery, Pickup & Payments",
    description:
      "Answers about Six Seven ordering hours, delivery radius, pickup, payment options and the DHA Phase 4 Lahore branch.",
    h1: "Six Seven FAQ — ordering, delivery, pickup and payments",
    body: "Six Seven accepts online orders Mon-Thu 12 PM-1:30 AM, Friday 2 PM-2:30 AM, Saturday 12 PM-2:30 AM and Sunday 5 PM-1:30 AM. Delivery covers a 5 km radius around DHA Phase 4, Lahore. Payment is by cash on delivery, card on delivery or online transfer, and pickup orders are paid at the branch.",
  },
  {
    path: "/rewards",
    title: "Six Seven Rewards | Points & Offers",
    description: "Earn rewards and offers when ordering from Six Seven Lahore.",
    h1: "Six Seven Rewards — points and offers",
    body: "Earn points on every Six Seven order and redeem them against future orders for delivery or pickup in DHA Phase 4, Lahore.",
  },
  {
    path: "/careers",
    title: "Careers at Six Seven Lahore",
    description: "Explore opportunities to work with Six Seven in Lahore.",
    h1: "Careers at Six Seven, Lahore",
    body: "Six Seven hires kitchen, counter, barista and delivery team members for the DHA Phase 4 Lahore branch.",
  },
  {
    path: "/franchise",
    title: "Six Seven Franchise & Partnership Inquiries",
    description:
      "Contact Six Seven for franchise, partnership and brand growth inquiries.",
    h1: "Six Seven franchise and partnership inquiries",
    body: "Six Seven welcomes franchise, partnership and brand growth inquiries in Lahore and across Pakistan.",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Six Seven",
    description:
      "Read how Six Seven handles customer information for online orders, delivery, pickup and support.",
    h1: "Six Seven privacy policy",
    body: "How Six Seven collects, uses and protects customer information for online orders, delivery, pickup and customer support.",
  },
  {
    path: "/terms",
    title: "Terms of Service | Six Seven",
    description:
      "Read Six Seven terms for online ordering, item availability, delivery radius, pickup and payments.",
    h1: "Six Seven terms of service",
    body: "Terms covering online ordering, item availability, the 5 km delivery radius, pickup and accepted payment methods.",
  },
];

const escape = (value) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Replace the content of a tag matched by `pattern`, or report that it was missed. */
function replaceOrThrow(html, pattern, replacement, label) {
  if (!pattern.test(html)) throw new Error(`prerender: could not find ${label}`);
  return html.replace(pattern, replacement);
}

function buildPage(template, route) {
  const canonical = `${SITE}${route.path}`;
  let html = template;

  html = replaceOrThrow(html, /<title>[\s\S]*?<\/title>/, `<title>${escape(route.title)}</title>`, "<title>");
  html = replaceOrThrow(
    html,
    /<meta name="description" content="[^"]*" \/>/,
    `<meta name="description" content="${escape(route.description)}" />`,
    "meta description",
  );
  html = replaceOrThrow(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${canonical}" />`,
    "canonical link",
  );

  for (const [attr, name, value] of [
    ["property", "og:title", route.title],
    ["property", "og:description", route.description],
    ["property", "og:url", canonical],
    ["name", "twitter:title", route.title],
    ["name", "twitter:description", route.description],
  ]) {
    html = replaceOrThrow(
      html,
      new RegExp(`<meta ${attr}="${name}" content="[^"]*" />`),
      `<meta ${attr}="${name}" content="${escape(value)}" />`,
      `${name} meta`,
    );
  }

  // Route-specific copy behind the app, so a crawler that never runs the bundle
  // still reads this page rather than the homepage.
  const fallback = `<main>
        <h1>${escape(route.h1)}</h1>
        <p>${escape(route.body)}</p>
        <p><a href="${SITE}/menu">Order online from the Six Seven menu</a> for delivery or pickup in DHA Phase 4, Lahore.</p>
        <nav aria-label="Important Six Seven pages">
          <a href="/menu">Menu</a>
          <a href="/branches">Branch Locator</a>
          <a href="/contact">Contact Us</a>
          <a href="/about">About Us</a>
          <a href="/faq">FAQ</a>
          <a href="/rewards">Rewards</a>
        </nav>
      </main>`;
  // Vite hoists the module script into <head>, so the root div is the last
  // thing before </body>.
  html = replaceOrThrow(
    html,
    /<div id="root">[\s\S]*<\/div>(\s*<\/body>)/,
    `<div id="root">${fallback}</div>$1`,
    "#root fallback block",
  );

  return html;
}

const template = await readFile(join(DIST, "index.html"), "utf8");
if (!template.includes(IMAGE)) {
  console.warn("prerender: og:image is not the expected menu photo — check index.html");
}

for (const route of ROUTES) {
  const html = buildPage(template, route);
  const slug = route.path.replace(/^\//, "");
  // Both layouts, so the file is found whether the host resolves /menu to
  // menu.html or to menu/index.html.
  await writeFile(join(DIST, `${slug}.html`), html, "utf8");
  await mkdir(join(DIST, slug), { recursive: true });
  await writeFile(join(DIST, slug, "index.html"), html, "utf8");
}

console.log(`prerender: wrote ${ROUTES.length} route pages`);
