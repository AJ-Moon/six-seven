export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash on Delivery" },
  { value: "card", label: "Card on Delivery" },
  { value: "online_transfer", label: "Online Transfer" },
] as const;

export function paymentMethodLabel(method?: string) {
  return (
    PAYMENT_METHODS.find((option) => option.value === method)?.label ||
    "Payment on order"
  );
}
