type EventProperties = Record<string, unknown>

type MetaPixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void
  loaded?: boolean
  push?: MetaPixel
  queue?: unknown[]
  version?: string
}

declare global {
  interface Window {
    _fbq?: MetaPixel
    fbq?: MetaPixel
  }
}

type TrackOptions = {
  itemId?: number
  categoryId?: string
  cartId?: string
  orderId?: string
  experimentId?: string
  variantId?: string
  missionId?: string
  properties?: EventProperties
  consentState?: "unknown" | "essential" | "analytics_granted" | "analytics_denied"
}

const VISITOR_KEY = "order_visitor_id"
const SESSION_KEY = "order_session_id"
const ATTRIBUTION_KEY = "order_attribution"
const CART_KEY = "order_cart_id"
const MAX_QUEUE = 20
const META_PIXEL_ID = "850716231340911"

let queue: Array<Record<string, unknown>> = []
let flushTimer: number | null = null
let metaPixelInitialized = false

const newId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

function getStorageId(storage: Storage, key: string, prefix: string): string {
  const existing = storage.getItem(key)
  if (existing) return existing
  const created = newId(prefix)
  storage.setItem(key, created)
  return created
}

export const getVisitorId = () => getStorageId(localStorage, VISITOR_KEY, "v")
export const getSessionId = () => getStorageId(sessionStorage, SESSION_KEY, "s")
export const getCartId = () => getStorageId(localStorage, CART_KEY, "c")
export const resetCartId = () => localStorage.setItem(CART_KEY, newId("c"))

function getAttribution() {
  const existing = sessionStorage.getItem(ATTRIBUTION_KEY)
  if (existing) return JSON.parse(existing)
  const params = new URLSearchParams(window.location.search)
  const referrer = document.referrer || ""
  let source = params.get("utm_source") || ""
  let medium = params.get("utm_medium") || ""
  if (!source && referrer) {
    try {
      source = new URL(referrer).hostname
      medium = "referral"
    } catch {
      source = "(direct)"
      medium = "(none)"
    }
  }
  if (!source) source = "(direct)"
  if (!medium) medium = "(none)"
  const attribution = {
    source,
    medium,
    campaign: params.get("utm_campaign") || undefined,
    content: params.get("utm_content") || undefined,
    term: params.get("utm_term") || undefined,
    clickId: params.get("gclid") || params.get("fbclid") || params.get("msclkid") || undefined,
  }
  sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution))
  return attribution
}

/**
 * The Meta pixel's own first-party cookie. Forwarding it with the server-side
 * Conversions API copy is the single biggest lift to Meta's match quality, and
 * it identifies a browser rather than a person.
 */
function getFbp(): string | undefined {
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : undefined
}

function deviceClass() {
  const width = window.innerWidth
  return width < 768 ? "mobile" : width < 1024 ? "tablet" : "desktop"
}

function initializeMetaPixel() {
  if (metaPixelInitialized || !META_PIXEL_ID) return

  if (!window.fbq) {
    const fbq: MetaPixel = function (...args: unknown[]) {
      if (fbq.callMethod) fbq.callMethod(...args)
      else fbq.queue?.push(args)
    }
    window.fbq = fbq
    window._fbq = fbq
    fbq.push = fbq
    fbq.loaded = true
    fbq.version = "2.0"
    fbq.queue = []

    const script = document.createElement("script")
    script.async = true
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    const firstScript = document.getElementsByTagName("script")[0]
    firstScript?.parentNode?.insertBefore(script, firstScript)
  }

  window.fbq("init", META_PIXEL_ID)
  metaPixelInitialized = true
}

/**
 * Mirrors a subset of our own events onto the Meta pixel.
 *
 * Only the six events below are forwarded. Everything else we track — item
 * impressions, chat opens, cart removals — stays first-party: Meta cannot
 * optimise against them, and forwarding them as custom events buried the
 * signal that matters (browsing one menu category used to emit nine
 * `item_impression` custom events in a single view).
 *
 * `eventId` is passed as Meta's `eventID` so a matching Conversions API call
 * from the server is de-duplicated against this browser event.
 *
 * A note on `value`, since the two differ deliberately: InitiateCheckout
 * reports merchandise subtotal, Purchase reports what the customer actually
 * paid (delivery included), because that is the revenue ROAS should be
 * measured against.
 */
function trackMetaPixelEvent(
  eventName: string,
  properties: EventProperties = {},
  eventId?: string,
) {
  if (!window.fbq) return

  const meta = eventId ? { eventID: eventId } : undefined
  const send = (name: string, params?: Record<string, unknown>) => {
    if (meta) window.fbq!("track", name, params, meta)
    else window.fbq!("track", name, params)
  }

  switch (eventName) {
    case "page_viewed":
      send("PageView")
      return

    case "category_viewed":
      send("ViewContent", {
        content_type: "product_group",
        content_category: properties.categoryId,
      })
      return

    case "search_performed":
      send("Search", {
        search_string: properties.query,
        content_category: properties.categoryId,
      })
      return

    case "item_added_to_cart": {
      const id = properties.itemId ? String(properties.itemId) : undefined
      const price = properties.displayedPrice
      const qty = typeof properties.quantity === "number" ? properties.quantity : 1
      send("AddToCart", {
        content_type: "product",
        content_ids: id ? [id] : undefined,
        content_name: properties.name,
        contents: id ? [{ id, quantity: qty, item_price: price }] : undefined,
        currency: "PKR",
        value: typeof price === "number" ? price * qty : price,
      })
      return
    }

    case "checkout_started":
      send("InitiateCheckout", {
        currency: "PKR",
        num_items: properties.itemCount,
        value: properties.displayedTotal,
      })
      return

    case "checkout_step_completed":
      if (properties.step !== "ORDER_CONFIRMED") return
      send("Purchase", {
        currency: properties.currency || "PKR",
        value: properties.total,
      })
      return

    default:
      // Deliberately not forwarded. See the note above before adding to this list.
      return
  }
}

export function track(eventName: string, options: TrackOptions = {}) {
  const attribution = getAttribution()
  const returningVisitor = Boolean(localStorage.getItem(VISITOR_KEY))
  const visitorId = getVisitorId()
  const properties = {
    itemId: options.itemId,
    categoryId: options.categoryId,
    cartId: options.cartId,
    orderId: options.orderId,
    experimentId: options.experimentId,
    variantId: options.variantId,
    missionId: options.missionId,
    deviceClass: deviceClass(),
    returningVisitor,
    fbp: getFbp(),
    ...options.properties,
  }

  // One id, both destinations: the pixel sends it as eventID and the server
  // copy reuses it, so Meta counts a browser + Conversions API pair once.
  const eventId = crypto.randomUUID()
  trackMetaPixelEvent(eventName, properties, eventId)

  queue.push({
    eventId,
    eventName,
    visitorId,
    sessionId: getSessionId(),
    occurredAt: new Date().toISOString(),
    pagePath: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || undefined,
    ...attribution,
    itemId: options.itemId,
    categoryId: options.categoryId,
    cartId: options.cartId,
    orderId: options.orderId,
    experimentId: options.experimentId,
    variantId: options.variantId,
    missionId: options.missionId,
    properties,
    schemaVersion: 1,
    consentState: options.consentState || "unknown",
  })
  if (queue.length >= MAX_QUEUE) void flushEvents()
  else if (flushTimer === null) flushTimer = window.setTimeout(() => void flushEvents(), 2000)
}

export async function flushEvents() {
  if (flushTimer !== null) window.clearTimeout(flushTimer)
  flushTimer = null
  if (!queue.length) return
  const batch = queue.splice(0, MAX_QUEUE)
  try {
    const response = await fetch("/api/v1/events/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    })
    if (!response.ok && response.status >= 500) queue = batch.concat(queue).slice(0, 100)
  } catch {
    queue = batch.concat(queue).slice(0, 100)
  }
}

export function initializeAnalytics() {
  getVisitorId()
  getSessionId()
  getCartId()
  initializeMetaPixel()
  window.addEventListener("pagehide", () => void flushEvents())
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flushEvents()
  })
}
