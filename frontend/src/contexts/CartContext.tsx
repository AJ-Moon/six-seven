import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react"
import { getCartId, getSessionId, getVisitorId, resetCartId, track } from "@/lib/analytics"
import type { SelectedCustomization } from "@/types/menu"

export interface CartItem {
  lineId: string
  menuItemId: number
  name: string
  price: number
  image: string
  quantity: number
  customizations?: SelectedCustomization[]
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity" | "lineId"> & { lineId?: string }, qty?: number) => void
  removeItem: (lineId: string) => void
  updateQty: (lineId: string, qty: number) => void
  clearCart: () => void
  total: number
  count: number
}

const CART_KEY = "flavor_hub_cart"

const CartContext = createContext<CartContextType | null>(null)

function buildLineId(menuItemId: number, customizations: SelectedCustomization[] = []) {
  const normalized = customizations
    .map((item) => ({
      groupId: item.groupId,
      optionId: item.optionId,
      quantity: item.quantity || 1,
    }))
    .sort((a, b) => `${a.groupId}:${a.optionId}`.localeCompare(`${b.groupId}:${b.optionId}`))
  return `${menuItemId}:${JSON.stringify(normalized)}`
}

function normalizeStoredItems(rows: CartItem[]) {
  return rows.map((item) => ({
    ...item,
    lineId: item.lineId || buildLineId(item.menuItemId, item.customizations || []),
    customizations: item.customizations || [],
  }))
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      return stored ? normalizeStoredItems(JSON.parse(stored)) : []
    } catch {
      return []
    }
  })

  const syncCart = useCallback((cartItems: CartItem[], cartId = getCartId()) => {
    const token = localStorage.getItem("auth_token")
    return fetch("/api/v1/carts/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        cartId,
        visitorId: getVisitorId(),
        sessionId: getSessionId(),
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          customizations: item.customizations || [],
        })),
      }),
    }).catch(() => undefined)
  }, [])

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
    if (!items.length) return
    const timer = window.setTimeout(() => {
      void syncCart(items)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [items, syncCart])

  const addItem = useCallback((item: Omit<CartItem, "quantity" | "lineId"> & { lineId?: string }, qty = 1) => {
    const lineId = item.lineId || buildLineId(item.menuItemId, item.customizations || [])
    track("item_added_to_cart", {
      itemId: item.menuItemId,
      cartId: getCartId(),
      // name feeds the pixel's content_name — without it Meta only ever sees a bare id
      properties: { quantity: qty, displayedPrice: item.price, name: item.name, lineId },
    })
    setItems((prev) => {
      const existing = prev.find((i) => i.lineId === lineId)
      if (existing) {
        return prev.map((i) =>
          i.lineId === lineId ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { ...item, lineId, customizations: item.customizations || [], quantity: qty }]
    })
  }, [])

  const removeItem = useCallback((lineId: string) => {
    const item = items.find((row) => row.lineId === lineId)
    track("item_removed_from_cart", { itemId: item?.menuItemId, cartId: getCartId(), properties: { lineId } })
    setItems((prev) => prev.filter((i) => i.lineId !== lineId))
  }, [items])

  const updateQty = useCallback((lineId: string, qty: number) => {
    const item = items.find((row) => row.lineId === lineId)
    track(qty <= 0 ? "item_removed_from_cart" : "cart_value_changed", {
      itemId: item?.menuItemId,
      cartId: getCartId(),
      properties: { quantity: qty, lineId },
    })
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.lineId !== lineId))
    } else {
      setItems((prev) =>
        prev.map((i) => (i.lineId === lineId ? { ...i, quantity: qty } : i))
      )
    }
  }, [items])

  const clearCart = useCallback(() => {
    const previousCartId = getCartId()
    setItems([])
    void syncCart([], previousCartId)
    resetCartId()
  }, [syncCart])

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQty, clearCart, total, count }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
