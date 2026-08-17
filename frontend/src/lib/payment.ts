export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash on Delivery" },
  { value: "card", label: "Card on Delivery" },
  { value: "online_transfer", label: "Online Transfer" },
  { value: "pay_on_pickup", label: "Pay on Pickup" },
] as const;

export function paymentMethodLabel(method?: string) {
  return (
    PAYMENT_METHODS.find((option) => option.value === method)?.label ||
    "Payment on order"
  );
}
